angular.module('UBCPI', ['ngSanitize', 'ngCookies', 'gettext'])
    .config(['$httpProvider', function($httpProvider) {
        // register an http interceptor to transform template urls. Because $rootScope
        // is not available in config phase, it can't be injected to config function. But
        // interceptors are evaluated at later stage. So we can use it as a dependency for
        // our interceptor.
        $httpProvider.interceptors.push(['$rootScope', function ($rootScope) {
            return {
                'request': function (config) {
                    var url = config.url;
                    // if requesting a html, we assume it's a partial
                    if (url != undefined && url.match(/\.html$/)) {
                        config.url = $rootScope.config.urls.get_asset + '?f=' + config.url;
                    }
                    return config;
                }
            };
        }]);
    }])

    .run(['$http', '$cookies', '$rootScope', '$rootElement', 'gettextCatalog', function ($http, $cookies, $rootScope, $rootElement, gettextCatalog) {
        // set up CSRF Token from cookie. This is needed by all post requests
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        // assign config to rootScope for easier access. All scopes inherit
        // rootScope and will have access to config as well.
        $rootScope.config = $rootElement[0].config;
        // config the language
        gettextCatalog.setCurrentLanguage($rootScope.config.data.lang);
    }])

    /**
    *  convert choice value (string) to integer for radio buttons
    */
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

    .directive('autoFocus', ['$timeout', function($timeout) {
        return {
            restrict: 'AC',
            link: function (_scope, _element) {
                $timeout(function () {
                    _element[0].focus();
                }, 0);
            }
        };
    }])

    .factory('backendService', ['$http', '$q', '$rootScope', function ($http, $q, $rootScope) {
        return {
            getStats: getStats,
            submit: submit,
            get_data: get_data,
        };

        function getStats() {
            var statsUrl = $rootScope.config.urls.get_stats;
            return $http.post(statsUrl, '""').then(
                function(response) {
                    return response.data;
                },
                function(error) {
                    return $q.reject(error);
                });
        }

        function submit(answer, rationale, status) {
            var submitUrl = $rootScope.config.urls.submit_answer;
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

        function get_data() {
            var dataUrl = $rootScope.config.urls.get_data;
            return $http.post(dataUrl, '""').then(
                function(response) {
                    return response.data;
                },
                function(error) {
                    return $q.reject(error);
                }
            );
        }
    }])

    .controller('ReviseController', ['$scope', 'notify', 'backendService', '$q', 'gettext', '$location', '$anchorScroll', '$timeout',
        function ($scope, notify, backendService, $q, gettext, $location, $anchorScroll, $timeout) {
            var self = this;
            var data = $scope.config.data;

            $scope.question_text = data.question_text;
            $scope.options = data.options;
            $scope.rationale_size = data.rationale_size;
            $scope.weight = data.weight;
            $scope.display_name = data.display_name;
            $scope.user_role = data.user_role;
            $scope.collapse = false;

            // all status of the app. Passed it from backend so we have a synced status codes
            self.ALL_STATUS = data.all_status;

            // Assign data based on what has been persisted
            var persistedDataObject = get_data().then( function(persistedData) {

                if ( persistedData.answer_original !== null ) {
                    assignData(self, data);
                }
            });


            // By default, we're not submitting, this changes when someone presses the submit button
            self.submitting = false;

            /**
             * Determine if the submit button should be disabled
             * If we have an answer selected, a rationale that is large
             * enough and we are not already submitting, we enable
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
                notify('save', {state: 'start', message: gettext("Submitting")});
                self.submitting = true;
                return backendService.submit(self.answer, self.rationale, self.status()).then(function(data) {
                    assignData(self, data);
                    $timeout(function() {
                        $location.hash('others-responses');
                        $anchorScroll();
                    });
                }, function(error) {
                    notify('error', {
                        'title': gettext('Error submitting answer!'),
                        'message': gettext('Please refresh the page and try again!')
                    });
                    return $q.reject(error);
                }).finally(function() {
                    self.submitting = false;
                    $timeout(function() {
                        if(self.status()==self.ALL_STATUS.ANSWERED)
                            $location.hash('reflecting');
                        else
                            $location.hash('finalReflecting');
                        $anchorScroll();
                    });
                    notify('save', {state: 'end'});
                });
            };

            self.jump = function () {
                $timeout(function() {
                    $location.hash('ubcpi-init-answer-heading');
                    $anchorScroll();
                });
            };

            self.jumpBelow = function () {
                $timeout(function() {
                    $location.hash('classbreakdown');
                    $anchorScroll();
                });
            };

            self.getStats = function () {
                return backendService.getStats().then(function(data) {
                    self.stats = data;
                }, function(error) {
                    notify('error', {
                        'title': gettext('Error retrieving statistics!'),
                        'message': gettext('Please refresh the page and try again!')
                    });
                    return $q.reject(error);
                });
            };

            self.calc = function(s) {
                var originalPercentage = gettext(" Initial Answer Selection: ");
                var revisedPercentage = gettext(" Final Answer Selection: ");
                if (typeof self.stats.original[s] !== 'undefined') {
                    var totalCounts = 0;
                    for (var i = 0; i < data.options.length; i++) {
                        if (typeof self.stats.original[i] !== 'undefined')
                            totalCounts += self.stats.original[i];
                    }
                    originalPercentage += self.stats.original[s] / totalCounts * 100 + "%";
                }
                else
                    originalPercentage += "0%";

                if (typeof self.stats.revised[s] !== 'undefined') {
                    var totalCounts = 0;
                    for (var i = 0; i < data.options.length; i++) {
                        if (typeof self.stats.revised[i] !== 'undefined')
                            totalCounts += self.stats.revised[i];
                    }
                    revisedPercentage += self.stats.revised[s] / totalCounts * 100 + "%";
                }
                else
                    revisedPercentage += "0%";

                return originalPercentage + " " + revisedPercentage;
            };

            function get_data() {
                return backendService.get_data().then(function(data) {
                    return data;
                }, function(error) {
                    notify('error', {
                        'title': gettext('Error retrieving data!'),
                        'message': gettext('Please refresh the page and try again!')
                    });
                    return $q.reject(error);
                });
            }

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
                self.answer = data.answer_revised || data.answer_original;
                self.rationale = data.rationale_revised || data.rationale_original;
                self.weight = data.weight;
                self.options = data.options;
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
    // wrap element as core.js may pass a raw element or an wrapped one
    var $element = $(element);
    // The workbench doesn't support notifications.
    var notify = $.proxy(runtime.notify, runtime) || function () {};

    var urls = {
        'get_stats': runtime.handlerUrl(element, 'get_stats'),
        'submit_answer': runtime.handlerUrl(element, 'submit_answer'),
        'get_asset': runtime.handlerUrl(element, 'get_asset'),
        'get_data': runtime.handlerUrl(element, 'get_data')
    };

    // in order to support multiple same apps on the same page but
    // under different elements, e.g. multiple xblocks on the same
    // page, the data and URLs have to be passed into scope. We can
    // not use angular constant or value because they are global and
    // can be override by the second app. They can be passed with element,
    // which is converted to a angular value as $rootElement and can
    // be injected as dependencies, through angular.bootstrap. Element
    // is unique for each app.
    $element[0].config = {
        'data': data,
        'urls': urls
    };

    // inject xblock notification
    angular.module('UBCPI').value('notify', notify);

    // bootstrap our app manually
    angular.bootstrap($element, ['UBCPI'], {strictDi: true});
}
