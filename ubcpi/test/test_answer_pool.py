import random
import unittest

from mock import patch
from answer_pool import offer_answer

class TestAnswerPool(unittest.TestCase):
    def test_simple_algo_insert_one(self):
        #pool = {
        #     'option1': {
        #         'student_id': { can store algorithm specific info here },
        #         ...
        #         }
        #     'option2': ...
        #}

        options = ['optionA', 'optionB', 'optionC']
        # test insert into empty pool
        pool = {}
        expected_answer = options[0]
        expected_rationale = "rationale"
        expected_student_id = "student id"
        offer_answer(pool, expected_answer, expected_rationale, expected_student_id)
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
                offer_answer(pool, cur_expected_answer, cur_expected_rationale, \
                        cur_expected_student_id)
        self.assertEqual(expected_pool, pool)
        # insert the 51st entry, this should evict one existing entry in favour
        # of the new entry
        with patch('random.choice', return_value="student id0optionA"):
            offer_answer(pool, options[0], "some rationale", "test student 51")
        for i in range(50):
            for cur_expected_answer in options:
                cur_expected_student_id = "student id" + str(i) + cur_expected_answer
                if cur_expected_student_id == "student id0optionA":
                    self.assertFalse(cur_expected_student_id in pool[cur_expected_answer])
                else:
                    self.assertTrue(cur_expected_student_id in pool[cur_expected_answer])

