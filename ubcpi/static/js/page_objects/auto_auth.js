/**
 * Auto-auth page (used to automatically log in during testing). Based on auth_auth.py in edx-platform
 *
 * Auto-auth is an end-point for HTTP GET requests.
 * By default, it will create accounts with random user credentials,
 * but you can also specify credentials using querystring parameters.
 *`username`, `email`, and `password` are the user's credentials (strings)
 * `staff` is a boolean indicating whether the user is global staff.
 * `course_id` is the ID of the course to enroll the student in.
 * Currently, this has the form "org/number/run"
 * Note that "global staff" is NOT the same as course staff.

 * @param username
 * @param email
 * @param password
 * @param staff
 * @param course_id
 * @param roles
 * @constructor
 */
var AutoAuthPage = function (username, email, password, staff, course_id, roles, no_login) {
    var userId;
    var _params = [];
    if (username != undefined) {
        _params.push('username=' + encodeURIComponent(username));
    }
    if (email != undefined) {
        _params.push('email=' + encodeURIComponent(email));
    }
    if (password != undefined) {
        _params.push('password=' + encodeURIComponent(password));
    }
    if (staff != undefined) {
        _params.push('staff=' + encodeURIComponent(staff));
    }
    if (course_id != undefined) {
        _params.push('course_id=' + encodeURIComponent(course_id));
    }
    if (roles != undefined) {
        _params.push('roles=' + encodeURIComponent(roles));
    }
    if (no_login != undefined) {
        _params.push('no_login=true');
    }

    //var body = element(by.cssContainingText('.BODY', 'Logged in user'));
    var body = element(By.tagName("body"));
    this.get = function () {
        var params = '';
        if (_params.length != 0) {
            params = '?' + _params.join('&');
        }
        browser.get('/auto_auth' + params);

        return this;
    };

    this.getUsername = function () {
        return body.getText().then(function(text) {
            var usernameText = text.match(/Logged in user (.+) /);
            return usernameText[1];
        });
    };

    this.getUserId = function () {
        return body.getText().then(function(text) {
            var userIdText = text.match(/user_id (.+)/);
            userId = parseInt(userIdText[1]);
            return userId;
        });
    };

    this.getUser = function () {
        return body.getText().then(function(text) {
            var userInfo = text.match(/Logged in user (.+) \((.+)\) with password (.+) and user_id (.+)/);
            var user = {
                username: userInfo[1],
                email: userInfo[2],
                password: userInfo[3],
                id: userInfo[4]
            };
            return user;
        });
    };
};

module.exports = AutoAuthPage;