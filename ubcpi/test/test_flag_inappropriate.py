import os
import json

from ddt import ddt, file_data
from django.test import TestCase
from mock import patch, Mock
from workbench.test_utils import scenario, XBlockHandlerTestCaseMixin



@ddt
class TestFlagInappropriate(XBlockHandlerTestCaseMixin, TestCase):

    @file_data('data/flag_inappropriate.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_flag_seed(self, xblock, data):
        resp = self.request(xblock, 'flag_inappropriate', json.dumps(data['flag_seed']['request']), response_format='json')
        self.assertEqual(resp, data['flag_seed']['expect'])

    @patch('ubcpi.ubcpi.get_other_answers')
    @file_data('data/flag_inappropriate.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_flag_others(self, xblock, data, mock):
        mock.return_value = data['flag_others']['dummy_get_other_answers']

        resp = self.request(xblock, 'submit_answer', json.dumps(data['flag_others']['submit_answer_request']), response_format='json')
        self.assertEqual(resp, data['flag_others']['submit_answer_expect'])

        resp = self.request(xblock, 'flag_inappropriate', json.dumps(data['flag_others']['flag_inappropriate_request']), response_format='json')
        self.assertEqual(resp, data['flag_others']['flag_inappropriate_expect'])

    @patch('ubcpi.ubcpi.PeerInstructionXBlock.is_course_staff')
    @file_data('data/flag_inappropriate.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_get_pool_status(self, xblock, data, mock):
        # pretend as staff
        mock.return_value = True

        # submit a new answer
        resp = self.request(xblock, 'submit_answer', json.dumps(data['get_pool_status']['submit_answer_request']), response_format='json')
        # should be in the pool
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['get_pool_status']['get_pool_status_request']), response_format='json')
        # each answer in pool has an unique id
        unique_id_seen = set()
        for ans in resp:
            self.assertNotIn(ans['id'], unique_id_seen)
            unique_id_seen.add(ans['id'])
            del ans['id']

        self.assertEqual(resp, data['get_pool_status']['get_pool_status_expect'])

        # pretend not a staff
        mock.return_value = False
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['get_pool_status']['get_pool_status_request']))
        # TODO should find ways to test for 403 reponse code
        self.assertEqual(len(resp), 0)

    @patch('ubcpi.ubcpi.PeerInstructionXBlock.is_course_staff')
    @file_data('data/flag_inappropriate.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_staff_toggle_inappropriate(self, xblock, data, mock):
        # submit a new answer
        resp = self.request(xblock, 'submit_answer', json.dumps(data['staff_toggle_inappropriate']['submit_answer_request']), response_format='json')
        # should be in the pool
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['staff_toggle_inappropriate']['get_pool_status_request']), response_format='json')

        # each answer in pool has an unique id
        unique_id_seen = set()
        for ans in resp:
            self.assertNotIn(ans['id'], unique_id_seen)
            unique_id_seen.add(ans['id'])
            del ans['id']
        self.assertEqual(resp, data['staff_toggle_inappropriate']['get_pool_status_expect_before'])

        # pretend not a staff
        mock.return_value = False
        # for each answer in the pool, trying to mark inappropriate should fail
        for the_id in unique_id_seen:
            data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set']['id'] = the_id
            resp = self.request(xblock, 'staff_toggle_inappropriate', json.dumps(data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set']))
            self.assertTrue(resp == '')

        # pretend as staff
        mock.return_value = True

        # for each answer in the pool, mark as inappropriate
        for the_id in unique_id_seen:
            data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set']['id'] = the_id
            resp = self.request(xblock, 'staff_toggle_inappropriate', json.dumps(data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set']), response_format='json')
            # verify that the specific id is now set and inappropriate
            for ans in resp:
                if ans['id'] == the_id:
                    self.assertTrue(ans['considered_inappropriate'])
        # check pool status again.  all answer should be marked as inappropriate
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['staff_toggle_inappropriate']['get_pool_status_request']), response_format='json')
        for ans in resp:
            self.assertIn(ans['id'], unique_id_seen)
            del ans['id']
        self.assertEqual(resp, data['staff_toggle_inappropriate']['get_pool_status_expect_after'])

        # for each answer in the pool, unset inappropriate flag
        for the_id in unique_id_seen:
            data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_unset']['id'] = the_id
            resp = self.request(xblock, 'staff_toggle_inappropriate', json.dumps(data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_unset']), response_format='json')
            # verify that the specific id is now set and inappropriate
            for ans in resp:
                if ans['id'] == the_id:
                    self.assertFalse(ans['considered_inappropriate'])
        # check pool status again.  all answer should be considered appropriate
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['staff_toggle_inappropriate']['get_pool_status_request']), response_format='json')
        for ans in resp:
            self.assertIn(ans['id'], unique_id_seen)
            del ans['id']
        self.assertEqual(resp, data['staff_toggle_inappropriate']['get_pool_status_expect_before'])

        # for each answer in the pool, mark as appropriate
        for the_id in unique_id_seen:
            data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set_appropriate']['id'] = the_id
            resp = self.request(xblock, 'staff_toggle_inappropriate', json.dumps(data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_set_appropriate']), response_format='json')
            # verify that the specific id is now set and inappropriate
            for ans in resp:
                if ans['id'] == the_id:
                    self.assertFalse(ans['considered_inappropriate'])
        # check pool status again.  all answer should be considered appropriate
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['staff_toggle_inappropriate']['get_pool_status_request']), response_format='json')
        for ans in resp:
            self.assertIn(ans['id'], unique_id_seen)
            del ans['id']
        self.assertEqual(resp, data['staff_toggle_inappropriate']['get_pool_status_expect_force_appropriate'])

        # for each answer in the pool, unset for appropriate
        for the_id in unique_id_seen:
            data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_unset']['id'] = the_id
            resp = self.request(xblock, 'staff_toggle_inappropriate', json.dumps(data['staff_toggle_inappropriate']['staff_toggle_inappropriate_request_unset']), response_format='json')
            # verify that the specific id is now set and inappropriate
            for ans in resp:
                if ans['id'] == the_id:
                    self.assertFalse(ans['considered_inappropriate'])
        # check pool status again.  all answer should be considered appropriate
        resp = self.request(xblock, 'get_pool_status', json.dumps(data['staff_toggle_inappropriate']['get_pool_status_request']), response_format='json')
        for ans in resp:
            self.assertIn(ans['id'], unique_id_seen)
            del ans['id']
        self.assertEqual(resp, data['staff_toggle_inappropriate']['get_pool_status_expect_before'])
