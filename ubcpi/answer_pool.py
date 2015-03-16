import random

class UnknownChooseAnswerAlgorithm(Exception):
    pass

def offer_answer(pool, answer, rationale, student_id, algo):
    '''
    Answers format:
    {
        'option1': {
            'student_id': { can store algorithm specific info here },
            ...
        }
        'option2': ...
    }
    '''
    if algo == 'simple':
        offer_simple(pool, answer, rationale, student_id)
    else:
        raise UnknownChooseAnswerAlgorithm()


def offer_simple(pool, answer, rationale, student_id):
    existing = pool.setdefault(answer, {})
    if len(existing) >= 50:
        student_id_to_remove = random.choice(existing.keys())
        del existing[student_id_to_remove]
    existing[student_id] = {}
    pool[answer] = existing
