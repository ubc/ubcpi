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


def validate_seeded_answers_simple(answers, options):
    """
    This validator checks if the answers includes all possible options
    :param answers: the answers to be checked
    :param options: all options that should exist in the answers
    :return: None if everything is good. Otherwise, the missing option error message.
    """
    seen_options = {}
    for answer in answers:
        if answer:
            seen_options.setdefault(answer['answer'], 0)
            seen_options[answer['answer']] += 1

    missing_options = []
    for option in options:
        if seen_options.get(option, 0) == 0:
            missing_options.append(option)

    if missing_options:
        return {'seed_error': 'Missing option(s) ' + ', '.join(missing_options)}

    return None


def validate_seeded_answers(answers, options, algo):
    """

    :param answers: list of dict that contain seeded answers
    :param algo:
    :return: none if successful, otherwise error message
    """
    if algo == 'simple':
        return validate_seeded_answers_simple(answers, options)
    else:
        raise UnknownChooseAnswerAlgorithm()