@cms
Feature: Installing PI XBlock
  As a course staff
  I should be able to add PI XBlock
  to a unit page

  Scenario: Checking PI tool installed
    Given I'm on "unit" page
    When I click on "Advanced" link
    Then I should see "Peer Instruction" link

  Scenario: Adding PI tool
    Given I'm on "unit" page
    When I click on "Advanced" link
    And I click on "Peer Instruction" link
    Then I should see "Peer Instruction" XBlock installed
