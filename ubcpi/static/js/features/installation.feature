@cms
Feature: Installing PI XBlock
  As a course staff
  I should be able to add PI XBlock
  to a unit page

  Background:
    Given a logged in "staff"

  Scenario: Checking PI tool installed
    Given I'm on "unit" page
    When I click on "Advanced" button on "Add New Component" section
    Then I should see "Peer Instruction" button

  Scenario: Adding PI tool
    Given I'm on "unit" page
    When I click on "Advanced" button on "Add New Component" section
    And I click on "Peer Instruction" button on "Add New XBlock" section
    Then I should see "Peer Instruction" XBlock installed
