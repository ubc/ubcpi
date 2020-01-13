import random
import copy
import persistence as sas_api
from utils import _  # pylint: disable=unused-import

# min number of answers for each answers
# so that we don't end up no answers for an option
POOL_OPTION_MIN_SIZE = 5
# pool size in bytes, the whole pool will be stored in the block and retrieved each time the page loads
# so we want to keep the pool to a reasonable small size.
POOL_SIZE = 4096
# the length of item in bytes that stored in the pool, for simple and random algorithm, only student id (32 bytes)
# and an empty dict value stored (curly brackets and colon when jsonified). Assuming the length is the same for all
# items in the pool. For variable length item, specify the max length
POOL_ITEM_LENGTH_SIMPLE = POOL_ITEM_LENGTH_RANDOM = 35


class UnknownChooseAnswerAlgorithm(Exception):
    pass


def get_max_size(pool, num_option, item_length):
    """
    Calculate the max number of item that an option can stored in the pool at give time.

    This is to limit the pool size to POOL_SIZE

    Args:
        option_index (int): the index of the option to calculate the size for
        pool (dict): answer pool
        num_option (int): total number of options available for the question
        item_length (int): the length of the item

    Returns:
        int: the max number of items that `option_index` can have
    """
    max_items = POOL_SIZE / item_length
    # existing items plus the reserved for min size. If there is an option has 1 item, POOL_OPTION_MIN_SIZE - 1 space
    # is reserved.
    existing = POOL_OPTION_MIN_SIZE * num_option + sum([max(0, len(pool.get(i, {})) - 5) for i in xrange(num_option)])
    return int(max_items - existing)


def offer_answer(pool, answer, rationale, student_id, algo, options):
    """
    submit a student answer to the answer pool

    The answer maybe selected to stay in the pool depending on the selection algorithm

    Args:
        pool (dict): answer pool
            Answer pool format:
            {
                option1_index: {
                    'student_id': { can store algorithm specific info here },
                    ...
                }
                option2_index: ...
            }
        answer (int): the option student selected
        rationale (str): the rationale text
        student_id (str): student identifier
        algo (str): the selection algorithm
        options (dict): the options available in the question

    Raises:
        UnknownChooseAnswerAlgorithm: when we don't know the algorithm
    """
    if algo['name'] == 'simple':
        offer_simple(pool, answer, rationale, student_id, options)
    elif algo['name'] == 'random':
        offer_random(pool, answer, rationale, student_id, options)
    else:
        raise UnknownChooseAnswerAlgorithm()


def offer_simple(pool, answer, rationale, student_id, options):
    """
    The simple selection algorithm.

    This algorithm randomly select an answer from the pool to discard and add the new one when the pool reaches
    the limit
    """
    existing = pool.setdefault(answer, {})
    if len(existing) >= get_max_size(pool, len(options), POOL_ITEM_LENGTH_SIMPLE):
        student_id_to_remove = random.choice(existing.keys())
        del existing[student_id_to_remove]
    existing[student_id] = {}
    pool[answer] = existing


def offer_random(pool, answer, rationale, student_id, options):
    """
    The random selection algorithm. The same as simple algorithm
    """
    offer_simple(pool, answer, rationale, student_id, options)


def validate_seeded_answers_simple(answers, options, algo):
    """
    This validator checks if the answers includes all possible options

    Args:
        answers (str): the answers to be checked
        options (dict): all options that should exist in the answers
        algo (str): selection algorithm

    Returns:
        None if everything is good. Otherwise, the missing option error message.
    """
    seen_options = {}
    for answer in answers:
        if answer:
            key = options[answer['answer']].get('text')
            if options[answer['answer']].get('image_url'):
                key += options[answer['answer']].get('image_url')
            seen_options.setdefault(key, 0)
            seen_options[key] += 1

    missing_options = []
    index = 1
    for option in options:
        key = option.get('text') + option.get('image_url') if option.get('image_url') else option.get('text')
        if option.get('text') != 'n/a':
            if seen_options.get(key, 0) == 0:
                missing_options.append(_('Option ') + str(index))
            index += 1

    if missing_options:
        return {'seed_error': _('Missing option seed(s): ') + ', '.join(missing_options)}

    return None


def validate_seeded_answers_random(answers):
    """
    This validator checks if there is a minimum of one answer

    Args:
        answers (list): the answers to be checked

    Returns:
        None if everything is good. Otherwise, the missing option error message.
    """
    if len(answers) < 1:
        return {'seed_error': _('Missing 1 option seed')}

    return None


