"""TO-DO: Write a description of what this XBlock is."""
import random
from django.core.exceptions import PermissionDenied

import pkg_resources

from xblock.core import XBlock
from xblock.exceptions import JsonHandlerError
from xblock.fields import Scope, String, List, Dict, Integer
from xblock.fragment import Fragment
from answer_pool import offer_answer, validate_seeded_answers, get_other_answers
import persistence as sas_api

STATUS_NEW = 0
STATUS_ANSWERED = 1
STATUS_REVISED = 2


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
    display_name = String(default="Peer Instruction Tool")

    #question_text = String(
     #   default="What is your question?", scope=Scope.content,
      #  help="Stored question text for the students",
   # )

    question_text = Dict(
    	default={'text': 'What is your question?', 'image_url': '', 'image_position': 'below', 'show_image_fields': 0}, scope=Scope.content,
    	help="Some help text here change this"
    )

    options = List(
        default=['Default Option 1', 'Default Option 2'], scope=Scope.content,
        help="Stored question options",
    )

    correct_answer = Integer(
        default=0, scope=Scope.content,
        help="The correct option for the question",
    )

    correct_rationale = String(
        default=None, scope=Scope.content,
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
                    'question_text': self.question_text,
                    'options': self.options,
                    'algo': self.algo,
                    'algos': {'simple': 'System will select one of each option to present to the students.',
                              'random': 'Completely random selection from the response pool.'},
                    'image_position_locations': {
                    	'above': 'Appears above question',
                    	'below': 'Appears below question'
                    },
                    'seeds': self.seeded_answers,
        })

        return frag

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        self.display_name = data['display_name']
        self.question_text = data['question_text']
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
        # frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js")
        # frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/nvd3/1.7.0/nv.d3.min.js")
        frag.add_javascript(self.resource_string("static/js/src/d3.js"))
        frag.add_javascript(self.resource_string("static/js/src/nv.d3.js"))
        frag.add_javascript(self.resource_string("static/js/src/angularjs-nvd3-directives.min.js"))

        js_vals = {
            'answer_original': answers.get_vote(0),
            'rationale_original': answers.get_rationale(0),
            'answer_revised': answers.get_vote(1),
            'rationale_revised': answers.get_rationale(1),
            'display_name': self.display_name,
            'question_text': self.question_text,
            'options': self.options,
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
        else:
            raise PermissionDenied

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
        if msg is None:
            return {'success': 'true'}
        else:
            raise JsonHandlerError(400, msg)

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
