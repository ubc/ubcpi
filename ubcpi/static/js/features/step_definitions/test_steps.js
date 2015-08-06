var _ = require('lodash');
//http://chaijs.com/
var chai = require('chai');

//https://github.com/domenic/chai-as-promised/
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var expect = chai.expect;
var EC = protractor.ExpectedConditions;

var AutoAuthPage = require('../../page_objects/auto_auth.js');

var myStepDefinitionsWrapper = function () {

    this.Given(/^I'm on "([^"]*)" page$/, function (arg1, callback) {
        browser.get(getUrls(arg1, this.context));
        callback()
    });

    this.Given(/^a logged in "([^"]*)"$/, function (user, callback) {
        login(this.context[user].username, function () {
            browser.get('/');
            callback();
        });
    });

    this.When(/^I click on "([^"]*)" link$/, function (text, callback) {
        browser.wait(EC.visibilityOf(element(by.linkText(text))), 5000);
        element(by.linkText(text)).click();
        callback();
    });

    this.When(/^I click on "([^"]*)" link in xblock action list$/, function (text, callback) {
        var el = element(by.css('article.xblock-render ul.actions-list')).element(by.linkText(text));
        browser.wait(EC.visibilityOf(el), 10000);
        el.click();
        callback();
    });

    this.When(/^I update "([^"]*)" to "([^"]*)"$/, function (textField, text, callback) {
        var el = element(by.css('input[name=' + textField + ']'));
        browser.wait(EC.visibilityOf(el), 10000);
        el.clear();
        el.sendKeys(text);
        callback();
    });

    this.When(/^I click on "([^"]*)" button$/, function (arg1, callback) {
        var el = element(by.css('input[type=button][value="' + arg1 + '"], input[type=submit][value="' + arg1 + '"]'));
        browser.wait(EC.elementToBeClickable(el), 20000);
        el.click();
        callback();
    });

    this.When(/^I update the form with the following data:$/, function (table, callback) {
        var data = table.hashes();
        for (var i = 0; i < data.length; i++) {
            var el = element(by.css('#' + data[i].field));
            browser.wait(EC.visibilityOf(el), 10000);
            el.clear();
            el.sendKeys(data[i].content);
        }
        callback();
    });

    this.When(/^I fill in "([^"]*)" in "([^"]*)"$/, function (content, name, callback) {
        var el = element(locateElement(name));
        browser.wait(EC.visibilityOf(el), 10000);
        el.clear();
        el.sendKeys(content);
        callback();
    });

    this.When(/^I click on "([^"]*)" in "([^"]*)" dropdown$/, function (option, name, callback) {
        var el = element(locateElement(name));
        browser.wait(EC.visibilityOf(el), 10000);
        var optionElem = el.element(by.cssContainingText('option', option));
        optionElem.click();
        callback();
    });

    this.When(/^I click on "([^"]*)" link for "([^"]*)"$/, function (action, target, callback) {
        var el = element(locateElement(target));
        browser.wait(EC.visibilityOf(el), 10000);
        el.element(by.linkText(action)).click();
        callback();
    });

    this.When(/^I add seed\(s\) for option\(s\) "([^"]*)"$/, function (arg1, callback) {
        var options = arg1.split(',');
        options.forEach(function (option) {
            element(by.css('input[value="Add Seed"]')).click();
            element.all(by.css('.ubcpi-options-list-container select')).last()
                .element(by.cssContainingText('option', option)).click();
            element.all(by.css('.ubcpi-options-list-container textarea')).last().sendKeys('Rationale for ' + option);
        });
        callback();
    });

    this.When(/^I select option "([^"]*)"$/, function (text, callback) {
        element(by.cssContainingText('label.ubcpi-answer', text)).element(by.css('input')).click();
        callback();
    });

    this.Then(/^I should see "([^"]*)" link$/, function (arg1) {
        browser.wait(EC.visibilityOf(element(by.linkText(arg1))), 5000);
        return expect(element(by.linkText(arg1)).isDisplayed()).to.eventually.equal(true);
    });

    this.Then(/^I should see "([^"]*)" XBlock installed$/, function (arg1) {
        browser.wait(EC.visibilityOf(element(by.css("div[data-block-type=ubcpi]"))), 5000);
        return expect(element.all(by.css("div[data-block-type=ubcpi]")).count()).to.eventually.equal(1);
    });

    this.Then(/^I should see "([^"]*)" on the page$/, function (arg1) {
        return expect(element(by.css('body')).getText()).to.eventually.contain(arg1);
    });

    this.Then(/^I should see xblock updated display name "([^"]*)"$/, function (text) {
        var el = element(by.css("article.xblock-render .xblock-display-name"));
        browser.wait(EC.textToBePresentInElement(el, text), 10000);
        return expect(el.getText()).to.eventually.equal(text)
    });

    this.Then(/^I should see xblock updated question text "([^"]*)"$/, function (text) {
        var el = element(by.css('#question-text'));
        browser.wait(EC.textToBePresentInElement(el, text), 10000);
        return expect(el.getText()).to.eventually.equal(text)
    });

    this.Then(/^I should be able to see the "([^"]*)"$/, function (name) {
        var el = element(locateElement(name));
        browser.wait(EC.visibilityOf(el), 10000);
        return expect(el.isDisplayed()).to.eventually.be.true;
    });

    this.Then(/^I should not be able to see the "([^"]*)"$/, function (name) {
        var el = element(locateElement(name));
        browser.wait(EC.invisibilityOf(el), 10000);
        return expect(el.isPresent()).to.eventually.be.false;
    });

    this.Then(/^I should see "([^"]*)" in "([^"]*)" section$/, function (text, name) {
        var el = element(locateElement(name));
        browser.wait(EC.visibilityOf(el), 10000);
        return expect(el.getText()).to.eventually.contain(text);
    });
};

function login(username, callback) {
    var auto_auth = new AutoAuthPage(username);
    auto_auth.get().getUser().then(function () {
        callback();
    });
}

function getUrls(key, context) {
    var urls = {
        'unit': '/container/' + context.unit.id,
        'subsection': context.course.url,
        'section': context.course.url,
        'courseware': '/courses/' + context.course.course_key + '/courseware/' +
            _.last(context.section.id.split('/')) + '/' + _.last(context.subsection.id.split('/'))
    };

    return urls[key];
}

function locateElement(element) {
    var mapping = {
        'Image URL': by.css('#question-text-image-url'),
        'Image Position': by.css('#question-text-image-position'),
        'Image Description': by.css('#question-text-image-alt'),
        'Option 1 Image URL': by.css('#question-text-image-url-0'),
        'Option 1 Image Position': by.css('#question-text-image-position-0'),
        'Option 1 Image Description': by.css('#question-text-image-alt-0'),
        'Option 1 Image': by.css('#original-option-image-0'),
        'Option 2 Image': by.css('#original-option-image-1'),
        'Option 3 Image': by.css('#original-option-image-2'),
        'Option 4 Text Input': by.css('#pi-option-3'),
        'Option 4 Radio Button': by.css('#original-option-input-3'),
    };

    if (element in mapping) {
        return mapping[element];
    }

    // convert to id search
    return by.css('#' + element.toLowerCase().replace(' ', '-'));
}


module.exports = myStepDefinitionsWrapper;