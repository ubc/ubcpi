"""TO-DO: Write a description of what this XBlock is."""
from django.core.exceptions import PermissionDenied

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, List
from xblock.fragment import Fragment

STATUS_NEW = 0
STATUS_ANSWERED = 1
STATUS_REVISED = 2

def reify(meth):
    """
    Property which caches value so it is only computed once.
    """
    def getter(inst):
        value = meth(inst)
        inst.__dict__[meth.__name__] = value
        return value
    return property(getter)

@XBlock.needs('user')
class PeerInstructionXBlock(XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    answer_original = String(
        default=None, scope=Scope.user_state,
        help="Store the first answer that the user gave."
    )

    answer_revised = String(
        default=None, scope=Scope.user_state,
        help="Store the revised answer given after user sees other users' answers.",
    )

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

        print '-------------------------------------------------'
        print self.scope_ids
        print self.block_id
        print self.runtime.service(self, 'user').get_current_user().opt_attrs['edx-platform.user_id']
        print self.runtime.service(self, 'user').get_current_user().opt_attrs['edx-platform.username']
        print self.runtime.service(self, 'user').get_current_user().full_name
        #print self.runtime.service(self, 'user').get_current_user().username
        print '-------------------------------------------------'
        # Pass the answer to out Javascript
        frag.initialize_js('PeerInstructionXBlock', {
            'answer_original': self.answer_original,
            'answer_revised': self.answer_revised,
            'question_text': self.question_text,
            'options': self.options,
            'views': {
                'question': self.runtime.local_resource_url(self, 'public/html/question.html'),
            },
        })

        return frag

    def record_response( self, response, status ) :
        """
        Placeholder for data persistence layer. Currently set the answer property of the object to what is clicked in the form
        """
        if self.answer_original is None and status == STATUS_NEW:
            self.answer_original = response
            num_resp = self.stats['original'].setdefault(response, 0)
            self.stats['original'][response] = num_resp + 1
        elif self.answer_revised is None and status == STATUS_ANSWERED:
            self.answer_revised = response
            num_resp = self.stats['revised'].setdefault(response, 0)
            self.stats['revised'][response] = num_resp + 1
        else:
            raise PermissionDenied

    @XBlock.json_handler
    def get_other_answers(self, data, suffix=''):
        return {"answers": [{"answer": "A"}, {"answer": "B"}, {"answer": "C"}]}

    @XBlock.json_handler
    def get_stats(self, data, suffix=''):
        return self.stats

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.
    @XBlock.json_handler
    def submit_answer(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        # Just to show data coming in...
        self.record_response( data['q'], data['status'] )
        return {"answer_original": self.answer_original,
                "answer_revised": self.answer_revised}

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

    @reify
    def block_id(self):
        return self.scope_ids.usage_id

    def _get_current_user_id(self):
        '''
        Use the user service to retrieve the current logged in user's id
        '''
        # self.runtime.service(self, 'user').get_current_user().opt_attrs['edx-platform.username']
        # self.runtime.service(self, 'user').get_current_user().full_name
        return self.runtime.service(self, 'user').get_current_user().opt_attrs['edx-platform.user_id']
