var req = require('request');
var fs = require('fs');
var _ = require('lodash');
var querystring = require('querystring');

var Api = function () {
    this.baseUrls = {
        'lms': undefined,
        'cms': undefined
    };
    this.users = {
        'lms': undefined,
        'cms': undefined
    };
    this.headers = {
        'lms': undefined,
        'cms': undefined
    };
    this.requests = {
        'lms': undefined,
        'cms': undefined
    };
    this.jars = {
        'lms': req.jar(),
        'cms': req.jar()
    };
};

Api.prototype.createUserOrLogin = function (username, target, course_id, callback) {
    var self = this;
    var query = {};
    if (username) {
        query.username = username;
    }
    if (course_id) {
        query.course_id = course_id;
    }
    var requestParams = querystring.stringify(query);
    var url = this.baseUrls[target] + '/auto_auth';
    if (requestParams) {
       url += '?' + requestParams;
    }

    req({url: url, jar: this.jars[target]},
        function (error, response, body) {
            if (error) {
                callback(error);
            }

            // set up headers to use CSRF token
            self.headers[target] = {
                'Content-type': 'application/json',
                'Accept': 'application/json',
                'X-CSRFToken': self.getCookie(target, 'csrftoken').value
            };
            // set up default for subsequent calls
            self.requests[target] = req.defaults({
                jar: self.jars[target],
                baseUrl: self.baseUrls[target],
                headers: self.headers[target],
                json: true
            });

            // parse the response
            var userInfo = body.match(/Logged in user (.+) \((.+)\) with password (.+) and user_id (.+)/);
            self.users[target] = {
                username: userInfo[1],
                email: userInfo[2],
                password: userInfo[3],
                id: userInfo[4]
            };
            //console.log(target + ': ' + body);
            callback(null, self.users[target]);
        }
    );
};

Api.prototype.createCourse = function (course, callback) {
    var self = this;
    course = (course || {
        'org': 'UBC',
        'number': 'PI_TEST_' + self.users['cms'].username,
        'run': 'NOW',
        'display_name': 'PI Test for User ' + self.users['cms'].username
    });

    this.requests['cms'].post({url: '/course/', body: course}, function (err, response, body) {
        handleResponse(err, response, body, callback);
    });
};

Api.prototype.configureCourse = function (courseKey, data, callback) {
    var self = this;
    var url = '/settings/details/' + courseKey;
    // retrieve the settings first
    this.requests['cms'].get(url, function (err, response, body) {
        handleResponse(err, response, body, function (err, details) {
            if (err) {
                callback(err);
            }

            // merge with the new settings
            details = _.merge(details, data);
            self.requests['cms'].post({url: url, body: details}, function (err, response, body) {
                handleResponse(err, response, body, callback);
            })
        })
    })
};

Api.prototype.updateAdvancedSettings = function (courseKey, settings, callback) {
    this.requests['cms'].post(
        {url: '/settings/advanced/' + courseKey, body: settings},
        function (err, response, body) {
            handleResponse(err, response, body, callback);
        }
    );
};

Api.prototype.createXblock = function (parentLoc, xblockDesc, callback) {
    var self = this;
    var createPayload = {
        'category': xblockDesc.category,
        'display_name': xblockDesc.display_name
    };

    if (parentLoc) {
        createPayload['parent_locator'] = parentLoc;
    }

    this.requests['cms'].post({url: '/xblock/', body: createPayload}, function (err, response, body) {
        if (err) {
            callback(err)
        } else if (body.hasOwnProperty('ErrMsg')) {
            callback(body.ErrMsg);
        } else if (response.statusCode != 200) {
            callback("statusCode == " + response.statusCode + "\n" + body);
        } else {
            var loc = body.locator;
            xblockDesc.locator = loc;
            self.requests['cms'].post({
                url: '/xblock/' + encodeURIComponent(loc),
                body: xblockDesc
            }, function (err, response, body) {
                handleResponse(err, response, body, callback);
            })
        }
    });
};

Api.prototype.updateXblock = function (locator, data, callback) {
    this.requests['cms'].put({url: '/xblock/' + encodeURIComponent(locator), body: data},
        function (err, response, body) {
            handleResponse(err, response, body, callback);
        }
    )
};

Api.prototype.uploadAsset = function (asset, courseKey, callback) {
    var formData = {
        file: fs.createReadStream(asset)
    };
    this.requests['cms'].post({url: '/assets/' + courseKey + '/', formData: formData}, function (err, response, body) {
        handleResponse(err, response, body, callback);
    })
};

Api.prototype.updatePI = function (xblockKey, data, callback) {
    this.requests['cms'].post({
        url: '/xblock/' + encodeURIComponent(xblockKey) + '/handler/studio_submit',
        body: data
    }, function (err, response, body) {
        handleResponse(err, response, body, callback);
    })
};

Api.prototype.enrolUsers = function (courseKey, users, callback) {
    var data = {
        action: 'enroll',
        identifiers: users.join(),
        auto_enroll: true,
        email_students: false
    };
    this.requests['lms'].post({
        url: '/courses/' + courseKey + '/instructor/api/students_update_enrollment',
        form: data,
        jar: this.jars['cms'],
        headers: this.headers['cms']
    }, function (err, response, body) {
        handleResponse(err, response, body, callback);
    });
};

Api.prototype.piSubmitAnswer = function (courseKey, xblockKey, data, callback) {
    this.requests['lms'].post({
        url: '/courses/' + courseKey + '/xblock/' + xblockKey.replace(/\//g, ';_') + '/handler/submit_answer',
        body: data
    }, function (err, response, body) {
        handleResponse(err, response, body, callback);
    });
};

Api.prototype.getCookie = function (target, key) {
    var cookies = this.jars[target].getCookies(this.baseUrls[target]);
    for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].key == key) {
            return cookies[i];
        }
    }

    return undefined;
};

function handleResponse(error, response, body, callback) {
    if (error) {
        callback(error)
    } else if (body.hasOwnProperty('ErrMsg')) {
        callback(body.ErrMsg);
    } else if (response.statusCode != 200) {
        callback("statusCode == " + response.statusCode + "\n" + body);
    } else {
        callback(null, body);
    }
}


module.exports = new Api;