def validate_seeded_answers(answers, options, algo):
    """
    Validate answers based on selection algorithm

    This is called when instructor setup the tool and providing seeded answers to the question.
    This function is trying to validate if instructor provided enough seeds for a give algorithm.
    e.g. we require 1 seed for each option in simple algorithm and at least 1 seed for random
    algorithm. Because otherwise, the first student won't be able to see the answers on the
    second step where he/she suppose to compare and review other students answers.

    Args:
        answers (list): list of dict that contain seeded answers
        options (dict): all options that should exist in the answers
        algo (str): selection algorithm

    Returns:
        None if successful, otherwise error message
    """
    if algo['name'] == 'simple':
        return validate_seeded_answers_simple(answers, options, algo)
    elif algo['name'] == 'random':
        return validate_seeded_answers_random(answers)
    else:
        raise UnknownChooseAnswerAlgorithm()

def get_other_answers_count(pool, seeded_answers, get_student_item_dict):
    """
    Count of available answers and seeds in the pool for each option

    Args:
        pool (dict): answer pool, format:
            {
                option1_index: {
                    student_id: { can store algorithm specific info here }
                },
                option2_index: {
                    student_id: { ... }
                }
            }
        seeded_answers (list): seeded answers from instructor
            [
                {'answer': 0, 'rationale': 'rationale A'},
                {'answer': 1, 'rationale': 'rationale B'},
            ]
        get_student_item_dict (callable): get student item dict function to return student item dict

    Returns:
        dict: count for each option
        {
            0: 4,
            1: 2,
            3: 1,
            ...
        }

    """
    ret = {}

    # clean up answers so that all keys are int
    pool = {int(k): v for k, v in pool.items()}
    merged_pool = convert_seeded_answers(seeded_answers)
    student_id = get_student_item_dict()['student_id']
    for key in pool:
        merged_pool.setdefault(key, {})
        merged_pool[key].update(pool[key])
        # Pop student's own answer, if exists
        merged_pool[key].pop(student_id, None)

    for key in merged_pool:
        ret[key] = len(merged_pool.get(key, {}))
    return ret

def get_other_answers(pool, seeded_answers, get_student_item_dict, algo, options):
    """
    Select other student's answers from answer pool or seeded answers based on the selection algorithm

    Args:
        pool (dict): answer pool, format:
            {
                option1_index: {
                    student_id: { can store algorithm specific info here }
                },
                option2_index: {
                    student_id: { ... }
                }
            }
        seeded_answers (list): seeded answers from instructor
            [
                {'answer': 0, 'rationale': 'rationale A'},
                {'answer': 1, 'rationale': 'rationale B'},
            ]
        get_student_item_dict (callable): get student item dict function to return student item dict
        algo (str): selection algorithm
        options (dict): answer options for the question

    Returns:
        dict: answers based on the selection algorithm
    """
    # "#" means the number of responses returned should be the same as the number of options.
    num_responses = len(options) \
        if 'num_responses' not in algo or algo['num_responses'] == "#" \
        else int(algo['num_responses'])

    if algo['name'] == 'simple':
        return get_other_answers_simple(pool, seeded_answers, get_student_item_dict, num_responses)
    elif algo['name'] == 'random':
        return get_other_answers_random(pool, seeded_answers, get_student_item_dict, num_responses)
    else:
        raise UnknownChooseAnswerAlgorithm()


def get_other_answers_simple(pool, seeded_answers, get_student_item_dict, num_responses):
    """
    Get answers from others with simple algorithm, which picks one answer for each option.

    Args:
        see `get_other_answers`
        num_responses (int): the number of responses to be returned. This value may not be
            respected if there is not enough answers to return

    Returns:
        dict: answers based on the selection algorithm
    """
    ret = []
    # clean up answers so that all keys are int
    pool = {int(k): v for k, v in pool.items()}
    merged_pool = convert_seeded_answers(seeded_answers)
    student_id = get_student_item_dict()['student_id']
    # merge the dictionaries in the answer dictionary
    for key in pool:
        merged_pool.setdefault(key, {})
        merged_pool[key].update(pool[key])
        # Pop student's own answer, if exists
        merged_pool[key].pop(student_id, None)

    # loop until we have enough answers to return or when there is nothing more to return
    while len(ret) < num_responses and merged_pool:
        for option, students in merged_pool.items():
            rationale = None
            while students:
                student = random.choice(students.keys())
                # remove the chosen answer from pool
                content = students.pop(student, None)

                if student.startswith('seeded'):
                    # seeded answer, get the rationale from local
                    rationale = content
                else:
                    student_item = get_student_item_dict(student)
                    submission = sas_api.get_answers_for_student(student_item)
                    # Make sure the answer is still the one we want.
                    # It may have changed (e.g. instructor deleted the student state
                    # and the student re-submitted a diff answer)
                    if submission.has_revision(0) and submission.get_vote(0) == option:
                        rationale = submission.get_rationale(0)

                if rationale:
                    ret.append({'option': option, 'rationale': rationale})
                    break

            if not students:
                del merged_pool[option]

            # check if we have enough answers
            if len(ret) >= num_responses:
                break

    return {"answers": ret}


