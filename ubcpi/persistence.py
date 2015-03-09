from submissions import api as submissions


class StudentAnswersSubmissionAPI:
    ORIGINAL = 'original'
    REVISED = 'revised'
    ANSWER = 'answer'
    RATIONALE = 'rationale'

    def __init__(self, xblock_id, course_id):
        self.xblock_id = xblock_id
        self.course_id = course_id

    def save_answer(self, student_id, answers):
        """
        answers has to be in the format:
        {
            'original': {
                'answer': 'some option',
                'rationale': 'some rationale'
            },
            'revised': {
                'answer': 'some option',
                'rationale': 'some rationale'
            }
        }
        """
        student_item = self._create_student_item(student_id)
        submissions.create_submission(student_item, answers)

    def get_answer(self, student_id):
        student_item = self._create_student_item(student_id)
        answers = submissions.get_submissions(student_item)
        return answers[0]  # newest saved answer

    def _create_student_item(self, student_id):
        return dict(
            student_id=student_id,
            item_id=self.xblock_id,
            course_id=self.course_id,
            item_type="ubcpi"
        )

