"""A Peer Instruction tool for edX by the University of British Columbia."""
import random
from copy import deepcopy

from django.core.exceptions import PermissionDenied

import pkg_resources

from xblock.core import XBlock
from xblock.exceptions import JsonHandlerError
from xblock.fields import Scope, String, List, Dict, Integer, DateTime, Float
from xblock.fragment import Fragment
from answer_pool import offer_answer, validate_seeded_answers, get_other_answers
import persistence as sas_api

STATUS_NEW = 0
STATUS_ANSWERED = 1
STATUS_REVISED = 2

# this is a limitation in the database submissions_submission.raw_answer field, which is a TEXT and has limit
# of 64k in size. Because we are storing rationale and revised rationale both in the the field, the max size
# for the rationale is half
MAX_RATIONALE_SIZE = 32000


def load(path):
    """Handy helper for getting resources from our kit."""
    data = pkg_resources.resource_string(__name__, path)
    return data.decode("utf8")


# noinspection all
class MissingDataFetcherMixin:
    """ Copied from https://github.com/edx/edx-ora2/blob/master/openassessment/xblock/openassessmentblock.py """

    def __init__(self):
        pass

    def get_student_item_dict(self, anonymous_user_id=None):
        """Create a student_item_dict from our surrounding context.

        See also: submissions.api for details.

        Args:
            anonymous_user_id(str): A unique anonymous_user_id for (user, course) pair.
        Returns:
            (dict): The student item associated with this XBlock instance. This
                includes the student id, item id, and course id.
        """

        item_id = self._serialize_opaque_key(self.scope_ids.usage_id)

        # This is not the real way course_ids should work, but this is a
        # temporary expediency for LMS integration
        if hasattr(self, "xmodule_runtime"):
            course_id = self.course_id  # pylint:disable=E1101

            if anonymous_user_id:
                student_id = anonymous_user_id
            else:
                student_id = self.xmodule_runtime.anonymous_student_id  # pylint:disable=E1101
        else:
            course_id = "edX/Enchantment_101/April_1"
            if self.scope_ids.user_id is None:
                student_id = None
            else:
                student_id = unicode(self.scope_ids.user_id)

        student_item_dict = dict(
            student_id=student_id,
            item_id=item_id,
            course_id=course_id,
            item_type='ubcpi'
        )
        return student_item_dict

    def _serialize_opaque_key(self, key):
        """
        Gracefully handle opaque keys, both before and after the transition.
        https://github.com/edx/edx-platform/wiki/Opaque-Keys

        Currently uses `to_deprecated_string()` to ensure that new keys
        are backwards-compatible with keys we store in ORA2 database models.

        Args:
            key (unicode or OpaqueKey subclass): The key to serialize.

        Returns:
            unicode

        """
        if hasattr(key, 'to_deprecated_string'):
            return key.to_deprecated_string()
        else:
            return unicode(key)


