var async = require('async');
var _ = require('lodash');
var path = require('path');
var api = require('./api.js');
var defaultPiData = require('./default_pi.json');
var AutoAuthPage = require('../../page_objects/auto_auth.js');

var tasks = {};

var beforeFeatureCms = function () {

    var default_pi = ['unit', function (cb, results) {
        api.createXblock(results.unit.id, {category: 'ubcpi'}, cb);
    }];

    this.Before('@cms', function (callback) {
        browser.baseUrl = api.baseUrl = 'http://127.0.0.1:8001';
        // mock context
        //world.context = {
        //    login: {username: 'e23eeaa9f1fb4c099f750719b7adad'},
        //    course: {
        //        course_key: 'UBC/PI_Test_e23eeaa9f1fb4c099f750719b7adad/NOW',
        //        url: '/course/UBC/PI_TEST_e23eeaa9f1fb4c099f750719b7adad/NOW'
        //    },
        //    unit: {
        //        id: 'i4x://UBC/PI_TEST_e23eeaa9f1fb4c099f750719b7adad/vertical/273ec328681f47f7a3fd2e621be0d315'
        //    }
        //};
        prepareCourse();
        callback();
    });

    this.Before('@with_default_pi', function (callback) {
        tasks.default_pi = default_pi;
        callback();
    });

    this.Before('@with_default_pi_with_seeds', function (callback) {
        tasks.default_pi = default_pi;
        tasks.default_pi_with_seeds = ['default_pi', function (cb, results) {
            api.updatePI(results.default_pi.id, defaultPiData, cb);
        }];
        callback();
    });

    this.Before('@with_default_pi_and_option_image', function (callback) {
        tasks.default_pi = default_pi;
        var data = _.cloneDeep(defaultPiData);
        data.options[0] = {
            "text": "21",
            "show_image_fields": 1,
            "image_url": "/static/cat.jpg",
            "image_position": "below",
            "image_alt": ""
        };
        tasks.option_image = ['default_pi', function (cb, results) {
            api.updatePI(results.default_pi.id, data, cb);
        }];
        callback();
    });

    this.Before('@with_default_pi_and_question_image', function (callback) {
        tasks.default_pi = default_pi;
        var data = _.cloneDeep(defaultPiData);
        data.question_text = {
            "text": 'Question',
            "show_image_fields": 1,
            "image_url": "/static/cat.jpg",
            "image_position": "below",
            "image_alt": ""
        };
        tasks.question_image = ['default_pi', function (cb, results) {
            api.updatePI(results.default_pi.id, data, cb);
        }];
        callback();
    });

    this.Before('@with_asset', function (callback) {
        tasks.cat_asset = ['course', function (cb, results) {
            api.uploadAsset(__dirname + '/cat.jpg', results.course.course_key, cb);
        }];
        callback();
    });

    this.Before(function (callback) {
        var world = this;
        browser.ignoreSynchronization = true;
        async.auto(tasks, function (err, results) {
            if (err) {
                callback(err, results);
            }
            // save all results to world so that we can refer to them later in the tests
            world.context = results;
            login(results.login.username, function () {
                browser.get('/home');
                callback();
            });
        });
    });

    this.Before('@lms', function (event, callback) {
        var world = this;
        browser.baseUrl = api.baseUrl = 'http://127.0.0.1:8000';
        browser.ignoreSynchronization = true;
        prepareCourse(this, function () {
            login(world.context.login.username, callback);
        })
    });

    function prepareCourse() {
        tasks.login = function (cb) {
            api.createUserOrLogin(null, cb);
        };
        tasks.course = ['login', function (cb) {
            api.createCourse(null, cb);
        }];
        tasks.advanced_settings = ['course', function (cb, results) {
            api.updateAdvancedSettings(results.course.course_key, {advanced_modules: {value: ['ubcpi']}}, cb);
        }];
        // in theory we can run update settings and create section in parallel. However, it seems
        // there is a bug in edx where when running them in parallel, and then go to course outline
        // page in browser, no section is created. If we go to advanced settings page first in browser
        // then go to outline page, new section is there. So we run them in serial for now
        tasks.section = ['advanced_settings', function (cb, results) {
            api.createXblock(getCourseLocation(results.course.course_key), {
                category: 'chapter',
                display_name: 'Section'
            }, cb);
        }];
        tasks.subsection = ['section', function (cb, results) {
            api.createXblock(results.section.id, {category: 'sequential', display_name: 'Subsection'}, cb);
        }];
        tasks.unit = ['subsection', function (cb, results) {
            api.createXblock(results.subsection.id, {category: 'vertical', display_name: 'PI Test'}, cb);
        }];
    }

    function getCourseLocation(courseKey) {
        return 'i4x://' + courseKey.replace('NOW', 'course/NOW');
    }

    function login(username, callback) {
        var auto_auth = new AutoAuthPage(username);
        auto_auth.get().getUser().then(function () {
            callback();
        });
    }

    //this.After(function (callback) {
    //    // Release control:
    //    callback();
    //});

};

module.exports = beforeFeatureCms;
