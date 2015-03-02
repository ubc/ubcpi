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

            self.STATUS_NEW      = 0;
            self.STATUS_ANSWERED = 1;
            self.STATUS_REVISED  = 2;

            self.answer_original = data.answer_original;
            self.answer_revised = data.answer_revised;
            self.answer = self.answer_revised || self.answer_original;
            self.submitting = false;

            self.views = [data.views.question];

            function getStatus(answer_original, answer_revised) {
                if (typeof answer_original === 'undefined' || answer_original === null) {
                    return self.STATUS_NEW;
                } else if (typeof answer_revised === 'undefined' || answer_revised === null) {
                    return self.STATUS_ANSWERED;
                } else {
                    return self.STATUS_REVISED;
                }
            }

            self.status = function() {
                return getStatus(self.answer_original, self.answer_revised);
            };

            self.disableSubmit = function () {
                var haveAnswer = typeof self.answer !== "undefined" && self.answer !== null;
                var enable = haveAnswer && !self.submitting;
                return !enable;
            };

            self.clickSubmit = function ($event) {
                runtime.notify('save', {state: 'start', message: "Submitting"});
                self.submitting = true;

                $http.post(handlerUrl, JSON.stringify({"q": self.answer, "status": self.status()})).
                    success(function(data, status, header, config) {
                        console.log("Okay, got back", data);
                        self.submitting = false;
                        self.answer_original = data.answer_original;
                        self.answer_revised = data.answer_revised;
                        runtime.notify('save', {state: 'end'})
                    }).
                    error(function(data, status, header, config) {
                        runtime.notify('error', {
                            'title': 'Error submitting answer!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

        });
        angular.bootstrap(element, [appId]);
    });
}
