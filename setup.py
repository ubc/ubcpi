"""Setup for ubcpi XBlock."""

import os
from setuptools import setup


def package_data(pkg, roots):
    """Generic function to find package_data.

    All of the files under each of the `roots` will be declared as package
    data for package `pkg`.

    """
    data = []
    for root in roots:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))

    return {pkg: data}


def readme():
    if os.path.exists('README.rst'):
        with open('README.rst') as f:
            return f.read()
    else:
        # fallback to a default description
        return 'UBC Peer Instruction Tool'


setup(
    name='ubcpi-xblock',
    version='0.4.3',
    description='UBC Peer Instruction XBlock',
    long_description=readme(),
    license='Affero GNU General Public License v3 (GPLv3)',
    url="https://github.com/ubc/ubcpi",
    author="UBC CTLT",
    author_email="pan.luo@ubc.ca",
    packages=['ubcpi'],
    install_requires=[
        'XBlock',
    ],
    entry_points={
        'xblock.v1': [
            'ubcpi = ubcpi.ubcpi:PeerInstructionXBlock',
        ]
    },
    package_data=package_data("ubcpi", ["static", "public"]),
    keywords=['edx', 'peer instruction', 'ubc'],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Plugins",
        "Framework :: Django",
        "Intended Audience :: Education",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: JavaScript",
        "Topic :: Education",
    ],
)
