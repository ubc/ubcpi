from __future__ import absolute_import
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
DELETE_INDICATOR = 'deleted'
REQUEST_USER_ID_KEY = 'requesting_user_id'

VOTE_KEY = 'vote'
RATIONALE_KEY = 'rationale'


def get_answers_for_student(student_item):
    """
    Retrieve answers from backend for a student and question

    Args:
        student_item (dict): The location of the problem this submission is
            associated with, as defined by a course, student, and item.

    Returns:
        Answers: answers for the student
    """
    submissions = sub_api.get_submissions(student_item)
    if not submissions:
        return Answers()

    latest_submission = submissions[0]
    latest_answer_item = latest_submission.get('answer', {})
    if latest_answer_item.get(DELETE_INDICATOR, False):
        return Answers()
    return Answers(latest_answer_item.get(ANSWER_LIST_KEY, []))


def add_answer_for_student(student_item, vote, rationale):
    """
    Add an answer for a student to the backend

    Args:
        student_item (dict): The location of the problem this submission is
            associated with, as defined by a course, student, and item.
        vote (int): the option that student voted for
        rationale (str): the reason why the student vote for the option
    """
    answers = get_answers_for_student(student_item)
    answers.add_answer(vote, rationale)

    sub_api.create_submission(student_item, {
        ANSWER_LIST_KEY: answers.get_answers_as_list()
    })

def delete_answer_for_student(student_item, requesting_user_id):
    """
    Create a new submission to indicate student's answer is deleted

    Args:
        student_item (dict): The location of the problem this submission is
            associated with, as defined by a course, student, and item.
        requesting_user_id: The user that is requesting to delete student answer
    """
    sub_api.create_submission(student_item, {
        DELETE_INDICATOR: True,
        REQUEST_USER_ID_KEY: requesting_user_id,
    })

class Answers:
    """
    The class that encapsulate the answers (original and revised) from a student

    The revision is used to identify the original (0) answer or revised (1) answer. It could be extended
    in the future if this xblock supports more than one round of revision.
    """

    def __init__(self, answers=None):
        if not answers:
            self.raw_answers = []
        else:
            self.raw_answers = answers

    def _safe_get(self, revision, key):
        """
        Get an answer data (vote or rationale) by revision

        Args:
            revision (int): the revision number for student answer, could be
                0 (original) or 1 (revised)
            key (str); key for retrieve answer data, could be VOTE_KEY or
                RATIONALE_KEY

        Returns:
            the answer data or None if revision doesn't exists
        """
        if self.has_revision(revision):
            return self.raw_answers[revision].get(key)
        else:
            return None

    def has_revision(self, revision):
        """
        Check if the answer has a revision

        Args:
            revision (int): the revision number for student answer, could be
                0 (original) or 1 (revised)

        Returns:
            bool: True if answer have the revision, False otherwise
        """
        return len(self.raw_answers) > revision

    def get_vote(self, revision):
        """
        Get the student voted option by revision

        Args:
            revision (int): the revision number for student answer, could be
                0 (original) or 1 (revised)

        Returns:
            int: The option index that student voted
        """
        return self._safe_get(revision, VOTE_KEY)

    def get_rationale(self, revision):
        """
        Get the student rationale by revision

        Args:
            revision (int): the revision number for student answer, could be
                0 (original) or 1 (revised)

        Returns:
            str: The rationale that why student voted for the option
        """
        return self._safe_get(revision, RATIONALE_KEY)

    def add_answer(self, vote, rationale):
        """
        Add an answer

        Args:
            vote (int): the option that student voted for
            rationale (str): the reason why the student vote for the option
        """
        self.raw_answers.append({
            VOTE_KEY: vote,
            RATIONALE_KEY: rationale,
        })

    def get_answers_as_list(self):
        """
        Return the answers as a list
        """
        return self.raw_answers