def get_other_answers_random(pool, seeded_answers, get_student_item_dict, num_responses):
    """
    Get answers from others with random algorithm, which randomly select answer from the pool.

    Student may get three answers for option 1 or one answer for option 1 and two answers for option 2.

    Args:
        see `get_other_answers`
        num_responses (int): the number of responses to be returned. This value may not be
            respected if there is not enough answers to return

    Returns:
        dict: answers based on the selection algorithm
    """
    ret = []
    # clean up answers so that all keys are int
    pool = {int(k): v for k, v in pool.items()}
    seeded = {'seeded'+str(index): answer for index, answer in enumerate(seeded_answers)}
    merged_pool = seeded.keys()

    for key in pool:
        merged_pool += pool[key].keys()

    # shuffle
    random.shuffle(merged_pool)
    # get student identifier
    student_id = get_student_item_dict()['student_id']

    for student in merged_pool:
        if len(ret) >= num_responses:
            # have enough answers
            break
        elif student == student_id:
            # this is the student's answer so don't return
            continue

        if student.startswith('seeded'):
            option = seeded[student]['answer']
            rationale = seeded[student]['rationale']
        else:
            student_item = get_student_item_dict(student)
            submission = sas_api.get_answers_for_student(student_item)
            if submission.has_revision(0):
                rationale = submission.get_rationale(0)
                option = submission.get_vote(0)
            else:
                continue
        ret.append({'option': option, 'rationale': rationale})

    return {"answers": ret}


def refresh_answers(answers_shown, option, pool, seeded_answers, get_student_item_dict, seeded_first=False):
    """
    Refresh the answers shown for given option

    Args:
        answers_shown (dict): answers being shown that need to be refreshed. Format:
            {'answers': [
                {'option': 0, 'rationale': 'rationale A'},
                {'option': 1, 'rationale': 'rationale B'},
            ]}
        option (int): the option to refresh
        pool (dict): answer pool, format:
            {
                option1_index: {
                    student_id: { can store algorithm specific info here }
                },
                option2_index: {
                    student_id: { ... }
                }
            }
        seeded_answers (list): seeded answers from instructor
            [
                {'answer': 0, 'rationale': 'rationale A'},
                {'answer': 1, 'rationale': 'rationale B'},
            ]
        get_student_item_dict (callable): get student item dict function to return student item dict
        seeded_first (boolean): refresh with answers from seeded_answers first, when exhausted, pick from pool

    Returns:
        dict: refreshed answers lists
        {
            'answers':
                [
                    {'option': 0, 'rationale': 'rationale A'},
                    {'option': 1, 'rationale': 'rationale B'},
                ]
        }
    """
    ret = copy.deepcopy(answers_shown)
    # clean up answers so that all keys are int
    pool = {int(k): v for k, v in pool.items()}
    seeded_pool = convert_seeded_answers(seeded_answers)
    student_id = get_student_item_dict()['student_id']

    available_students = copy.deepcopy(pool.get(option, {}))
    available_students.pop(student_id, None)
    # if seed answers have higher priority, fill the available seeds.
    # otherwise merge them into available students
    available_seeds = {}
    if seeded_first and seeded_pool.get(option, {}):
        available_seeds = copy.deepcopy(seeded_pool.get(option, {}))
    else:
        for key in seeded_pool.get(option, {}):
            available_students[key] = seeded_pool.get(option, {}).get(key, None)

    for answer in ret.get('answers', []):
        if answer.get('option', None) == option:
            rationale = None

            while available_seeds:
                key = random.choice(available_seeds.keys())
                rationale = available_seeds.pop(key, None)
                if rationale is not None:
                    answer['rationale'] = rationale
                    break;

            while available_students and rationale is None:
                key = random.choice(available_students.keys())
                # remove the chosen answer from pool
                content = available_students.pop(key, None)

                if key.startswith('seeded'):
                    rationale = content
                else:
                    student_item = get_student_item_dict(key)
                    submission = sas_api.get_answers_for_student(student_item)
                    # Make sure the answer is still the one we want.
                    # It may have changed (e.g. instructor deleted the student state
                    # and the student re-submitted a diff answer)
                    if submission.has_revision(0) and submission.get_vote(0) == option:
                        rationale = submission.get_rationale(0)

                if rationale:
                    answer['rationale'] = rationale
                    break

    # random.shuffle(ret['answers'])
    return ret


def convert_seeded_answers(answers):
    """
    Convert seeded answers into the format that can be merged into student answers.

    Args:
        answers (list): seeded answers

    Returns:
        dict: seeded answers with student answers format:
            {
                0: {
                    'seeded0': 'rationaleA'
                }
                1: {
                    'seeded1': 'rationaleB'
                }
            }
    """
    converted = {}
    for index, answer in enumerate(answers):
        converted.setdefault(answer['answer'], {})
        converted[answer['answer']]['seeded' + str(index)] = answer['rationale']

    return converted
