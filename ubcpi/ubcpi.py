"""A Peer Instruction tool for edX by the University of British Columbia."""
import os
import random
from copy import deepcopy
import uuid

from django.core.exceptions import PermissionDenied
from django.conf import settings
from django.utils import translation
import pkg_resources
from webob import Response
from xblock.core import XBlock
from xblock.exceptions import JsonHandlerError
from xblock.fields import Scope, String, List, Dict, Integer, DateTime, Float
from xblock.fragment import Fragment
from xblockutils.publish_event import PublishEventMixin
from .utils import _  # pylint: disable=unused-import

from answer_pool import offer_answer, validate_seeded_answers, get_other_answers
import persistence as sas_api
from serialize import parse_from_xml, serialize_to_xml

STATUS_NEW = 0
STATUS_ANSWERED = 1
STATUS_REVISED = 2

# this is a limitation in the database submissions_submission.raw_answer field, which is a TEXT and has limit
# of 64k in size. Because we are storing rationale and revised rationale both in the the field, the max size
# for the rationale is half
MAX_RATIONALE_SIZE = 32000
MAX_RATIONALE_SIZE_IN_EVENT = settings.TRACK_MAX_EVENT / 4

def truncate_rationale(rationale, max_length=MAX_RATIONALE_SIZE_IN_EVENT):
    """
    Truncates the rationale for analytics event emission if necessary

    Args:
        rationale (string): the string value of the rationale
        max_length (int): the max length for truncation

    Returns:
        truncated_value (string): the possibly truncated version of the rationale
        was_truncated (bool): returns true if the rationale is truncated

    """
    if isinstance(rationale, basestring) and max_length is not None and len(rationale) > max_length:
        return rationale[0:max_length], True
    else:
        return rationale, False


def validate_options(options):
    """
    Validate the options that course author set up and return errors in a dict if there is any
    """
    errors = []

    if int(options['rationale_size']['min']) < 1:
        errors.append(_('Minimum Characters'))
    if int(options['rationale_size']['max']) < 0 or int(options['rationale_size']['max']) > MAX_RATIONALE_SIZE:
        errors.append(_('Maximum Characters'))
    if not any(error in [_('Minimum Characters'), _('Maximum Characters')] for error in errors) \
            and int(options['rationale_size']['max']) <= int(options['rationale_size']['min']):
        errors += [_('Minimum Characters'), _('Maximum Characters')]
    try:
        if options['algo']['num_responses'] != '#' and int(options['algo']['num_responses']) < 0:
            errors.append(_('Number of Responses'))
    except ValueError:
        errors.append(_('Not an Integer'))

    if not errors:
        return None
    else:
        return {'options_error': _('Invalid Option(s): ') + ', '.join(errors)}


