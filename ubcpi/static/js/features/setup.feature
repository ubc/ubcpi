@cms
Feature: Setting Up PI XBlock
  As a course staff
  I should be able to update PI XBlock attributes
  I should be able to add image to question or remove image from question
  I should be able to add or remove options
  I should be able to add image to an option or remove image from an option
  I should be able to add or remove seeds

  @with_default_pi
  Scenario: Update XBlock Config
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I update the form with the following data:
      | field                | content               |
      | pi-display-name      | Peer Instruction Test |
      | pi-question-text     | This is my question   |
      | pi-option-0          | options 1             |
      | pi-option-1          | options 2             |
      | pi-option-2          | options 3             |
      | pi-correct-rationale | Correct rationale     |
    And I add seed(s) for option(s) "Option 1,Option 2,Option 3"
    And I click on "Save" button
    Then I should see xblock updated display name "Peer Instruction Test"
    And I should see xblock updated question text "This is my question"

  @with_default_pi
  @with_asset
  Scenario: Add Image to Question
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Add Image to Question" button
    And I fill in "/static/cat.jpg" in "Image URL"
    And I click on "Appears above" in "Image Position" dropdown
    And I fill in "image description" in "Image Description"
    And I add seed(s) for option(s) "Option 1,Option 2,Option 3"
    And I click on "Save" button
    Then I should be able to see the "Question Image"

  @with_default_pi_and_question_image
  @with_asset
  Scenario: Remove Image from Question
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Remove Image" button
    And I click on "Save" button
    Then I should not be able to see the "Question Image"

  @with_default_pi
  @with_asset
  Scenario: Add Image to Option
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Add Image to Option 1" button
    And I fill in "/static/cat.jpg" in "Option 1 Image URL"
    And I click on "Appears above" in "Option 1 Image Position" dropdown
    And I fill in "image description" in "Option 1 Image Description"
    And I add seed(s) for option(s) "Option 1,Option 2,Option 3"
    And I click on "Save" button
    Then I should be able to see the "Option 1 Image"

  @with_default_pi_and_option_image
  @with_asset
  Scenario: Remove Image from Option
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Remove Image" button
    And I click on "Save" button
    Then I should not be able to see the "Option 1 Image"

  @with_default_pi_with_seeds
  Scenario: Add Option
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Add Option" button
    And I fill in "This is option 4" in "Option 4 Text Input"
    And I add seed(s) for option(s) "Option 4"
    And I click on "Save" button
    Then I should be able to see the "Option 4 Radio Button"

  @with_default_pi_with_seeds
  Scenario: Remove Option
    Given I'm on "unit" page
    And I click on "EDIT" link in xblock action list
    When I click on "Remove" link for "Option 3"
    And I click on "Remove" link for "Seed 3"
    And I click on "Save" button
    Then I should not be able to see the "Option 3"
