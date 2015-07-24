import unittest
from ddt import file_data, ddt

from mock import patch, call, MagicMock
from ubcpi.answer_pool import offer_answer, validate_seeded_answers_simple, UnknownChooseAnswerAlgorithm, \
    validate_seeded_answers_random, validate_seeded_answers, get_other_answers, get_other_answers_simple, \
    get_other_answers_random
from ubcpi.persistence import Answers, VOTE_KEY, RATIONALE_KEY


@ddt
class TestAnswerPool(unittest.TestCase):
    def test_simple_algo_insert_one(self):
        options = ['optionA', 'optionB', 'optionC']
        # test insert into empty pool
        pool = {}
        expected_answer = options[0]
        expected_rationale = "rationale"
        expected_student_id = "student id"
        offer_answer(pool, expected_answer, expected_rationale, expected_student_id, {'name': 'simple'})
        expected_pool = {expected_answer: {expected_student_id: {}}}
        self.assertEqual(expected_pool, pool)

    def test_simple_algo_insert_max(self):
        options = ['optionA', 'optionB', 'optionC']
        # test insert 50 entries for each option, all of them should make it in
        pool = {}
        expected_pool = {}
        for i in range(50):
            for cur_expected_answer in options:
                cur_expected_rationale = "rationale" + str(i)
                cur_expected_student_id = "student id" + str(i) + cur_expected_answer
                students = expected_pool.setdefault(cur_expected_answer, {})
                students[cur_expected_student_id] = {}
                expected_pool[cur_expected_answer] = students
                offer_answer(pool, cur_expected_answer, cur_expected_rationale,
                             cur_expected_student_id, {'name': 'simple'})
        self.assertEqual(expected_pool, pool)
        # insert the 51st entry, this should evict one existing entry in favour
        # of the new entry
        with patch('random.choice', return_value="student id0optionA"):
            offer_answer(pool, options[0], "some rationale", "test student 51", {'name': 'simple'})
        for i in range(50):
            for cur_expected_answer in options:
                cur_expected_student_id = "student id" + str(i) + cur_expected_answer
                if cur_expected_student_id == "student id0optionA":
                    self.assertFalse(cur_expected_student_id in pool[cur_expected_answer])
                else:
                    self.assertTrue(cur_expected_student_id in pool[cur_expected_answer])

    def test_validate_seeded_answers_simple(self):
        options = [{'text': 'optionA', 'image_url': '/static/test.jpg'}, {'text': 'optionB'}, {'text': 'optionC'}]
        answers = [
            {'answer': 0, 'desc': 'rationale A'},
            {'answer': 1, 'desc': 'rationale B'},
            {'answer': 2, 'desc': 'rationale C'},
        ]

        self.assertIsNone(validate_seeded_answers_simple(answers, options, {'algo': 'simple'}))

        options = [
            {'text': 'option1'}, {'text': 'optionA'},
            {'text': 'optionB'}, {'text': 'optionC'}, {'text': 'optionD'}
        ]

        self.assertEqual(
            validate_seeded_answers_simple(answers, options, {'algo': 'simple'}),
            {'seed_error': "Missing option seed(s): Option 4, Option 5"}
        )

    @patch(
        'ubcpi.persistence.get_answers_for_student',
        return_value=Answers([{VOTE_KEY: 0, RATIONALE_KEY: 'my rationale'}])
    )
    @file_data('data/get_other_answers_simple.json')
    def test_get_other_answers_simple(self, data, mock):
        student_item_dict_func = MagicMock(return_value={'student_id': data['user_id']})
        with patch('random.choice', side_effect=data['choice_result']):
            result = get_other_answers_simple(
                data['pool'], data['seeds'], student_item_dict_func, data['num_responses']
            )
        # check the answers
        self.assertEqual(result, data['expect'])

    def test_random_algo_insert_one(self):
        options = ['optionA', 'optionB', 'optionC']
        # test insert into empty pool
        pool = {}
        expected_answer = options[0]
        expected_rationale = "rationale"
        expected_student_id = "student id"
        offer_answer(pool, expected_answer, expected_rationale, expected_student_id, {'name': 'random'})
        expected_pool = {expected_answer: {expected_student_id: {}}}
        self.assertEqual(expected_pool, pool)

    @patch(
        'ubcpi.persistence.get_answers_for_student',
        return_value=Answers([{VOTE_KEY: 0, RATIONALE_KEY: 'my rationale'}])
    )
    @file_data('data/get_other_answers_random.json')
    def test_get_other_answers_random(self, data, mock):
        student_item_dict_func = MagicMock(return_value={'student_id': data['user_id']})

        # mock shuffle this way because it does in place changing of the pool
        def side_effect(student_pool):
            del student_pool[:]
            student_pool.extend(data['shuffle_result'])

        with patch('random.shuffle', side_effect=side_effect):
            result = get_other_answers_random(
                data['pool'], data['seeds'], student_item_dict_func, data['num_responses']
            )
        # check the answers
        self.assertEqual(result, data['expect'])

    def test_validate_seeded_answers_random(self):
        self.assertIsNone(validate_seeded_answers_random([{'answer': 1}]))

        self.assertEqual(
            validate_seeded_answers_random([]),
            {'seed_error': 'Missing 1 option seed'}
        )

    def test_validate_seeded_answers(self):
        with patch('ubcpi.answer_pool.validate_seeded_answers_simple') as mock:
            validate_seeded_answers({}, {}, {'name': 'simple'})
            self.assertEqual(mock.mock_calls, [call({}, {}, {'name': 'simple'})])

        with patch('ubcpi.answer_pool.validate_seeded_answers_random') as mock:
            validate_seeded_answers({}, {}, {'name': 'random'})
            self.assertEqual(mock.mock_calls, [call({})])

        with self.assertRaises(UnknownChooseAnswerAlgorithm):
            validate_seeded_answers({}, {}, {'name': 'invalid'})

    def test_get_other_answers(self):
        with patch('ubcpi.answer_pool.get_other_answers_simple') as mock:
            get_other_answers({}, {}, {}, {'name': 'simple', 'num_responses': '#'}, ['option1', 'option2'])
            self.assertEqual(mock.mock_calls, [call({}, {}, {}, 2)])

        with patch('ubcpi.answer_pool.get_other_answers_random') as mock:
            get_other_answers({}, {}, {}, {'name': 'random', 'num_responses': '1'}, ['option1', 'option2'])
            self.assertEqual(mock.mock_calls, [call({}, {}, {}, 1)])

        with self.assertRaises(UnknownChooseAnswerAlgorithm):
            get_other_answers({}, {}, {}, {'name': 'invalid'}, {})

    def test_offer_answer_invalid_algo(self):
        with self.assertRaises(UnknownChooseAnswerAlgorithm):
            offer_answer({}, {}, 'rationale', 'student_id', {'name': 'invalid'})
