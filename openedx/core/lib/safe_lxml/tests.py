"""
Test that we have defused XML.
"""


from lxml import etree

import pytest


def test_entities_resolved():
    xml = '<?xml version="1.0"?><!DOCTYPE mydoc [<!ENTITY hi "Hello">]> <root>&hi;</root>'
    parser = etree.XMLParser(resolve_entities=True)
    tree = etree.fromstring(xml, parser=parser)
    pr = etree.tostring(tree)
    assert pr == b'<root>Hello</root>'


def test_entities_arent_resolved():
    xml = '<?xml version="1.0"?><!DOCTYPE mydoc [<!ENTITY hi "Hello">]> <root>&hi;</root>'
    parser = etree.XMLParser(resolve_entities=False)
    tree = etree.fromstring(xml, parser=parser)
    pr = etree.tostring(tree)
    assert pr == b'<root>&hi;</root>'