# noinspection all
class MissingDataFetcherMixin:
    """
    The mixin used for generating student item dict for submission API

    Copied from https://github.com/edx/edx-ora2/blob/master/openassessment/xblock/openassessmentblock.py
    """
    def get_course_id(self):
        return self._serialize_opaque_key(self.xmodule_runtime.course_id)

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
            course_id = self.get_course_id()  # pylint:disable=E1101

            if anonymous_user_id:
                student_id = anonymous_user_id
            else:
                student_id = self.xmodule_runtime.anonymous_student_id  # pylint:disable=E1101
        else:
            course_id = "edX/Enchantment_101/April_1"
            if self.scope_ids.user_id is None:
                student_id = ''
            else:
                student_id = unicode(self.scope_ids.user_id)

        student_item_dict = dict(
            student_id=student_id,
            item_id=item_id,
            course_id=course_id,
            item_type='ubcpi'
        )
        return student_item_dict

    def get_user_role(self):
        """Create a student_item_dict from our surrounding context.

        See also: submissions.api for details.

        Args:
            anonymous_user_id(str): A unique anonymous_user_id for (user, course) pair.
        Returns:
            (dict): The student item associated with this XBlock instance. This
                includes the student id, item id, and course id.
        """

        # This is not the real way course_ids should work, but this is a
        # temporary expediency for LMS integration
        if hasattr(self, "xmodule_runtime"):
            return self.xmodule_runtime.get_user_role()
        else:
            return 'student'

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
@XBlock.needs('i18n')
class PeerInstructionXBlock(XBlock, MissingDataFetcherMixin, PublishEventMixin):
    """
    Peer Instruction XBlock

    Notes:
    storing index vs option text: when storing index, it is immune to the
    option text changes. But when the order changes, the results will be
    skewed. When storing option text, it is impossible (at least for now) to
    update the existing students responses when option text changed.

    a warning may be shown to the instructor that they may only do the minor
    changes to the question options and may not change the order of the options,
    add or delete options
    """

    event_namespace = 'ubc.peer_instruction'

    # the display name that used on the interface
    display_name = String(default=_("Peer Instruction Question"))

    question_text = Dict(
        default={'text': _('<p>Where does most of the mass in a fully grown tree originate?</p>'),
                 'image_url': '', 'image_position': 'below', 'image_show_fields': 0, 'image_alt': ''},
        scope=Scope.content,
        help=_("The question the students see. This question appears above the possible answers which you set below. "
             "You can use text, an image or a combination of both. If you wish to add an image to your question, press "
             "the 'Add Image' button.")
    )

    options = List(
        default=[
            {'text': _('Air'), 'image_url': '', 'image_position': 'below', 'image_show_fields': 0, 'image_alt': ''},
            {'text': _('Soil'), 'image_url': '', 'image_position': 'below', 'image_show_fields': 0, 'image_alt': ''},
            {'text': _('Water'), 'image_url': '', 'image_position': 'below', 'image_show_fields': 0, 'image_alt': ''}
        ],
        scope=Scope.content,
        help=_("The possible options from which the student may select"),
    )

    rationale_size = Dict(
        default={'min': 1, 'max': MAX_RATIONALE_SIZE}, scope=Scope.content,
        help=_("The minimum and maximum number of characters a student is allowed for their rationale."),
    )

    correct_answer = Integer(
        default=0, scope=Scope.content,
        help=_("The correct option for the question"),
    )

    correct_rationale = Dict(
        default={'text': _("Photosynthesis")}, scope=Scope.content,
        help=_("The feedback for student for the correct answer"),
    )

    stats = Dict(
        default={'original': {}, 'revised': {}}, scope=Scope.user_state_summary,
        help=_("Overall stats for the instructor"),
    )
    seeds = List(
        default=[
            {'answer': 0, 'rationale': _('Tree gets carbon from air.')},
            {'answer': 1, 'rationale': _('Tree gets minerals from soil.')},
            {'answer': 2, 'rationale': _('Tree drinks water.')}
        ],
        scope=Scope.content,
        help=_("Instructor configured examples to give to students during the revise stage."),
    )

    # sys_selected_answers dict format:
    # {
    #     option1_index: {
    #         'student_id1': { can store algorithm specific info here },
    #         'student_id2': { can store algorithm specific info here },
    #         ...
    #     }
    #     option2_index: ...
    # }
    sys_selected_answers = Dict(
        default={}, scope=Scope.user_state_summary,
        help=_("System selected answers to give to students during the revise stage."),
    )

    other_answers_shown = Dict(
        default={}, scope=Scope.user_state,
        help=_("Stores the specific answers of other students shown, for a given student."),
    )

    algo = Dict(
        default={'name': 'simple', 'num_responses': '#'}, scope=Scope.content,
        help=_("The algorithm for selecting which answers to be presented to students"),
    )

    # Declare that we are not part of the grading System. Disabled for now as for the concern about the loading
    # speed of the progress page.
    has_score = True

    start = DateTime(
        default=None, scope=Scope.settings,
        help=_("ISO-8601 formatted string representing the start date of this assignment. We ignore this.")
    )

    due = DateTime(
        default=None, scope=Scope.settings,
        help=_("ISO-8601 formatted string representing the due date of this assignment. We ignore this.")
    )

    # required field for LMS progress page
    weight = Float(
        default=1,
        display_name=_("Problem Weight"),
        help=_(("Defines the number of points each problem is worth. "
              "If the value is not set, the problem is worth the sum of the "
              "option point values.")),
        values={"min": 0, "step": .1},
        scope=Scope.settings
    )

    def has_dynamic_children(self):
        """
        Do we dynamically determine our children? No, we don't have any.
        """
        return False

    def max_score(self):
        """
        The maximum raw score of our problem.
        """
        return 1

    def studio_view(self, context=None):
        """
        view function for studio edit
        """
        html = self.resource_string("static/html/ubcpi_edit.html")
        frag = Fragment(html)
        frag.add_javascript(self.resource_string("static/js/src/ubcpi_edit.js"))

        frag.initialize_js('PIEdit', {
            'display_name': self.ugettext(self.display_name),
            'weight': self.weight,
            'correct_answer': self.correct_answer,
            'correct_rationale': self.correct_rationale,
            'rationale_size': self.rationale_size,
            'question_text': self.question_text,
            'options': self.options,
            'algo': self.algo,
            'algos': {
                'simple': self.ugettext('System will select one of each option to present to the students.'),
                'random': self.ugettext('Completely random selection from the response pool.')
            },
            'image_position_locations': {
                'above': self.ugettext('Appears above'),
                'below': self.ugettext('Appears below')
            },
            'seeds': self.seeds,
            'lang': translation.get_language(),
        })

        return frag

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        """
        Submit handler for studio edit

        Args:
            data (dict): data submitted from the form
            suffix (str): not sure

        Returns:
            dict: result of the submission
        """
        self.display_name = data['display_name']
        self.weight = data['weight']
        self.question_text = data['question_text']
        self.rationale_size = data['rationale_size']
        self.options = data['options']
        self.correct_answer = data['correct_answer']
        self.correct_rationale = data['correct_rationale']
        self.algo = data['algo']
        self.seeds = data['seeds']

        return {'success': 'true'}

    @staticmethod
    def resource_string(path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    @XBlock.handler
    def get_asset(self, request, suffix=''):
        """
        Get static partial assets from this XBlock

        As there is no way to directly access the static assets within the XBlock, we use
        a handler to expose assets by name. Only html is needed for now.

        Args:
            request (Request): HTTP request
            suffix (str): not sure

        Returns:
            Response: HTTP response with the content of the asset
        """
        filename = request.params.get('f')
        return Response(self.resource_string('static/js/partials/' + filename), content_type='text/html')

    @classmethod
    def get_base_url_path_for_course_assets(cls, course_key):
        """
        Slightly modified version of StaticContent.get_base_url_path_for_course_assets.

        Code is copied as we don't want to introduce the dependency of edx-platform so that we can
        develop in workbench

        Args:
            course_key (str): CourseKey

        Returns:
            str: course asset base URL string
        """
        if course_key is None:
            return None

        # assert isinstance(course_key, CourseKey)
        placeholder_id = uuid.uuid4().hex
        # create a dummy asset location with a fake but unique name. strip off the name, and return it
        url_path = cls.serialize_asset_key_with_slash(
            course_key.make_asset_key('asset', placeholder_id).for_branch(None)
        )
        return url_path.replace(placeholder_id, '')

    @staticmethod
    def serialize_asset_key_with_slash(asset_key):
        """
        Legacy code expects the serialized asset key to start w/ a slash; so, do that in one place

        Args:
            asset_key (str): Asset key to generate URL
        """
        url = unicode(asset_key)
        if not url.startswith('/'):
            url = '/' + url
        return url

    def get_asset_url(self, static_url):
        """
        Returns the asset url for imported files (eg. images) that are uploaded in Files & Uploads

        Args:
            static_url(str): The static url for the file

        Returns:
            str: The URL for the file
        """
        # if static_url is not a "asset url", we will use it as it is
        if not static_url.startswith('/static/'):
            return static_url

        if hasattr(self, "xmodule_runtime"):
            file_name = os.path.split(static_url)[-1]
            return self.get_base_url_path_for_course_assets(self.course_id) + file_name
        else:
            return static_url

    @XBlock.supports('multi_device') # Mark as mobile-friendly
    def student_view(self, context=None):
        """
        The primary view of the PeerInstructionXBlock, shown to students when viewing courses.
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
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular.js")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular-messages.js")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular-sanitize.js")
        frag.add_javascript_url("//ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular-cookies.js")
        frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/angular-gettext/2.3.8/angular-gettext.min.js")
        frag.add_javascript_url("//cdnjs.cloudflare.com/ajax/libs/d3/3.3.13/d3.min.js")
        frag.add_javascript(self.resource_string("static/js/src/d3-pibar.js"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi.js"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi-answer-result-directive.js"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi-barchart-directive.js"))
        frag.add_javascript(self.resource_string("static/js/src/translations.js"))

        # convert image URLs
        question = deepcopy(self.question_text)
        question.update({'image_url': self.get_asset_url(question.get('image_url'))})

        options = deepcopy(self.options)
        for option in options:
            if option.get('image_url'):
                option.update({'image_url': self.get_asset_url(option.get('image_url'))})

        js_vals = {
            'answer_original': answers.get_vote(0),
            'rationale_original': answers.get_rationale(0),
            'answer_revised': answers.get_vote(1),
            'rationale_revised': answers.get_rationale(1),
            'display_name': self.ugettext(self.display_name),
            'question_text': question,
            'weight': self.weight,
            'options': options,
            'rationale_size': self.rationale_size,
            'user_role': self.get_user_role(),
            'all_status': {'NEW': STATUS_NEW, 'ANSWERED': STATUS_ANSWERED, 'REVISED': STATUS_REVISED},
            'lang': translation.get_language(),
        }
        if answers.has_revision(0) and not answers.has_revision(1):
            js_vals['other_answers'] = self.other_answers_shown

        # reveal the correct answer in the end
        if answers.has_revision(1):
            js_vals['correct_answer'] = self.correct_answer
            js_vals['correct_rationale'] = self.correct_rationale

        # Pass the answer to out Javascript
        frag.initialize_js('PeerInstructionXBlock', js_vals)

        self.publish_event_from_dict(self.event_namespace + '.accessed', {})

        return frag

    def record_response(self, answer, rationale, status):
        """
        Store response from student to the backend

        Args:
            answer (int): the option index that student responded
            rationale (str): the rationale text
            status (int): the progress status for this student. Possible values are:
                STATUS_NEW, STATUS_ANSWERED, STATUS_REVISED

        Raises:
            PermissionDenied: if we got an invalid status
        """
        answers = self.get_answers_for_student()
        stats = self.get_current_stats()
        truncated_rationale, was_truncated = truncate_rationale(rationale)
        corr_ans_text = ''
        if self.correct_answer == len(self.options):    # handle scenario with no correct answer
            corr_ans_text = 'n/a'
        else:
            corr_ans_text = self.options[self.correct_answer].get('text'),
        event_dict = {
            'answer': answer,
            'answer_text': self.options[answer].get('text'),
            'rationale': truncated_rationale,
            'correct_answer': self.correct_answer,
            'correct_answer_text': corr_ans_text,
            'correct_rationale': self.correct_rationale,
            'truncated': was_truncated
        }
        if not answers.has_revision(0) and status == STATUS_NEW:
            student_item = self.get_student_item_dict()
            sas_api.add_answer_for_student(student_item, answer, rationale)
            num_resp = stats['original'].setdefault(answer, 0)
            stats['original'][answer] = num_resp + 1
            offer_answer(
                self.sys_selected_answers, answer, rationale,
                student_item['student_id'], self.algo, self.options)
            self.other_answers_shown = get_other_answers(
                self.sys_selected_answers, self.seeds, self.get_student_item_dict, self.algo, self.options)
            event_dict['other_student_responses'] = self.other_answers_shown
            self.publish_event_from_dict(
                self.event_namespace + '.original_submitted',
                event_dict
            )
            return event_dict['other_student_responses']
        elif answers.has_revision(0) and not answers.has_revision(1) and status == STATUS_ANSWERED:
            sas_api.add_answer_for_student(self.get_student_item_dict(), answer, rationale)
            num_resp = stats['revised'].setdefault(answer, 0)
            stats['revised'][answer] = num_resp + 1

            # Fetch the grade
            grade = self.get_grade()

            # Send the grade
            self.runtime.publish(self, 'grade', {'value': grade, 'max_value': 1})

            self.publish_event_from_dict(
                    self.event_namespace + '.revised_submitted',
                    event_dict
            )
        else:
            raise PermissionDenied

    def get_grade(self):
        """
        Return the grade

        Only returns 1 for now as a completion grade.
        """
        return 1

    def get_current_stats(self):
        """
        Get the progress status for current user. This function also converts option index into integers
        """
        # convert key into integers as json.dump and json.load convert integer dictionary key into string
        self.stats = {
            'original': {int(k): v for k, v in self.stats['original'].iteritems()},
            'revised': {int(k): v for k, v in self.stats['revised'].iteritems()}
        }
        return self.stats

    @XBlock.json_handler
    def get_stats(self, data, suffix=''):
        """
        Get the progress status for current user

        Args:
            data (dict): no input required
            suffix (str): not sure

        Return:
            dict: current progress status
        """
        return self.get_current_stats()

    @XBlock.json_handler
    def submit_answer(self, data, suffix=''):
        """
        Answer submission handler to process the student answers
        """
        # convert key into integers as json.dump and json.load convert integer dictionary key into string
        self.sys_selected_answers = {int(k): v for k, v in self.sys_selected_answers.items()}        

        return self.get_persisted_data(self.record_response(data['q'], data['rationale'], data['status']))

    def get_persisted_data(self, other_answers):
        """
        Formats a usable dict based on what data the user has persisted
        Adds the other answers and correct answer/rationale when needed
        """
        answers = self.get_answers_for_student()
        ret = {
            "answer_original": answers.get_vote(0),
            "rationale_original": answers.get_rationale(0),
            "answer_revised": answers.get_vote(1),
            "rationale_revised": answers.get_rationale(1),
        }
        if answers.has_revision(0) and not answers.has_revision(1):
            # If no persisted peer answers, generate new ones.
            # Could happen if a student completed Step 1 before ubcpi upgraded to persist peer answers.
            if not self.other_answers_shown:
                ret['other_answers'] = get_other_answers(
                    self.sys_selected_answers, self.seeds, self.get_student_item_dict, self.algo, self.options)
            else:
                ret['other_answers'] = other_answers

        # reveal the correct answer in the end
        if answers.has_revision(1):
            ret['correct_answer'] = self.correct_answer
            ret['correct_rationale'] = self.correct_rationale

        return ret

    @XBlock.json_handler
    def get_data(self,data,suffix=''):
        """
        Retrieve persisted date from backend for current user
        """
        return self.get_persisted_data(self.other_answers_shown)

    def get_answers_for_student(self):
        """
        Retrieve answers from backend for current user
        """
        return sas_api.get_answers_for_student(self.get_student_item_dict())

    @XBlock.json_handler
    def validate_form(self, data, suffix=''):
        """
        Validate edit form from studio.

        This will check if all the parameters set up for peer instruction question satisfy all the constrains defined
        by the algorithm. E.g. we need at least one seed for each option for simple algorithm.

        Args:
            data (dict): form data
            suffix (str): not sure

        Returns:
            dict: {success: true} if there is no problem

        Raises:
            JsonHandlerError: with 400 error code, if there is any problem. This is necessary for angular async form
                validation to be able to tell if the async validation success or failed
        """
        msg = validate_seeded_answers(data['seeds'], data['options'], data['algo'])
        options_msg = validate_options(data)
        if msg is None and options_msg is None:
            return {'success': 'true'}
        else:
            msg = msg if msg else {}
            options_msg = options_msg if options_msg else {}
            msg.update(options_msg)
            raise JsonHandlerError(400, msg)

    @classmethod
    def workbench_scenarios(cls):  # pragma: no cover
        """A canned scenario for display in the workbench."""
        return [
            (
                "UBC Peer Instruction: Basic",
                cls.resource_string('static/xml/basic_scenario.xml')
            ),
        ]

    @classmethod
    def parse_xml(cls, node, runtime, keys, id_generator):
        """
        Instantiate XBlock object from runtime XML definition.

        Inherited from XBlock core.
        """
        config = parse_from_xml(node)
        block = runtime.construct_xblock_from_class(cls, keys)

        # TODO: more validation

        for key, value in config.iteritems():
            setattr(block, key, value)

        return block

    def add_xml_to_node(self, node):
        """
        Serialize the XBlock to XML for exporting.
        """
        serialize_to_xml(node, self)
