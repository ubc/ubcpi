IMAGE_ATTRIBUTES = {'position': 'image_position', 'show_image_fields': 'show_image_fields', 'alt': 'image_alt'}


class UpdateFromXmlError(Exception):
    """
    Error occurred while deserializing the OpenAssessment XBlock content from XML.
    """
    pass


class ValidationError(UpdateFromXmlError):
    """
    The XML definition is not semantically valid.
    """
    pass


def _safe_get_text(element):
    """
    Retrieve the text from the element, safely handling empty elements.

    Args:
        element (lxml.etree.Element): The XML element.

    Returns:
        unicode
    """
    return unicode(element.text) if element.text is not None else u""


def _parse_boolean(boolean_str):
    """
    Attempt to parse a boolean string into a boolean value. Leniently accepts
    both 'True' and 'true', but is otherwise declared false.

    Args:
        boolean_str (unicode): The boolean string to parse.

    Returns:
        The boolean value of the string. True if the string equals '1', 'True' or
        'true'
    """
    return boolean_str in ['True', 'true', '1']


def parse_image_xml(root):
    image_dict = {}
    image_el = root.find('image')

    if image_el is None:
        return {}

    image_dict['image_url'] = _safe_get_text(image_el)

    for attr, key in IMAGE_ATTRIBUTES.iteritems():
        if attr in image_el.attrib:
            image_dict[key] = int(image_el.attrib[attr]) \
                if unicode(image_el.attrib[attr]).isnumeric() else unicode(image_el.attrib[attr])

    return image_dict


def parse_question_xml(root):
    """
    Parse <question> element in the UBCPI XBlock's content XML.

    Args:
        root (lxml.etree.Element): The root of the <question> node in the tree.

    Returns:
        dict, a deserialized representation of a question. E.g.
        {
            'text': 'What is the answer to life, the universe and everything?',
            'image_url': '',
            'image_position': 'below',
            'show_image_fields': 0,
            'image_alt': 'description'
        }

    Raises:
        ValidationError: The XML definition is invalid.
    """
    question_dict = dict()

    question_prompt_el = root.find('text')
    if question_prompt_el is not None:
        question_dict['text'] = _safe_get_text(question_prompt_el)
    else:
        raise ValidationError('Question must have text element.')

    # optional image element
    question_dict.update(parse_image_xml(root))

    return question_dict


def parse_options_xml(root):
    """
    Parse <options> element in the UBCPI XBlock's content XML.

    Args:
        root (lxml.etree.Element): The root of the <options> node in the tree.

    Returns:
        a list of deserialized representation of options. E.g.
        [{
            'text': 'Option 1',
            'image_url': '',
            'image_position': 'below',
            'show_image_fields': 0,
            'image_alt': ''
        },
        {....
        }]

    Raises:
        ValidationError: The XML definition is invalid.
    """
    options = []
    correct_option = None
    rationale = None

    for option_el in root.findall('option'):
        option_dict = dict()
        option_prompt_el = option_el.find('text')
        if option_prompt_el is not None:
            option_dict['text'] = _safe_get_text(option_prompt_el)
        else:
            raise ValidationError('Option must have text element.')

        # optional image element
        option_dict.update(parse_image_xml(option_el))

        if 'correct' in option_el.attrib and _parse_boolean(option_el.attrib['correct']):
            if correct_option is None:
                correct_option = len(options)
                rationale_el = option_el.find('rationale')
                if rationale_el is not None:
                    rationale = _safe_get_text(rationale_el)
                else:
                    raise ValidationError('Missing rationale for correct answer.')
            else:
                raise ValidationError('Only one correct answer can be defined in options.')

        options.append(option_dict)

    if correct_option is None or rationale is None:
        raise ValidationError('Correct answer and rationale are required and have to be defined in one of the option.')

    return options, correct_option, rationale


def parse_seeds_xml(root):
    """
    Parse <seeds> element in the UBCPI XBlock's content XML.

    Args:
        root (lxml.etree.Element): The root of the <seeds> node in the tree.

    Returns:
        a list of deserialized representation of seeds. E.g.
        [{
            'answer': 1,  # option index starting from one
            'rationale': 'This is a seeded answer',
        },
        {....
        }]

    Raises:
        ValidationError: The XML definition is invalid.
    """
    seeds = []

    for seed_el in root.findall('seed'):
        seed_dict = dict()
        seed_dict['rationale'] = _safe_get_text(seed_el)

        if 'option' in seed_el.attrib:
            seed_dict['answer'] = int(seed_el.attrib['option']) - 1
        else:
            raise ValidationError('Seed element must have an option attribute.')

        seeds.append(seed_dict)

    return seeds


def parse_from_xml(root):
    """
    Update the UBCPI XBlock's content from an XML definition.

    We need to be strict about the XML we accept, to avoid setting
    the XBlock to an invalid state (which will then be persisted).

    Args:
        root (lxml.etree.Element): The XML definition of the XBlock's content.

    Returns:
        A dictionary of all of the XBlock's content.

    Raises:
        UpdateFromXmlError: The XML definition is invalid
    """

    # Check that the root has the correct tag
    if root.tag != 'ubcpi':
        raise UpdateFromXmlError('Every peer instruction tool must contain an "ubcpi" element.')

    display_name_el = root.find('display_name')
    if display_name_el is None:
        raise UpdateFromXmlError('Every peer instruction tool must contain a "display_name" element.')
    else:
        display_name = _safe_get_text(display_name_el)

    rationale_size_min = int(root.attrib['rationale_size_min']) if 'rationale_size_min' in root.attrib else None
    rationale_size_max = int(root.attrib['rationale_size_max']) if 'rationale_size_max' in root.attrib else None

    question_el = root.find('question')
    if question_el is None:
        raise UpdateFromXmlError('Every peer instruction must tool contain a "question" element.')
    else:
        question = parse_question_xml(question_el)

    options_el = root.find('options')
    if options_el is None:
        raise UpdateFromXmlError('Every peer instruction must tool contain a "options" element.')
    else:
        options, correct_answer, correct_rationale = parse_options_xml(options_el)

    seeds_el = root.find('seeds')
    if seeds_el is None:
        raise UpdateFromXmlError('Every peer instruction must tool contain a "seeds" element.')
    else:
        seeds = parse_seeds_xml(seeds_el)

    algo = unicode(root.attrib['algorithom']) if 'algorithom' in root.attrib else None
    num_responses = unicode(root.attrib['num_responses']) if 'num_responses' in root.attrib else None

    return {
        'display_name': display_name,
        'question_text': question,
        'options': options,
        'rationale_size': {'min': rationale_size_min, 'max': rationale_size_max},
        'correct_answer': correct_answer,
        'correct_rationale': {'text': correct_rationale},
        'seeds': seeds,
        'algo': {"name": algo, 'num_responses': num_responses}
    }
