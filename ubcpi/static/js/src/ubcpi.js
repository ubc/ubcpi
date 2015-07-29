angular.module('constants', []);

angular.module('UBCPI', ['constants', 'ngSanitize', 'ngCookies'])
    .config(function($httpProvider, urls) {
        //register an http interceptor to transform your template urls
        $httpProvider.interceptors.push(function () {
            return {
                'request': function (config) {
                    var url = config.url;
                    // if requesting a html, we assume it's a partial
                    if (url != undefined && url.match(/\.html$/)) {
                        config.url = urls.get_asset + '?f=' + config.url;
                    }
                    return config;
                }
            };
        });
    })

    .run(['$http', '$cookies', function ($http, $cookies) {
        // set up CSRF Token from cookie. This is needed by all post requests
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
    }])

    .directive('integer', function () {
        return {
            require: 'ngModel',
            link: function (scope, ele, attr, ctrl) {
                ctrl.$parsers.unshift(function (viewValue) {
                    return parseInt(viewValue, 10);
                });
            }
        };
    })

    .factory('backendService', ['$http', '$q', 'urls', function ($http, $q, urls) {
        return {
            getStats: getStats,
            submit: submit
        };

        function getStats() {
            var statsUrl = urls.get_stats;
            return $http.post(statsUrl, '""').then(
                function(response) {
                    return response.data;
                },
                function(error) {
                    return $q.reject(error);
                });
        }

        function submit(answer, rationale, status) {
            var submitUrl = urls.submit_answer;
            var submitData = JSON.stringify({
                "q": answer,
                "rationale": rationale,
                "status": status
            });
            return $http.post(submitUrl, submitData).then(
                function(response) {
                    return response.data;
                },
                function(error) {
                    return $q.reject(error);
                }
            );
        }
    }])

    .controller('ReviseController', [
        '$scope', 'notify', 'data', 'backendService', 'urls', '$q',
        function ($scope, notify, data, backendService, urls, $q) {
            var self = this;

            $scope.question_text = data.question_text;
            $scope.options = data.options;
            $scope.rationale_size = data.rationale_size;
            $scope.chartDataOriginal = [
                {
                    'key': 'Original',
                    'color': '#33A6DC',
                    'values': []
                }
            ];
            $scope.chartDataRevised = [
                {
                    'key': 'Revised',
                    'color': '#50C67B',
                    'values': []
                }
            ];

            // all status of the app. Passed it from backend so we have a synced status codes
            self.ALL_STATUS = data.all_status;

            self.answer = self.answer_revised || self.answer_original;
            self.rationale = self.rationale_revised || self.rationale_original;

            // Assign data based on what is submitted
            self = assignData(self, data);

            // By default, we're not submitting, this changes when someone presses the submit button
            self.submitting = false;

            self.urls = urls;

            /**
             * Determine if the submit button should be disabled
             * If we have an answer selected, a rationale that is large enough and we are not already submitting, we ENable
             * the submit button. For all other scenarios, we disable it.
             *
             * @since 1.0.0
             *
             * @return (int) the status as set by setDefaultStatuses based on the passed answers
             **/
            self.status = function () {
                if (typeof self.answer_original === 'undefined' || self.answer_original === null) {
                    return self.ALL_STATUS.NEW;
                } else if (typeof self.answer_revised === 'undefined' || self.answer_revised === null) {
                    return self.ALL_STATUS.ANSWERED;
                } else {
                    return self.ALL_STATUS.REVISED;
                }
            };

            self.clickSubmit = function () {
                notify('save', {state: 'start', message: "Submitting"});
                self.submitting = true;
                return backendService.submit(self.answer, self.rationale, self.status()).then(function(data) {
                    self.answer_original = data.answer_original;
                    self.rationale_original = data.rationale_original;
                    self.answer_revised = data.answer_revised;
                    self.rationale_revised = data.rationale_revised;
                    self.other_answers = data.other_answers;
                    self.correct_answer = data.correct_answer;
                    self.correct_rationale = data.correct_rationale;
                }, function(error) {
                    notify('error', {
                        'title': 'Error submitting answer!',
                        'message': 'Please refresh the page and try again!'
                    });
                    return $q.reject(error);
                }).finally(function() {
                    self.submitting = false;
                    notify('save', {state: 'end'});
                });
            };

            self.getStats = function () {
                return backendService.getStats().then(function(data) {
                    self.stats = data;
                }, function(error) {
                    notify('error', {
                        'title': 'Error retrieving statistics!',
                        'message': 'Please refresh the page and try again!'
                    });
                    return $q.reject(error);
                });
            };

            /**
             * Assign the data to be accessible within our XBlock
             */
            function assignData(self, data) {

                self.answer_original = data.answer_original;
                self.rationale_original = data.rationale_original;
                self.answer_revised = data.answer_revised;
                self.rationale_revised = data.rationale_revised;
                self.other_answers = data.other_answers;
                self.correct_answer = data.correct_answer;
                self.correct_rationale = data.correct_rationale;

                return self;
            }

        }]);

/**
 * Then entry point function for XBlock
 *
 * @param runtime xblock runtime
 * @param element root element of the xblock
 * @param data data passed from backend
 * @constructor
 */
function PeerInstructionXBlock(runtime, element, data) {

    "use strict";
    // The workbench doesn't support notifications.
    var notify = $.proxy(runtime.notify, runtime) || function () {};

    var urls = {
        'get_stats': runtime.handlerUrl(element, 'get_stats'),
        'submit_answer': runtime.handlerUrl(element, 'submit_answer'),
        'get_asset': runtime.handlerUrl(element, 'get_asset')
    };

    angular.module('constants').constant('urls', urls);
    // inject xblock runtime, notification and data
    angular.module('UBCPI').value('notify', notify).value('data', data);

    // bootstrap our app manually
    $(function () {
        angular.bootstrap(element, ['UBCPI'], {});
    });
}
