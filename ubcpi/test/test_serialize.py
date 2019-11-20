from __future__ import absolute_import
from collections import namedtuple
from doctest import Example

from lxml import etree
import unittest
from ddt import ddt, file_data
from lxml.doctestcompare import LXMLOutputChecker
from mock import Mock

from ubcpi.serialize import parse_image_xml, parse_question_xml, parse_options_xml, ValidationError, \
    parse_seeds_xml, parse_from_xml, UpdateFromXmlError, serialize_image, serialize_options, serialize_seeds, \
    serialize_to_xml


@ddt
class TestSerialize(unittest.TestCase):
    def assertXmlEqual(self, got, want):
        checker = LXMLOutputChecker()
        if not checker.check_output(want, got, 0):
            message = checker.output_difference(Example("", want), got, 0)
            raise AssertionError(message)

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
            (data['expect']['options'], data['expect']['correct_answer'], data['expect']['correct_rationale'])
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

        self.maxDiff = None
        self.assertEqual(result, data['expect'])

    @file_data('data/parse_from_xml_errors.json')
    def test_parse_from_xml_errors(self, data):
        xml = etree.fromstring("".join(data['xml']))
        with self.assertRaises(UpdateFromXmlError):
            parse_from_xml(xml)

    @file_data('data/parse_image_xml.json')
    def test_serialize_image(self, data):
        root = etree.Element('option')
        serialize_image(data['expect'], root)
        self.assertXmlEqual(etree.tostring(root), "".join(data['xml']))

    @file_data('data/parse_options_xml.json')
    def test_serialize_options(self, data):
        xblock_class = namedtuple('PeerInstructionXBlock', list(data['expect'].keys()))
        block = xblock_class(**data['expect'])
        root = etree.Element('options')
        serialize_options(root, block)
        self.assertXmlEqual(etree.tostring(root), "".join(data['xml']))

    @file_data('data/parse_seeds_xml.json')
    def test_serialize_seeds(self, data):
        xblock_class = namedtuple('PeerInstructionXBlock', ['seeds'])
        block = xblock_class(seeds=data['expect'])
        root = etree.Element('seeds')
        serialize_seeds(root, block)
        self.assertXmlEqual(etree.tostring(root), "".join(data['xml']))

    @file_data('data/parse_from_xml.json')
    def test_serialize_to_xml(self, data):
        xblock_class = namedtuple('PeerInstructionXBlock', list(data['expect'].keys()))
        block = xblock_class(**data['expect'])
        root = etree.Element('ubcpi')
        serialize_to_xml(root, block)
        self.assertXmlEqual(etree.tostring(root), "".join(data['xml']))
