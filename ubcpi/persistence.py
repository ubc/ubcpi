from submissions import api as submissions

"""
answer_item has to be in the format:
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

ORIGINAL = 'original'
REVISED = 'revised'
ANSWER = 'answer'
RATIONALE = 'rationale'


def get_answer_item(student_item):
    student_submissions = submissions.get_submissions(student_item)
    if not student_submissions:
        return {
            ORIGINAL: None,
            REVISED: None,
        }
    latest_submission = student_submissions[0]
    latest_answer_item = latest_submission['answer']
    return latest_answer_item


def get_original_answer(student_item):
    answer_item = get_answer_item(student_item)
    if ORIGINAL in answer_item:
        return answer_item[ORIGINAL]
    else:
        return None


def get_revised_answer(student_item):
    answer_item = get_answer_item(student_item)
    if REVISED in answer_item:
        return answer_item[REVISED]
    else:
        return None


def save_original_answer(student_item, original_answer):
    submissions.create_submission(student_item, {
        ORIGINAL: original_answer,
    })


def save_revised_answer(student_item, revised_answer):
    original_answer = get_original_answer(student_item)
    submissions.create_submission(student_item, {
        ORIGINAL: original_answer,
        REVISED: revised_answer,
    })
