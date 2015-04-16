import random
import persistence as sas_api


class UnknownChooseAnswerAlgorithm(Exception):
    pass


def offer_answer(pool, answer, rationale, student_id, algo):
    """
    Answers format:
    {
        option1_index: {
            'student_id': { can store algorithm specific info here },
            ...
        }
        option2_index: ...
    }
    """
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
            seen_options.setdefault(options[answer['answer']], 0)
            seen_options[options[answer['answer']]] += 1

    missing_options = []
    for option in options:
        if seen_options.get(option, 0) == 0:
            missing_options.append(option)

    if missing_options:
        return {'seed_error': 'Missing option seed(s): ' + ', '.join(missing_options)}

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


def get_other_answers(answers, seeded_answers, get_student_item_dict, algo):
    if algo == 'simple':
        return get_other_answers_simple(answers, seeded_answers, get_student_item_dict)
    else:
        raise UnknownChooseAnswerAlgorithm()


def get_other_answers_simple(answers, seeded_answers, get_student_item_dict):
    ret = []
    pool = convert_seeded_answers(seeded_answers)
    # merge the dictionaries in the answer dictionary
    for key in answers:
        if key in pool:
            pool[key].update(answers[key].items())
        else:
            pool[key] = answers[key]
    student_id = get_student_item_dict()['student_id']
    for option, students in pool.items():
        student = student_id
        i = 0
        while student == student_id or i > 100:
            # retry until we got a different one or after 100 retries
            # we are suppose to get a different student answer or a seeded one in a few tries
            # as we have at least one seeded answer for each option in the algo. And it is not
            # suppose to overflow i order to break the loop
            student = random.choice(students.keys())
            i += 1
        if student.startswith('seeded'):
            # seeded answer, get the rationale from local
            rationale = students[student]
        else:
            student_item = get_student_item_dict(student)
            submission = sas_api.get_answers_for_student(student_item)
            rationale = submission.get_rationale(0)
        ret.append({'option': option, 'rationale': rationale})

    return {"answers": ret}


def convert_seeded_answers(answers):
    """
    convert seeded answers into the format that can be merged into student answers
    :param answers: seeded answers
    :return: seeded answers with student answers format
    """
    converted = {}
    for index, answer in enumerate(answers):
        converted.setdefault(answer['answer'], {})
        converted[answer['answer']]['seeded' + str(index)] = answer['rationale']

    return converted
