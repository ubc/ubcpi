from lxml import etree
import unittest
from ddt import ddt, file_data
from ubcpi.serialize import parse_image_xml, parse_question_xml, parse_options_xml, ValidationError, \
    parse_seeds_xml, parse_from_xml, UpdateFromXmlError


@ddt
class TestSerialize(unittest.TestCase):
    @file_data('data/parse_image_xml.json')
    def test_parse_image_xml(self, data):
        xml = etree.fromstring("".join(data['xml']))
        result = parse_image_xml(xml)

        self.assertEqual(result, data['expect'])

    @file_data('data/parse_question_xml.json')
    def test_parse_question_xml(self, data):
        xml = etree.fromstring("".join(data['xml']))
        result = parse_question_xml(xml)

        self.assertEqual(result, data['expect'])

    @file_data('data/parse_question_xml_errors.json')
    def test_parse_question_xml_errors(self, data):
        xml = etree.fromstring("".join(data['xml']))
        with self.assertRaises(ValidationError):
            parse_question_xml(xml)

    @file_data('data/parse_options_xml.json')
    def test_parse_options_xml(self, data):
        xml = etree.fromstring("".join(data['xml']))
        result = parse_options_xml(xml)

        self.assertEqual(
            result,
            (data['expect']['options'], data['expect']['correct'], data['expect']['rationale'])
        )

    @file_data('data/parse_options_xml_errors.json')
    def test_parse_options_xml_errors(self, data):
        xml = etree.fromstring("".join(data['xml']))
        with self.assertRaises(ValidationError):
            parse_options_xml(xml)

    @file_data('data/parse_seeds_xml.json')
    def test_parse_seeds_xml(self, data):
        xml = etree.fromstring("".join(data['xml']))
        result = parse_seeds_xml(xml)

        self.assertEqual(result, data['expect'])

    @file_data('data/parse_seeds_xml_errors.json')
    def test_parse_seeds_xml_errors(self, data):
        xml = etree.fromstring("".join(data['xml']))
        with self.assertRaises(ValidationError):
            parse_seeds_xml(xml)

    @file_data('data/parse_from_xml.json')
    def test_parse_from_xml(self, data):
        xml = etree.fromstring("".join(data['xml']))
        result = parse_from_xml(xml)

        self.assertEqual(result, data['expect'])

    @file_data('data/parse_from_xml_errors.json')
    def test_parse_from_xml_errors(self, data):
        xml = etree.fromstring("".join(data['xml']))
        with self.assertRaises(UpdateFromXmlError):
            parse_from_xml(xml)
