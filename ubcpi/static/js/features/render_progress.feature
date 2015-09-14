@lms @with_enrolled_student @with_published @with_seeds
Feature: Rendering Progress
  Students should be able to see their progress page
  Background:
    Given a logged in "student"

  @with_original_answer
  Scenario: Submitting an valid answer
    Given I'm on "progress" page
    Then I should see "Subsection" in "course-info-progress" section
