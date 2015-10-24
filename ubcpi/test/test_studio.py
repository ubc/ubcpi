import json
import os
from lxml import etree
from ddt import ddt, file_data
from django.test import TestCase
from mock import MagicMock, Mock
from workbench.test_utils import scenario, XBlockHandlerTestCaseMixin
from ubcpi.ubcpi import PeerInstructionXBlock


@ddt
class StudioViewTest(XBlockHandlerTestCaseMixin, TestCase):
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'))
    def test_render_studio_view(self, xblock):
        frag = self.runtime.render(xblock, 'studio_view')
        self.assertNotEqual(frag.body_html().find('Display Name'), -1)

    @file_data('data/update_xblock.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'))
    def test_studio_submit(self, xblock, data):
        xblock.runtime.modulestore = MagicMock()
        xblock.runtime.modulestore.has_published_version.return_value = False
        resp = self.request(xblock, 'studio_submit', json.dumps(data), response_format='json')
        self.assertTrue(resp['success'], msg=resp.get('msg'))
        self.check_fields(xblock, data)

    @file_data('data/validate_form.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'))
    def test_validate_form(self, xblock, data):
        resp = self.request(xblock, 'validate_form', json.dumps(data), response_format='json')
        self.assertTrue(resp['success'], msg=resp.get('msg'))

    @file_data('data/validate_form_errors.json')
    @scenario(os.path.join(os.path.dirname(__file__), 'data/basic_scenario.xml'))
    def test_validate_form_errors(self, xblock, data):
        resp = self.request(xblock, 'validate_form', json.dumps(data['post']), response_format='json')
        self.assertEqual(resp, data['error'])

    @file_data('data/parse_from_xml.json')
    def test_parse_xml(self, data):
        node = etree.fromstring("".join(data['xml']))
        runtime = Mock()
        runtime.construct_xblock_from_class = Mock(return_value=Mock())
        xblock = PeerInstructionXBlock.parse_xml(node, runtime, {}, {})
        self.check_fields(xblock, data['expect'])

    def check_fields(self, xblock, data):
        for key, value in data.iteritems():
            self.assertIsNotNone(getattr(xblock, key))
            self.assertEqual(getattr(xblock, key), value)
