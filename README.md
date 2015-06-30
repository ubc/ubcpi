## UBC Peer Instruction Tool for EdX

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

## Changelog

### 0.1.0
1. Incredibly basic proof of concept working
2. Can add questions and possible responses
3. Students can answer, view others' responses (with seeds if necessary)
4. Analytics in the form of charts of initial and final responses

### 0.2.0 https://github.com/ubc/ubcpi/issues?q=milestone%3A0.2+is%3Aclosed

1. The edit window in studio is now much tidier and contains much more useful hints
2. Fixed the bug where a rationale wasn't required
3. Tidied up the bar charts display for the LMS view and made the correct answer show more prominantly
4. Default content is now somewhat more useful
5. Rationales now can have a minimum an/or maximum character count

### 0.3.0 https://github.com/ubc/ubcpi/issues?q=milestone%3A0.3+is%3Aclosed

1. Added the 'random' algorithm which allows a student to see a completely random selection of others' answers
2. Added and edited front-end help documentation so that it's more clear what each step is and what will happen at the next step and, if appropriate, why you can't progress to the next step
3. Added a first-pass at hooking up UBCPI to the edX grading system. This is more of a 'completion' mark as a student is always given the grade after they submit their revised answer regardless of the responses being correct or not
4. Tidying up of the statistics graphs that are shown on the last step
