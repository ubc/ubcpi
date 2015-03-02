/* Javascript for PeerInstructionXBlock. */

var generatePIXBlockId;
if (typeof generatePIXBlockId !== "function") {
    generatePIXBlockId = (function () {
        "use strict";
        var id = 0;
        return function () {
            return "ubcpi_" + (id += 1);
        }
    }());
}

function PeerInstructionXBlock(runtime, element, data) {
    "use strict";

    var handlerUrl = runtime.handlerUrl(element, 'submit_answer');

    $(function ($) {
        var appId = generatePIXBlockId();
        var app = angular.module(appId, []);
        app.run(function($http) {
            // set up CSRF Token from cookie. This is needed by all post requests
            $http.defaults.headers.post['X-CSRFToken'] = $.cookie('csrftoken');
        });
        app.controller('ReviseController', function ($scope, $http) {
            var self = this;

            $scope.appId = appId;
            $scope.question_text = data.question_text;
            $scope.options = data.options;

            self.answer = data.answer;
            self.submitting = false;

            self.views = [data.views.question];

            self.disableSubmit = function () {
                var haveAnswer = typeof self.answer !== "undefined" && self.answer !== null;
                var enable = haveAnswer && !self.submitting;
                return !enable;
            };

            self.clickSubmit = function ($event) {
                runtime.notify('save', {state: 'start', message: "Submitting"});
                self.submitting = true;

                $http.post(handlerUrl, JSON.stringify({"q": self.answer})).
                    success(function(data, status, header, config) {
                        console.log("Okay, got back", data);
                        self.submitting = false;
                        runtime.notify('save', {state: 'end'})
                    }).
                    error(function(data, status, header, config) {
                        runtime.notify('error', {
                            'title': 'Error submitting answer!',
                            'message': self.format_errors(data['errors'])
                        });
                    });
            };
        });
        angular.bootstrap(element, [appId]);
    });
}
