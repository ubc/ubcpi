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
        return {}
    latest_submission = student_submissions[0]
    latest_answer_item = latest_submission['answer']
    return latest_answer_item


def get_answer_item_value(student_item, revision_key, value_key):
    answer_item = get_answer_item(student_item)
    revision = answer_item.get(revision_key, {})
    value = revision.get(value_key, None)
    return value


def get_original_answer(student_item):
    return get_answer_item_value(student_item, ORIGINAL, ANSWER)


def get_revised_answer(student_item):
    return get_answer_item_value(student_item, REVISED, ANSWER)


def get_original_rationale(student_item):
    return get_answer_item_value(student_item, ORIGINAL, RATIONALE)


def get_revised_rationale(cls, student_item):
    return get_answer_item_value(student_item, REVISED, RATIONALE)


def save_original_answer(student_item, original_answer, original_rationale):
    submissions.create_submission(student_item, {
        ORIGINAL: {
            ANSWER: original_answer,
            RATIONALE: original_rationale,
        },
    })


def save_revised_answer(student_item, revised_answer, revised_rationale):
    original_answer = get_original_answer(student_item)
    original_rationale = get_original_rationale(student_item)
    submissions.create_submission(student_item, {
        ORIGINAL: {
            ANSWER: original_answer,
            RATIONALE: original_rationale,
        },
        REVISED: {
            ANSWER: revised_answer,
            RATIONALE: revised_rationale,
        },
    })
