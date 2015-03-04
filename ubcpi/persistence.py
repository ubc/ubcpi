from submissions import api as sub_api

"""
answer_item has to be in the format:
{
    'answers': [
        {
            'vote': 'some option',
            'rationale': 'some rationale'
        },
        {
            'vote': 'some option',
            'rationale': 'some rationale'
        }
    ]
}
"""

ANSWER_LIST_KEY = 'answers'

VOTE_KEY = 'vote'
RATIONALE_KEY = 'rationale'


def get_answers_for_student(student_item):
    submissions = sub_api.get_submissions(student_item)
    if not submissions:
        return Answers()

    latest_submission = submissions[0]
    latest_answer_item = latest_submission.get('answer', {})
    return Answers(latest_answer_item.get(ANSWER_LIST_KEY, []))


def add_answer_for_student(student_item, vote, rationale):
    answers = get_answers_for_student(student_item)
    answers.add_answer(vote, rationale)

    sub_api.create_submission(student_item, {
        ANSWER_LIST_KEY: answers.get_answers_as_list()
    })


class Answers:

    def __init__(self, answers=None):
        if not answers:
            self.raw_answers = []
        else:
            self.raw_answers = answers

    def _safe_get(self, revision, key):
        if self.has_revision(revision):
            return self.raw_answers[revision].get(key)
        else:
            return None

    def has_revision(self, revision):
        return len(self.raw_answers) > revision

    def get_vote(self, revision):
        return self._safe_get(revision, VOTE_KEY)

    def get_rationale(self, revision):
        return self._safe_get(revision, RATIONALE_KEY)

    def add_answer(self, vote, rationale):
        self.raw_answers.append({
            VOTE_KEY: vote,
            RATIONALE_KEY: rationale,
        })

    def get_answers_as_list(self):
        return self.raw_answers
