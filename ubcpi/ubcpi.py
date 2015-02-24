"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer, String, List
from xblock.fragment import Fragment


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

    def studio_view(self, context=None):
        """
        """
        # self.options = ['Option1', 'Option2', 'Option3']
        html = self.resource_string("static/html/ubcpi_edit.html")
        frag = Fragment(html.format(self=self))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi_edit.js"))

        frag.initialize_js('PIEdit', {'question_text': self.question_text})

        return frag

    @XBlock.json_handler
    def studio_submit(self, data, suffix=''):
        self.question_text = data['question_text']
        self.options = data['options']

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
        html = html.format(self=self)  # run templating engine

        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("static/css/ubcpi.css"))
        frag.add_javascript(self.resource_string("static/js/src/ubcpi.js"))

        # Pass the answer to out Javascript
        frag.initialize_js('PeerInstructionXBlock', {'answer': self.answer_original})

        return frag

    def record_response( self, response ) :
        """
        Placeholder for data persistence layer. Currently set the answer property of the object to what is clicked in the form
        """
        self.answer_original = response

    @XBlock.json_handler
    def get_other_answers(self, data, suffix=''):
        return {"answers": [{"answer": "A"}, {"answer": "B"}, {"answer": "C"}]}

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.
    @XBlock.json_handler
    def submit_answer(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        # Just to show data coming in...
        self.record_response( data['q'] )
        return {"text": "You said " + data['q']}

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
