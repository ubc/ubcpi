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
    if algo['name'] == 'simple':
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


def validate_seeded_answers_simple(answers, options, algo):
    """
    This validator checks if the answers includes all possible options
    :param answers: the answers to be checked
    :param options: all options that should exist in the answers
    :return: None if everything is good. Otherwise, the missing option error message.
    """
    seen_options = {}
    for answer in answers:
        if answer:
            seen_options.setdefault(options[answer['answer']].get('name'), 0)
            seen_options[options[answer['answer']].get('name')] += 1

    missing_options = []
    for option in options:
        if seen_options.get(option.get('name'), 0) == 0:
            missing_options.append(option.get('name'))

    if missing_options:
        return {'seed_error': 'Missing option seed(s): ' + ', '.join(missing_options)}

    return None


def validate_seeded_answers(answers, options, algo):
    """

    :param answers: list of dict that contain seeded answers
    :param algo:
    :return: none if successful, otherwise error message
    """
    if algo['name'] == 'simple':
        return validate_seeded_answers_simple(answers, options, algo)
    else:
        raise UnknownChooseAnswerAlgorithm()


def get_other_answers(answers, seeded_answers, get_student_item_dict, algo, options):
    # "#" means the number of responses returned should be the same as the number of options.
    num_responses = len(options) if algo['num_responses'] == "#" else int(algo['num_responses'])

    if algo['name'] == 'simple':
        return get_other_answers_simple(answers, seeded_answers, get_student_item_dict, num_responses)
    else:
        raise UnknownChooseAnswerAlgorithm()


def get_other_answers_simple(answers, seeded_answers, get_student_item_dict, num_responses):
    ret = []
    total_in_pool = len(seeded_answers)
    pool = convert_seeded_answers(seeded_answers)
    # merge the dictionaries in the answer dictionary
    for key in answers:
        total_in_pool += len(answers)
        if key in pool:
            pool[key].update(answers[key].items())
        else:
            pool[key] = answers[key]
    student_id = get_student_item_dict()['student_id']
    # if student_id has value, we assume the student just submitted an answer. So removing it
    # from total number in the pool
    if student_id:
        total_in_pool -= 1
    # remember which option+student_id is selected, so that we don't have duplicates in the result
    selected = []

    # loop until we have enough answers to return
    while len(ret) < min(num_responses, total_in_pool):
        for option, students in pool.items():
            student = student_id
            i = 0
            while (student == student_id or i > 100) and (str(option) + student) not in selected:
                # retry until we got a different one or after 100 retries
                # we are suppose to get a different student answer or a seeded one in a few tries
                # as we have at least one seeded answer for each option in the algo. And it is not
                # suppose to overflow i order to break the loop
                student = random.choice(students.keys())
                i += 1
            selected.append(str(option)+student)
            if student.startswith('seeded'):
                # seeded answer, get the rationale from local
                rationale = students[student]
            else:
                student_item = get_student_item_dict(student)
                submission = sas_api.get_answers_for_student(student_item)
                rationale = submission.get_rationale(0)
            ret.append({'option': option, 'rationale': rationale})

            # check if we have enough answers
            if len(ret) >= min(num_responses, total_in_pool):
                break

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
