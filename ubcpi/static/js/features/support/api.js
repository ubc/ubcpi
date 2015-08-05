var req = require('request');
var fs = require('fs');

var Api = function () {
    this.baseUrl = undefined;
    this.username = undefined;
    this.headers = undefined;
    this.request = undefined;
};

Api.prototype.createUserOrLogin = function (username, callback) {
    var self = this;
    if (username) {
        username = '?username=' + username;
    } else {
        username = '';
    }
    var j = req.jar();
    req({url: this.baseUrl + '/auto_auth' + username, jar: j}, function (error, response, body) {
        if (error) {
            callback(error);
        }

        // set up headers to use CSRF token
        self.headers = {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': getCookie(j, 'csrftoken').value
        };
        // set up default for subsequent calls
        self.request = req.defaults({jar: j, baseUrl: self.baseUrl, headers: self.headers, json: true});
        // parse the response
        var userInfo = body.match(/Logged in user (.+) \((.+)\) with password (.+) and user_id (.+)/);
        self.user = {
            username: userInfo[1],
            email: userInfo[2],
            password: userInfo[3],
            id: userInfo[4]
        };
        console.log(body);
        callback(null, self.user);
    });
};

Api.prototype.createCourse = function (course, callback) {
    var self = this;
    course = (course || {
        'org': 'UBC',
        'number': 'PI_TEST_' + self.user.username,
        'run': 'NOW',
        'display_name': 'PI Test for User ' + self.user.username
    });

    this.request.post({url: '/course/', body: course}, function (err, response, body) {
        handleResponse(err, response, body, callback);
    });
};

Api.prototype.updateAdvancedSettings = function (courseKey, settings, callback) {
    this.request.post(
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

    this.request.post({url: '/xblock/', body: createPayload}, function(err, response, body) {
        if (err) {
            callback(err)
        } else if (body.hasOwnProperty('ErrMsg')) {
            callback(body.ErrMsg);
        } else if (response.statusCode != 200) {
            callback("statusCode == " + response.statusCode + "\n" + body);
        } else {
            var loc = body.locator;
            xblockDesc.locator = loc;
            self.request.post({url: '/xblock/' + encodeURIComponent(loc), body: xblockDesc}, function (err, response, body) {
                handleResponse(err, response, body, callback);
            })
        }
    });
};

Api.prototype.uploadAsset = function(asset, courseKey, callback) {
    var formData = {
        file: fs.createReadStream(asset)
    };
    this.request.post({url: '/assets/' + courseKey + '/', formData: formData},  function (err, response, body) {
        handleResponse(err, response, body, callback);
    })
};

Api.prototype.updatePI = function(xblockKey, data, callback) {
    this.request.post({url: '/xblock/' + encodeURIComponent(xblockKey) + '/handler/studio_submit', body: data}, function(err, response, body) {
        handleResponse(err, response, body, callback);
    })
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

function getCookie(jar, key) {
    var cookies = jar.getCookies('http://127.0.0.1/');
    for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].key == key) {
            return cookies[i];
        }
    }

    return undefined;
}


module.exports = new Api;