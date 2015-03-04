"""TO-DO: Write a description of what this XBlock is."""
from django.core.exceptions import PermissionDenied

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, List
from xblock.fragment import Fragment
import persistence as sas_api

STATUS_NEW = 0
STATUS_ANSWERED = 1
STATUS_REVISED = 2


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
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    question_text = String(
        default="What is 1+1?", scope=Scope.content,
        help="Stored question text for the students",
    )

    options = List(
        default=['1', '2', '3'], scope=Scope.content,
        help="Stored question options",
    )

    correct_answer = String(
        default=None, scope=Scope.content,
        help="The correct option for the question",
    )

    stats = String(
        default={'original': {}, 'revised':{}}, scope=Scope.settings,
        help="Overall stats for the instructor",
    )

    def studio_view(self, context=None):
        """
        """
        html = self.resource_string("static/html/ubcpi_edit.html")
        frag = Fragment(html.format(self=self))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi_edit.js"))

        frag.initialize_js('PIEdit', {'correct_answer': self.correct_answer})

        return frag

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        self.question_text = data['question_text']
        self.options = data['options']
        self.correct_answer = data['correct_answer']

        return {'success': 'true'}

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the PeerInstructionXBlock, shown to students
        when viewing courses.
        """
        html = ""
        if (self.answer_original):
            html += self.resource_string(
                "static/html/revise_answer.html")
        html += self.resource_string("static/html/ubcpi.html")
        #html = html.format(self=self) # run templating engine

        frag = Fragment(html)
        frag.add_css(self.resource_string("static/css/ubcpi.css"))
        #frag.add_javascript(self.resource_string("static/angular.js"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi.js"))
        frag.add_javascript_url("http://ajax.googleapis.com/ajax/libs/angularjs/1.3.13/angular.js")

        # Pass the answer to out Javascript
        frag.initialize_js('PeerInstructionXBlock', {
            'answer_original': self.answer_original,
            'rationale_original': self.rationale_original,
            'answer_revised': self.answer_revised,
            'rationale_revised': self.rationale_revised,
            'question_text': self.question_text,
            'options': self.options,
            'views': {
                'question': self.runtime.local_resource_url(self, 'public/html/question.html'),
            },
        })

        return frag

    def record_response(self, answer, rationale, status):
        if self.answer_original is None and status == STATUS_NEW:
            sas_api.save_original_answer(self.get_student_item_dict(), answer, rationale)
            num_resp = self.stats['original'].setdefault(answer, 0)
            self.stats['original'][answer] = num_resp + 1
        elif self.answer_revised is None and status == STATUS_ANSWERED:
            sas_api.save_revised_answer(self.get_student_item_dict(), answer, rationale)
            num_resp = self.stats['revised'].setdefault(answer, 0)
            self.stats['revised'][answer] = num_resp + 1
        else:
            raise PermissionDenied

    @XBlock.json_handler
    def get_other_answers(self, data, suffix=''):
        return {"answers": [{"answer": "A"}, {"answer": "B"}, {"answer": "C"}]}

    @XBlock.json_handler
    def get_stats(self, data, suffix=''):
        return self.stats

    @XBlock.json_handler
    def submit_answer(self, data, suffix=''):
        self.record_response(data['q'], data['rationale'], data['status'])
        return {
            "answer_original": self.answer_original,
            "rationale_original": self.rationale_original,
            "answer_revised": self.answer_revised,
            "rationale_revised": self.rationale_revised,
        }

    @property
    def answer_original(self):
        return sas_api.get_original_answer(self.get_student_item_dict())

    @property
    def rationale_original(self):
        return sas_api.get_original_rationale(self.get_student_item_dict())

    @property
    def answer_revised(self):
        return sas_api.get_revised_answer(self.get_student_item_dict())

    @property
    def rationale_revised(self):
        return sas_api.get_revised_rationale(self.get_student_item_dict())

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
