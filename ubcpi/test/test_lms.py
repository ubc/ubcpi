from __future__ import absolute_import
import json
import os

from ddt import ddt, file_data
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from mock import patch, Mock
from workbench.test_utils import scenario, XBlockHandlerTestCaseMixin

from ubcpi.persistence import Answers, VOTE_KEY, RATIONALE_KEY
from ubcpi.ubcpi import truncate_rationale, MAX_RATIONALE_SIZE_IN_EVENT
import six


@ddt
class LmsTest(XBlockHandlerTestCaseMixin, TestCase):
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_render_student_view(self, xblock):
        # mock static asset path because it is not set in workbench
        frag = self.runtime.render(xblock, 'student_view')
        self.assertNotEqual(frag.body_html().find('Question'), -1)

    @patch(
        'ubcpi.persistence.get_answers_for_student',
        return_value=Answers([{VOTE_KEY: 0, RATIONALE_KEY: 'my rationale'}])
    )
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_render_student_view_with_original_answer(self, xblock, mock):
        # mock static asset path because it is not set in workbench
        frag = self.runtime.render(xblock, 'student_view')
        self.assertNotEqual(frag.body_html().find('"other_answers":'), -1)

    @patch(
        'ubcpi.persistence.get_answers_for_student',
        return_value=Answers([
            {VOTE_KEY: 0, RATIONALE_KEY: 'my rationale'},
            {VOTE_KEY: 1, RATIONALE_KEY: 'my revised rationale'}
        ])
    )
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_render_student_view_with_revised_answer(self, xblock, mock):
        # mock static asset path because it is not set in workbench
        frag = self.runtime.render(xblock, 'student_view')
        # do not contain other_answers but correct_answer
        self.assertEqual(frag.body_html().find('"other_answers":'), -1)
        self.assertNotEqual(frag.body_html().find('"correct_answer":'), -1)

    @patch('ubcpi.ubcpi.get_other_answers')
    @file_data('data/submit_answer.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_submit_answer(self, xblock, data, mock):
        # patch get_other_answers to avoid randomness
        mock.return_value = data['expect1']['other_answers']
        resp = self.request(xblock, 'submit_answer', json.dumps(data['post1']).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, data['expect1'])

        # check the student is recorded
        answers = xblock.get_answers_for_student()
        self.assertTrue(answers.has_revision(0))
        self.assertFalse(answers.has_revision(1))
        self.assertEqual(answers.get_rationale(0), data['post1']['rationale'])

        # check the stats that we have 1 answer
        self.assertEqual(xblock.stats['original'][data['post1']['q']], 1)

        # Check the data is persisted
        persisted = xblock.get_persisted_data(data['expect1']['other_answers'])
        self.assertEquals(persisted['answer_original'], 0)
        self.assertFalse( 'correct_answer' in persisted )


        # submit revised answer
        resp = self.request(xblock, 'submit_answer', json.dumps(data['post2']).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, data['expect2'])

        # check the student is recorded
        answers = xblock.get_answers_for_student()
        self.assertTrue(answers.has_revision(0))
        self.assertTrue(answers.has_revision(1))
        self.assertEqual(answers.get_rationale(0), data['post1']['rationale'])
        self.assertEqual(answers.get_rationale(1), data['post2']['rationale'])

        # check the stats that we have 1 answer
        self.assertEqual(xblock.stats['original'][data['post1']['q']], 1)
        self.assertEqual(xblock.stats['revised'][data['post2']['q']], 1)

        # Check we now have all the persisted data we should have
        persisted = xblock.get_persisted_data(data['expect1']['other_answers'])
        self.assertEquals(persisted['answer_original'], 0)
        self.assertTrue( 'correct_answer' in persisted )

    @file_data('data/submit_answer_errors.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_submit_answer_errors(self, xblock, data):
        with self.assertRaises(PermissionDenied):
            self.request(xblock, 'submit_answer', json.dumps(data['post1']).encode('utf8'))

    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_get_stats(self, xblock):
        stats = {"revised": {"1": 1}, "original": {"0": 1}}
        xblock.stats = stats
        resp = self.request(xblock, 'get_stats', b'{}')
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, stats)

    @patch('ubcpi.ubcpi.PeerInstructionXBlock.resource_string')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_get_asset(self, xblock, mock):
        mock.return_value = 'test'
        resp = self.request(xblock, 'get_asset', b'f=test.html', request_method='POST')
        self.assertEqual(resp, b'test')

    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_get_student_item_dict(self, xblock):
        student_item = xblock.get_student_item_dict()
        self.assertEqual(student_item, {
            'student_id': 'Bob',
            'item_id': '.ubcpi.d3.u0',
            'course_id': 'edX/Enchantment_101/April_1',
            'item_type': 'ubcpi'
        })

        xblock.scope_ids = Mock()
        xblock.scope_ids.usage_id = 'usage_id'
        xblock.scope_ids.user_id = None
        student_item = xblock.get_student_item_dict()
        self.assertEqual(student_item, {
            'student_id': '',
            'item_id': 'usage_id',
            'course_id': 'edX/Enchantment_101/April_1',
            'item_type': 'ubcpi'
        })

        # mock the LMS environment
        xblock.xmodule_runtime = Mock()
        xblock.xmodule_runtime.course_id.to_deprecated_string = Mock(return_value='course 101')
        xblock.xmodule_runtime.anonymous_student_id = 'anonymous'

        student_item = xblock.get_student_item_dict()
        self.assertEqual(student_item, {
            'student_id': 'anonymous',
            'item_id': u'usage_id',
            'course_id': 'course 101',
            'item_type': 'ubcpi'
        })

        student_item = xblock.get_student_item_dict('anonymous_1')
        self.assertEqual(student_item, {
            'student_id': 'anonymous_1',
            'item_id': 'usage_id',
            'course_id': 'course 101',
            'item_type': 'ubcpi'
        })

    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_has_dynamic_children(self, xblock):
        self.assertFalse(xblock.has_dynamic_children())

    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_max_score(self, xblock):
        self.assertEqual(xblock.max_score(), 1)

    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_get_asset_url(self, xblock):
        # in
        self.assertEqual(
            xblock.get_asset_url('http://example.com/image'),
            'http://example.com/image',
            'non asset URL should return as it is')

        self.assertEqual(
            xblock.get_asset_url('/static/cat.jpg'),
            '/static/cat.jpg',
            'in workbench env, it should return as it it')

        # mock the LMS environment
        xblock.xmodule_runtime = Mock()
        for_branch = Mock(return_value='/c4x://test/course/')
        make_asset_key = Mock()
        make_asset_key.for_branch = for_branch
        xblock.course_id = Mock()
        xblock.course_id.make_asset_key = Mock(return_value=make_asset_key)

        self.assertEqual(
            xblock.get_asset_url('/static/cat.jpg'),
            '/c4x://test/course/cat.jpg',
            'in edx env, it should return converted asset URL')

        # test for legacy URLs
        for_branch = Mock(return_value='c4x://test/course/')
        make_asset_key = Mock()
        make_asset_key.for_branch = for_branch
        xblock.course_id = Mock()
        xblock.course_id.make_asset_key = Mock(return_value=make_asset_key)

        self.assertEqual(
            xblock.get_asset_url('/static/cat.jpg'),
            '/c4x://test/course/cat.jpg',
            'in edx env, it should return converted asset URL')

    def test_truncate_rationale(self):
        short_rationale = 'This is a rationale'
        truncated_rationale, was_truncated = truncate_rationale(short_rationale)
        self.assertEqual(truncated_rationale, short_rationale)
        self.assertFalse(was_truncated)

        long_rationale = "x" * 50000
        truncated_rationale, was_truncated = truncate_rationale(long_rationale)
        self.assertEqual(len(truncated_rationale), MAX_RATIONALE_SIZE_IN_EVENT)
        self.assertTrue(was_truncated)

    def check_fields(self, xblock, data):
        for key, value in six.iteritems(data):
            self.assertIsNotNone(getattr(xblock, key))
            self.assertEqual(getattr(xblock, key), value)

    @patch('ubcpi.ubcpi.get_other_answers')
    @file_data('data/refresh_other_answers.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'), user_id='Bob')
    def test_refresh_other_answers(self, xblock, data, mock):
        # patch get_other_answers to avoid randomness
        mock.return_value = data['expect']['other_answers']
        resp = self.request(xblock, 'submit_answer', json.dumps(data['submit_answer_param']).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, data['expect'])

        original_other_ans = [ans['rationale'] for ans in xblock.other_answers_shown['answers'] if ans['option'] == int(data['refresh_params']['option'])]

        resp = self.request(xblock, 'refresh_other_answers', json.dumps({}).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, {'error': 'Missing option'})
        resp = self.request(xblock, 'refresh_other_answers', json.dumps({'option': -1}).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(resp, {'error': 'Invalid option'})

        resp = self.request(xblock, 'refresh_other_answers', json.dumps(data['refresh_params']).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        self.assertEqual(xblock.other_answers_refresh_count[data['refresh_params']['option']] , 1)
        self.assertEqual(len(xblock.other_answers_shown_history), 3)
        refreshed_other_ans = [ans['rationale'] for ans in xblock.other_answers_shown['answers'] if ans['option'] == int(data['refresh_params']['option'])]
        # rationale of the refreshed option should be chanaged
        self.assertNotEqual(original_other_ans, refreshed_other_ans)

        resp = self.request(xblock, 'refresh_other_answers', json.dumps(data['refresh_params']).encode('utf8'))
        resp = json.loads(resp.decode('utf8'))
        # refresh count of the option should be increased
        self.assertEqual(xblock.other_answers_refresh_count[data['refresh_params']['option']] , 2)
        self.assertEqual(len(xblock.other_answers_shown_history), 3)
