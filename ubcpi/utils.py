# -*- coding: utf-8 -*-
#

from django.utils import translation

# Make '_' a no-op so we can scrape strings
def _(text):
    return text

def get_language():
    """
    Return the locale name of the user language.
    """
    return translation.to_locale(translation.get_language())
