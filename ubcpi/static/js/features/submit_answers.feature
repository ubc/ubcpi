@lms @with_enrolled_student @with_published @with_seeds
Feature: Submitting Answers
  Students should be able to submit their answers
  Background:
    Given a logged in "student"

  Scenario: Submitting an valid answer
    Given I'm on "courseware" page
    When I select option "21"
    And I fill in "This is my rationale" in "rationale"
    And I click on "Next Step →" button
    Then I should see "READ OTHER STUDENT ANSWERS" in "Others Responses" section

  @with_original_answer
  Scenario: Submitting a revised answer
    Given I'm on "courseware" page
    When I select option "21"
    And I fill in "This is my revised rationale" in "rationale"
    And I click on "Next Step →" button
    Then I should see "CORRECT ANSWER" in "Detailed Solution" section
