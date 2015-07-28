angular.module('constants', []);

angular.module('UBCPI', ['constants', 'nvd3ChartDirectives', 'ngSanitize'])
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

    .run(['$http', function ($http) {
        // set up CSRF Token from cookie. This is needed by all post requests
        $http.defaults.headers.post['X-CSRFToken'] = $.cookie('csrftoken');
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

    .factory('backendService', ['$http', '$q', 'urls', 'notify', function backendService($http, $q, urls, notify) {
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
                    notify('error', {
                        'title': 'Error retrieving statistics!',
                        'message': 'Please refresh the page and try again!'
                    });
                    // TODO: add more details about the error
                    return $q.reject('error');
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
                    notify('error', {
                        'title': 'Error submitting answer!',
                        'message': 'Please refresh the page and try again!'
                    });
                    // TODO: add more details about the error
                    return $q.reject('error');
                }
            );
        }
    }])

    .factory('chart', function chart() {
        return {
            createChart: createChart
        };

        function createChart(data, containerSelector) {
            var chartLayout = d3.custom.barChart();

            d3.select(containerSelector)
                .datum(data)
                .call(chartLayout)
        }
    })

    .controller('ReviseController', [
        '$scope', 'notify', 'data', 'backendService', 'chart', 'urls',
        function ($scope, notify, data, backendService, chart, urls) {
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
                    self.submitting = false;
                    self.answer_original = data.answer_original;
                    self.rationale_original = data.rationale_original;
                    self.answer_revised = data.answer_revised;
                    self.rationale_revised = data.rationale_revised;
                    self.other_answers = data.other_answers;
                    self.correct_answer = data.correct_answer;
                    self.correct_rationale = data.correct_rationale;
                    notify('save', {state: 'end'});
                })
            };

            self.createChart = function (data, containerSelector) {
                chart.createChart(data, containerSelector);
            };

            self.getStats = function () {
                return backendService.getStats().then(function(data) {
                    self.stats = data;
                    $scope.chartDataOriginal[0].values = [];
                    $scope.chartDataOriginal[0].data = [];
                    $scope.chartDataOriginal[0].originalData = [];
                    $scope.chartDataRevised[0].values = [];
                    $scope.chartDataRevised[0].revisedData = [];
                    for (var i = 0; i < $scope.options.length; i++) {
                        var count = 0;
                        if (i in data.original) {
                            count = data.original[i];
                        }
                        $scope.chartDataOriginal[0].values.push([$scope.options[i], count]);
                        $scope.chartDataOriginal[0].data.push({name: $scope.options[i], value: count});
                        $scope.chartDataOriginal[0].originalData.push([$scope.options[i], count]);

                        count = 0;
                        if (i in data.revised) {
                            count = data.revised[i];
                        }
                        $scope.chartDataRevised[0].values.push([$scope.options[i], count]);
                        $scope.chartDataRevised[0].revisedData.push([$scope.options[i], count]);
                    }

                    self.createChart($scope.chartDataOriginal[0].originalData, '#original-bar-chart');
                    self.createChart($scope.chartDataRevised[0].revisedData, '#revised-bar-chart');
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
    var notify = $.proxy(runtime.notify, runtime) || function () {
    };

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
