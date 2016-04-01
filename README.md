## UBC Peer Instruction Tool for EdX

[![Build Status](https://travis-ci.org/ubc/ubcpi.svg)](https://travis-ci.org/ubc/ubcpi) [![Coverage Status](https://coveralls.io/repos/ubc/ubcpi/badge.svg?branch=master&service=github)](https://coveralls.io/github/ubc/ubcpi?branch=master)

__Note: This is a work in progress__

Over the last 20 years, Peer Instruction has become a widely-adopted instructional technique across higher education. It is the cornerstone of a range of approaches that collectively aim to use classroom time (usually lectures) more productively than simply as a vehicle for didactic presentation of content. Such approaches often broadly classified as  ‘interactive engagement’ strategies, or — more recently — ‘flipped classroom’ approaches.

The learning and retention benefits of interactive engagement strategies has been convincingly demonstrated in a recent meta-analysis by Freeman et al which examined 225 published studies across various STEM disciplines and course contexts. Relating directly to peer instruction, and specifically the efficacy of peer discussion to improve student performance on concept questions posed in class, a 2009 study by Smith et al (Science 323, 122 (2009)) demonstrates this effect comes from enhanced learning, rather than simply peer influence. The impact peer instruction has had was recognized through the award of the inaugural Minerva prize for enhancement in higher education to Eric Mazur in 2014.

One of the key features in the success of peer instruction in enhancing student learning is to promote higher-order cognitive activities (articulation, evaluation, synthesis etc.) within a learning sequence or activity (for example, within a lecture segment in the face-to-face environment). It is specifically this benefit that we seek to replicate and expose within the online environment through this suggestion to develop online Peer Instruction (oPI) in the functionality within edX.

## Basic workflow

1. In Studio, course creator creates a new advanced problem of type Peer Instruction, configures and publishes
2. In the LMS, (following some content presentation) the student is presented the question, answer options and text box to complete their rationale for their answer.
3. Following submit, the student is presented with a range of alternative student answers and rationales (This is as an alternative to small group discussion)
4. Students reflect on the answers presented, then modify their own answer and rationale and submit a final answer
5. Students are presented feedback including their own answer, the model instructor answer and class distribution statistics across both stages.
6. The Instructor is able to see class statistics on demand at any given time in process.

## Installing Dependencies and this XBlock

    cd PATH/TO/SOURCE
    make deps
    pip install -e .

## Running in WorkBench

    make workbench

## Running Unit Tests

    make test
or

    make test-py
    make test-js

## Running Acceptance Tests
 To run acceptance test, the devstack has to be running at localhost:8000 and localhost:8001 (configurable in protractor.conf) with auth auth enabled. To enable auto auth in cms.env.json and lms.env.json from Edx platform:

    AUTOMATIC_AUTH_FOR_TESTING: true

(Optional) Disable Django debug toolbar and contracts for faster tests: https://github.com/edx/edx-platform/wiki/Developing-on-the-edX-Developer-Stack#making-the-local-servers-run-faster

Install webdriver:

	node_modules/protractor/bin/webdriver-manager update --standalone

Run tests:

    make test-acceptance

Single test:

    node_modules/protractor/bin/protractor protractor.conf.js --browser chrome --specs=ubcpi/static/js/features/cms.feature

## Changelog
### [0.5.2](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.5.2+is%3Aclosed)
1. Updated XBlock version reference to 0.4.7
2. Added support for XBlock-level internationalization/localization
3. Added chart labels: Original Answer, Revised Answer
4. Fixed the fact that rationales that had words longer than 77 characters would bleed outside container/not-wrap
5. Modified CSS to make images larger than the container responsive
6. Minor text change (clarification of rationale to students)
7. Added question text to final step
8. Changed icon on final step + style change to remove floating list bullet
9. Changed title from "Question" to "Peer Instruction Question"

### [0.5.1](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.5.1+is%3Aclosed)
1. Changed the "Question" title to "Peer Instruction Question"
2. Changed the answer icon from fa-users to fa-user and the dot at the last step
3. Modified the ‘Explain your selection’ instruction to remind them that the intended readers are other students
4. Added question text at the end of the process

### [0.5.0](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.5.0+is%3Aclosed)
1. Updated UX based on feedbacks from the student usability testing
2. Updated UX and accessibility based on feedbacks from EdX
3. Added serialisation support for course export
4. Added EdX analytic event
5. Added participation score support
6. Disabled student empty rationale submission
7. Fixed a bug where a 500 error is generated when removing an option from list under certain condition
8. Fixed a bug where the responses are missing after going to a different page

### [0.4.0](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.4+is%3Aclosed)
1. Added unit and acceptance tests with 100% coverage
2. Disabled chart generation when there is not enough response
3. Improved accessibility
4. A lot of code refactoring

### [0.3.0](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.3+is%3Aclosed)

1. Added the 'random' algorithm which allows a student to see a completely random selection of others' answers
2. Added and edited front-end help documentation so that it's more clear what each step is and what will happen at the next step and, if appropriate, why you can't progress to the next step
3. Added a first-pass at hooking up UBCPI to the edX grading system. This is more of a 'completion' mark as a student is always given the grade after they submit their revised answer regardless of the responses being correct or not
4. Tidying up of the statistics graphs that are shown on the last step

### [0.2.0](https://github.com/ubc/ubcpi/issues?q=milestone%3A0.2+is%3Aclosed)

1. The edit window in studio is now much tidier and contains much more useful hints
2. Fixed the bug where a rationale wasn't required
3. Tidied up the bar charts display for the LMS view and made the correct answer show more prominantly
4. Default content is now somewhat more useful
5. Rationales now can have a minimum an/or maximum character count

### 0.1.0
1. Incredibly basic proof of concept working
2. Can add questions and possible responses
3. Students can answer, view others' responses (with seeds if necessary)
4. Analytics in the form of charts of initial and final responses
