var async = require('async');
var _ = require('lodash');
var path = require('path');
var api = require('./api.js');
var defaultPiData = require('./default_pi.json');


var beforeFeatureCms = function () {
    var world;

    var default_pi = ['unit', function (cb, results) {
        api.createXblock(results.unit.id, {category: 'ubcpi'}, cb);
    }];

    var publish = function (cb, results) {
        api.updateXblock(results.unit.id, {publish: 'make_public'}, cb);
    };

    var tasks = {};
    var data = _.cloneDeep(defaultPiData);
    var updatePIData = false;

    this.Before('@cms', function (callback) {
        browser.baseUrl = browser.params.cmsUrl;
        api.baseUrls = {
            'cms': browser.params.cmsUrl,
            'lms': browser.params.lmsUrl
        };
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
            "image_show_fields": 1,
            "image_url": "/static/cat.jpg",
            "image_position": "below",
            "image_alt": ""
        });
        updatePIData = true;
        callback();
    });

    this.Before('@with_question_image', function (callback) {
        data.question_text = _.merge(data.question_text, {
            "image_show_fields": 1,
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

    this.Before('@with_published', function (callback) {
        tasks.publish = ['default_pi', publish];
        callback();
    });

    this.Before('@lms', function (callback) {
        browser.baseUrl = browser.params.lmsUrl;
        api.baseUrls = {
            'cms': browser.params.cmsUrl,
            'lms': browser.params.lmsUrl
        };
        prepareCourse();
        callback();
    });

    this.Before('@with_enrolled_student', function (callback) {
        tasks.student = function (cb) {
            api.createUserOrLogin(null, 'lms', null, cb);
        };
        tasks.enroll = ['student', 'course', function (cb, results) {
            api.enrolUsers(results.course.course_key, [results.student.username], cb);
        }];
        callback();
    });

    this.Before('@with_original_answer', function (callback) {
        tasks.original_answer = ['publish', 'enroll', function (cb, results) {
            api.piSubmitAnswer(
                results.course.course_key, results.default_pi.id, {"q": 0, "rationale": "test", "status": 0}, cb
            );
        }];
        callback()
    });

    this.Before(function (scenario, callback) {
        world = this;
        browser.ignoreSynchronization = true;
        if (updatePIData) {
            tasks.default_pi = default_pi;
            tasks.update_pi = ['default_pi', function (cb, results) {
                api.updatePI(results.default_pi.id, data, cb);
            }];
            // if we have @with_published tag, we need to change publish dependency from default_pi to update_pi
            // as after xblock is updated, it has to be published again.
            scenario.getTags().forEach(function (tag) {
                if (tag.getName() == '@with_published') {
                    tasks.publish = ['update_pi', publish]
                }
            })
        }
        async.auto(tasks, function (err, results) {
            if (err) {
                callback(err, results);
            }
            // find PI xblock element and modal dialog for edit element so that they can be used
            // as root element in steps. This will help with tests that have more than one PI xblock
            // or avoid naming conflict.
            var piElement, piEditElement;
            world.element = element;
            if ('default_pi' in results) {
                piElement = element(
                    by.css('li[data-locator="{}"],[data-id="{}"]'.replace('{}', results.default_pi.id))
                ).element;
                piEditElement = element(by.css('div.modal-window')).element;
                world.element = piElement.bind(element);
            }
            // save all results to world so that we can refer to them later in the tests
            world.context = _.merge(results,
                {'tasks': tasks, 'data': data, 'updatePIData': updatePIData,
                    piElement: piElement, piEditElement: piEditElement}
            );
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

    this.AfterStep(function(event, callback) {
        // we are trying to make a context aware world.element
        // when the edit modal dialog opens, we limit the search range within the modal dialog
        // otherwise, we only search within our xblock
        if (event.getPayloadItem('step').getName() == 'I click on "EDIT" link in xblock action list') {
            // open edit modal dialog, so we switch to the dialog as root element
            world.element = world.context.piEditElement.bind(element);
        } else if (event.getPayloadItem('step').getName() == 'I click on "Save" button') {
            // closed dialog, switch back
            world.element = world.context.piElement.bind(element);
        }
        callback();
    });

    function prepareCourse() {
        tasks.staff = function (cb) {
            api.createUserOrLogin(null, 'cms', null, cb);
        };
        tasks.course = ['staff', function (cb) {
            api.createCourse(null, cb);
        }];
        tasks.course_config = ['course', function (cb, results) {
            api.configureCourse(results.course.course_key,
                {start_date: '2015-01-01T00:00:00.000Z', end_date: '2099-01-01T00:00:00.000Z'}, cb);
        }];
        // in theory course_config and advanced_settings should be able to run in parallel, but it seems edx
        // has some concurrency problem. If they are run in parallel, start_data and end_data are not saved.
        tasks.advanced_settings = ['course_config', function (cb, results) {
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