@XBlock.needs('user')
class PeerInstructionXBlock(XBlock, MissingDataFetcherMixin):
    """
    Notes:
    storing index vs option text: when storing index, it is immune to the
    option text changes. But when the order changes, the results will be
    skewed. When storing option text, it is impossible (at least for now) to
    update the existing students responses when option text changed.

    a warning may be shown to the instructor that they may only do the minor
    changes to the question options and may not change the order of the options,
    add or delete options
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # the display name that used on the interface
    display_name = String(default="Peer Instruction")

    #question_text = String(
     #   default="What is your question?", scope=Scope.content,
      #  help="Stored question text for the students",
   # )

    question_text = Dict(
    	default={'text': 'What is the answer to life, the universe and everything?', 'image_url': '', 'image_position': 'below', 'show_image_fields': 0, 'image_alt': ''}, scope=Scope.content,
    	help="The question the students see. This question appears above the possible answers which you set below. You can use text, an image or a combination of both. If you wish to add an image to your question, press the 'Add Image' button."
    )

    options = List(
        # default=['Default Option 1', 'Default Option 2'], scope=Scope.content,
        default=[
            {'text': '21', 'image_url': '', 'image_position': 'below', 'show_image_fields': 0, 'image_alt': ''},
            {'text': '42', 'image_url': '', 'image_position': 'below', 'show_image_fields': 0, 'image_alt': ''},
            {'text': '63', 'image_url': '', 'image_position': 'below', 'show_image_fields': 0, 'image_alt': ''}
        ],
        scope=Scope.content,
        help="The possible options from which the student may select",
    )

    rationale_size = Dict(
        default={'min': 1, 'max': MAX_RATIONALE_SIZE}, scope=Scope.content,
        help="The minimum and maximum number of characters a student is allowed for their rationale.",
    )

    correct_answer = Integer(
        default=1, scope=Scope.content,
        help="The correct option for the question",
    )

    correct_rationale = Dict(
        default={'text': "In the radio series and the first novel, a group of hyper-intelligent pan-dimensional beings demand to learn the Answer to the Ultimate Question of Life, The Universe, and Everything from the supercomputer, Deep Thought, specially built for this purpose. It takes Deep Thought 7.5 million years to compute and check the answer, which turns out to be 42. Deep Thought points out that the answer seems meaningless because the beings who instructed it never actually knew what the Question was." }, scope=Scope.content,
        help="The feedback for student for the correct answer",
    )

    stats = Dict(
        default={'original': {}, 'revised': {}}, scope=Scope.user_state_summary,
        help="Overall stats for the instructor",
    )
    seeded_answers = List(
        default=[], scope=Scope.content,
        help="Instructor configured examples to give to students during the revise stage.",
    )

    sys_selected_answers = Dict(
        default={}, scope=Scope.user_state_summary,
        help="System selected answers to give to students during the revise stage.",
    )

    algo = Dict(
        default={'name': 'simple', 'num_responses': '#'}, scope=Scope.content,
        help="The algorithm for selecting which answers to be presented to students",
    )

    # Declare that we are part of the grading System
    has_score = True

    ## Everything below is stolen from https://github.com/edx/edx-ora2/blob/master/apps/openassessment/xblock/lms_mixin.py
    ## It's needed to keep the LMS+Studio happy.
    ## It should be included as a mixin.

    start = DateTime(
        default=None, scope=Scope.settings,
        help="ISO-8601 formatted string representing the start date of this assignment. We ignore this."
    )

    due = DateTime(
        default=None, scope=Scope.settings,
        help="ISO-8601 formatted string representing the due date of this assignment. We ignore this."
    )

    weight = Float(
        display_name="Problem Weight",
        help=("Defines the number of points each problem is worth. "
              "If the value is not set, the problem is worth the sum of the "
              "option point values."),
        values={"min": 0, "step": .1},
        scope=Scope.settings
    )

    def has_dynamic_children(self):
        """Do we dynamically determine our children? No, we don't have any.
        """
        return False

    def max_score(self):
        """The maximum raw score of our problem.
        """
        return 1

    def studio_view(self, context=None):
        """
        """
        html = self.resource_string("static/html/ubcpi_edit.html")
        frag = Fragment(html)
        frag.add_javascript(self.resource_string("static/js/src/ubcpi_edit.js"))

        frag.initialize_js('PIEdit', {
                    'display_name': self.display_name,
                    'correct_answer': self.correct_answer,
                    'correct_rationale': self.correct_rationale,
                    'rationale_size': self.rationale_size,
                    'question_text': self.question_text,
                    'options': self.options,
                    'algo': self.algo,
                    'algos': {'simple': 'System will select one of each option to present to the students.',
                              'random': 'Completely random selection from the response pool.'},
                    'image_position_locations': {
                    	'above': 'Appears above',
                    	'below': 'Appears below'
                    },
                    'seeds': self.seeded_answers,
                    'xblock_usage_id': self.scope_ids.usage_id,
        })

        return frag

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        self.display_name = data['display_name']
        self.question_text = data['question_text']
        self.rationale_size = data['rationale_size']
        self.options = data['options']
        self.correct_answer = data['correct_answer']
        self.correct_rationale = data['correct_rationale']
        self.algo = data['algo']
        self.seeded_answers = data['seeds']

        return {'success': 'true'}

    @staticmethod
    def resource_string(path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the PeerInstructionXBlock, shown to students
        when viewing courses.
        """
        # convert key into integers as json.dump and json.load convert integer dictionary key into string
        self.sys_selected_answers = {int(k): v for k, v in self.sys_selected_answers.items()}

        # generate a random seed for student
        student_item = self.get_student_item_dict()
        random.seed(student_item['student_id'])

        answers = self.get_answers_for_student()
        html = ""
        html += self.resource_string("static/html/ubcpi.html")

        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/ubcpi.css"))
        frag.add_css(self.resource_string("static/css/nv.d3.css"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi.js"))
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular.js")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular-messages.js")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular-sanitize.js")
        # frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js")
        # frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/nvd3/1.7.0/nv.d3.min.js")
        frag.add_javascript(self.resource_string("static/js/src/d3.js"))
        frag.add_javascript(self.resource_string("static/js/src/nv.d3.js"))
        frag.add_javascript(self.resource_string("static/js/src/angularjs-nvd3-directives.min.js"))

        options = deepcopy(self.options)
        for option in options:
            if option.get('image_url'):
                option.update({'image_url': self.static_asset_path + option.get('image_url')})

        js_vals = {
            'answer_original': answers.get_vote(0),
            'rationale_original': answers.get_rationale(0),
            'answer_revised': answers.get_vote(1),
            'rationale_revised': answers.get_rationale(1),
            'display_name': self.display_name,
            'question_text': self.question_text,
            'options': options,
            'rationale_size': self.rationale_size,
            'xblock_usage_id': str(self.scope_ids.usage_id),
        }
        if answers.has_revision(0):
            js_vals['other_answers'] = get_other_answers(
                self.sys_selected_answers, self.seeded_answers, self.get_student_item_dict, self.algo, self.options)

        # reveal the correct answer in the end
        if answers.has_revision(1):
            js_vals['correct_answer'] = self.correct_answer
            js_vals['correct_rationale'] = self.correct_rationale

        # Pass the answer to out Javascript
        frag.initialize_js('PeerInstructionXBlock', js_vals)

        return frag

    def record_response(self, answer, rationale, status):
        answers = self.get_answers_for_student()
        if not answers.has_revision(0) and status == STATUS_NEW:
            student_item = self.get_student_item_dict()
            sas_api.add_answer_for_student(student_item, answer, rationale)
            num_resp = self.stats['original'].setdefault(answer, 0)
            self.stats['original'][answer] = num_resp + 1
            offer_answer(self.sys_selected_answers, answer, rationale, student_item['student_id'], self.algo)
        elif not answers.has_revision(1) and status == STATUS_ANSWERED:
            sas_api.add_answer_for_student(self.get_student_item_dict(), answer, rationale)
            num_resp = self.stats['revised'].setdefault(answer, 0)
            self.stats['revised'][answer] = num_resp + 1

            # Fetch the grade
            grade = self.get_grade()

            # Send the grade
            self.runtime.publish( self, 'grade', {'value': grade, 'max_value': 1} )
        else:
            raise PermissionDenied

    # Abstracted method to allow us to have some flexibility
    # with the grade system.
    def get_grade(self):
        return 1


    @XBlock.json_handler
    def get_stats(self, data, suffix=''):
        return self.stats

    @XBlock.json_handler
    def submit_answer(self, data, suffix=''):
        # convert key into integers as json.dump and json.load convert integer dictionary key into string
        self.sys_selected_answers = {int(k): v for k, v in self.sys_selected_answers.items()}
        self.record_response(data['q'], data['rationale'], data['status'])
        answers = self.get_answers_for_student()
        ret = {
            "answer_original": answers.get_vote(0),
            "rationale_original": answers.get_rationale(0),
            "answer_revised": answers.get_vote(1),
            "rationale_revised": answers.get_rationale(1),
        }
        if answers.has_revision(0):
            ret['other_answers'] = get_other_answers(
                self.sys_selected_answers, self.seeded_answers, self.get_student_item_dict, self.algo, self.options)

        # reveal the correct answer in the end
        if answers.has_revision(1):
            ret['correct_answer'] = self.correct_answer
            ret['correct_rationale'] = self.correct_rationale

        return ret

    def get_answers_for_student(self):
        return sas_api.get_answers_for_student(self.get_student_item_dict())

    @XBlock.json_handler
    def validate_form(self, data, suffix=''):
        msg = validate_seeded_answers(data['seeds'], data['options'], data['algo'])
        options_msg = self.validate_options(data)
        if msg is None and options_msg is None:
            return {'success': 'true'}
        else:
            msg = msg if msg else {}
            options_msg = options_msg if options_msg else {}
            msg.update(options_msg)
            raise JsonHandlerError(400, msg)

    def validate_options(self, options):
        errors = []

        if int(options['rationale_size']['min']) < 0:
            errors.append('Minimum Characters')
        if int(options['rationale_size']['max']) < 0 or int(options['rationale_size']['max']) > MAX_RATIONALE_SIZE:
            errors.append('Maximum Characters')
        if not any(error in ['Minimum Characters', 'Maximum Characters'] for error in errors) \
                and int(options['rationale_size']['max']) <= int(options['rationale_size']['min']):
            errors += ['Minimum Characters', 'Maximum Characters']
        if options['algo']['num_responses'] != '#' and int(options['algo']['num_responses']) < 0:
            errors.append('Number of Responses')

        if not errors:
            return None
        else:
            return {'options_error': 'Invalid Option(s): ' + ', '.join(errors)}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("PeerInstructionXBlock",
             """<vertical_demo>
                <ubcpi/>
                <ubcpi/>
                <ubcpi/>
                </vertical_demo>
             """),
        ]
