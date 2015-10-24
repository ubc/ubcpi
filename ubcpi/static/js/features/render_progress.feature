@lms @with_enrolled_student @with_published @with_seeds
Feature: Rendering Progress
  Students should be able to see their progress page
  Background:
    Given a logged in "student"

  @with_original_answer
  Scenario: Checking progress page
    Given I'm on "progress" page
    Then I should see "Subsection" in "course-info-progress" section
