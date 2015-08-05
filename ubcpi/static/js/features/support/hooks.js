var async = require('async');
var _ = require('lodash');
var path = require('path');
var api = require('./api.js');
var defaultPiData = require('./default_pi.json');


var beforeFeatureCms = function () {

    var default_pi = ['unit', function (cb, results) {
        api.createXblock(results.unit.id, {category: 'ubcpi'}, cb);
    }];

    var tasks = {};
    var data = _.cloneDeep(defaultPiData);
    var updatePIData = false;

    this.Before('@cms', function (callback) {
        browser.baseUrl = browser.params.cmsUrl;
        api.baseUrls = {
            'cms': browser.params.cmsUrl,
            'lms': browser.params.lmsUrl
        };
        // mock context
        //world.context = {
        //    staff: {username: 'e23eeaa9f1fb4c099f750719b7adad'},
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

    this.Before('@with_seeds', function (callback) {
        updatePIData = true;
        callback();
    });

    this.Before('@with_option1_image', function (callback) {
        data.options[0] = _.merge(data.options[0], {
            "show_image_fields": 1,
            "image_url": "/static/cat.jpg",
            "image_position": "below",
            "image_alt": ""
        });
        updatePIData = true;
        callback();
    });

    this.Before('@with_question_image', function (callback) {
        data.question_text = _.merge(data.question_text, {
            "show_image_fields": 1,
            "image_url": "/static/cat.jpg",
            "image_position": "below",
            "image_alt": ""
        });
        updatePIData = true;
        callback();
    });

    this.Before('@with_asset', function (callback) {
        tasks.cat_asset = ['course', function (cb, results) {
            api.uploadAsset(__dirname + '/cat.jpg', results.course.course_key, cb);
        }];
        callback();
    });

    this.Before('@lms', function (callback) {
        browser.baseUrl = browser.params.cmsUrl;
        api.baseUrls = {
            'cms': browser.params.cmsUrl,
            'lms': browser.params.lmsUrl
        };
        callback();
    });

    this.Before(function (callback) {
        var world = this;
        browser.ignoreSynchronization = true;
        if (updatePIData) {
            tasks.default_pi = default_pi;
            tasks.update_pi = ['default_pi', function (cb, results) {
                api.updatePI(results.default_pi.id, data, cb);
            }]
        }
        async.auto(tasks, function (err, results) {
            if (err) {
                callback(err, results);
            }
            // save all results to world so that we can refer to them later in the tests
            world.context = _.merge(results, {'tasks': tasks, 'data': data, 'updatePIData': updatePIData});
            callback(null, results);
        });
    });

    this.After(function (callback) {
        // clean up tasks and flags
        tasks = {};
        data = _.cloneDeep(defaultPiData);
        updatePIData = false;
        callback();
    });

    function prepareCourse() {
        tasks.staff = function (cb) {
            api.createUserOrLogin(null, 'cms', cb);
        };
        tasks.course = ['staff', function (cb) {
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
};

module.exports = beforeFeatureCms;
