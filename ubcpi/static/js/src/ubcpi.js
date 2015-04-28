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
    var notify;

    // The workbench doesn't support notifications.
    notify = $.proxy(runtime.notify, runtime) || function(){};

    $(function ($) {
        var appId = generatePIXBlockId();
        var app = angular.module(appId, ['nvd3ChartDirectives']);
        app.run(function($http) {
            // set up CSRF Token from cookie. This is needed by all post requests
            $http.defaults.headers.post['X-CSRFToken'] = $.cookie('csrftoken');
        });

        app.directive('integer', function(){
            return {
                require: 'ngModel',
                link: function(scope, ele, attr, ctrl){
                    ctrl.$parsers.unshift(function(viewValue){
                        return parseInt(viewValue, 10);
                    });
                }
            };
        });

        app.controller('ReviseController', function ($scope, $http) {
            var self = this;

            $scope.appId = appId;
            $scope.question_text = data.question_text;
            $scope.options = data.options;
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

            self.STATUS_NEW      = 0;
            self.STATUS_ANSWERED = 1;
            self.STATUS_REVISED  = 2;

            self.answer_original = data.answer_original;
            self.rationale_original = data.rationale_original;
            self.answer_revised = data.answer_revised;
            self.rationale_revised = data.rationale_revised;
            self.answer = self.answer_revised || self.answer_original;
            self.rationale = self.rationale_revised || self.rationale_original;
            self.submitting = false;
            self.other_answers = data.other_answers;
            self.correct_answer = data.correct_answer;
            self.correct_rationale = data.correct_rationale;

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
                var haveRationale = typeof self.rationale !== "undefined" && self.rationale !== null;
                var enable = haveAnswer && haveRationale && !self.submitting;
                return !enable;
            };

            self.clickSubmit = function () {
                notify('save', {state: 'start', message: "Submitting"});
                self.submitting = true;

                var submitUrl = runtime.handlerUrl(element, 'submit_answer');
                var submitData = JSON.stringify({
                    "q": self.answer,
                    "rationale": self.rationale,
                    "status": self.status()
                });
                $http.post(submitUrl, submitData).
                    success(function(data, status, header, config) {
                        self.submitting = false;
                        self.answer_original = data.answer_original;
                        self.rationale_original = data.rationale_original;
                        self.answer_revised = data.answer_revised;
                        self.rationale_revised = data.rationale_revised;
                        self.other_answers = data.other_answers;
                        self.correct_answer = data.correct_answer;
                        self.correct_rationale = data.correct_rationale;
                        notify('save', {state: 'end'})
                    }).
                    error(function(data, status, header, config) {
                        notify('error', {
                            'title': 'Error submitting answer!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

            self.getStats = function() {
                var statsUrl = runtime.handlerUrl(element, 'get_stats');
                $http.post(statsUrl, '""').
                    success(function(data, status, header, config) {
                        // console.log("Getting stats");
                        // console.log(data);
                        self.stats = data;
                        $scope.chartDataOriginal[0].values = [];
                        $scope.chartDataOriginal[0].data = [];
                        $scope.chartDataOriginal[0].test = [];
                        $scope.chartDataRevised[0].values = [];
                        for (var i = 0; i < $scope.options.length; i++) {
                            var count = 0;
                            if (i in data.original) {
                                count = data.original[i];
                            }
                            $scope.chartDataOriginal[0]['values'].push([$scope.options[i], count]);
                            $scope.chartDataOriginal[0]['data'].push( { name: $scope.options[i], value: count } );
                            $scope.chartDataOriginal[0]['test'].push( [i,count] );

                            count = 0;
                            if (i in data.revised) {
                                count = data.revised[i];
                            }
                            $scope.chartDataRevised[0]['values'].push([$scope.options[i], count]);
                        }

                        // console.log($scope.chartDataOriginal);
                        // console.log($scope.chartDataRevised);

                        var data = $scope.chartDataOriginal[0]['test'];
                        // console.log( data );
                        // var dummyData = [4, 8, 15, 16, 23, 42];

                        // var width = 420;
                        // var barHeight = 20;
                        var margin = {top: 10, right: 10, bottom: 30, left: 30},
                            width = 900 - margin.left - margin.right,
                            height = 300 - margin.top - margin.bottom;

                        var x = d3.scale.ordinal()
                            .domain(data.map(function (d) {return d[0]; }))
                            .rangeRoundBands([margin.left, width], 0.05);

                        var y = d3.scale.linear()
                             .domain([0, d3.max(data, function(d) { return d[1]; })])
                             .range([height, 0]);

                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom");

                        var yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left");

                        var svg = d3.select("#original-bar-char").append("svg")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        svg.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(-30," + height + ")")
                            .call(xAxis)
                            .append("text")
                            .attr("x", width)
                            .attr("dy", 20)
                            .attr("text-anchor", "end")
                            .text("Foo");

                        svg.append("g")
                            .attr("class", "y axis")
                            .call(yAxis)
                            .append("text")
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .text("Log(Number Sts)");

                                
                        var bars = svg.selectAll("rect")
                            .data(data)
                            .enter()
                            .append("rect")
                            .attr("x", function(d) {return x(d[0]) + x.rangeBand()/2 - 40;})
                            .attr("y", function(d) {return y(d[1]);})
                            .attr("width", 20)
                            .attr("height", function(d) {return height - y(d[1]);})
                            .style("fill","blue");
                        
                        var yTextPadding = 20;

                        bars
                            .append("text")
                            .attr("class", "bartext")
                            .attr("text-anchor", "middle")
                            .attr("fill", "white")
                            .attr("x", function(d,i) {
                                return x(i)+x.rangeBand()/2 - 40;
                            })
                            .attr("y", function(d,i) {
                                return height-y(d[1])-yTextPadding;
                            })
                            .text('testwesty');

                        // var x = d3.scale.linear()
                        //     .domain([0, dataMax ])
                        //     .range([0, width]);

                        // var chart = d3.select("#original-bar-char")
                        //     .attr("width", width)
                        //     .attr("height", barHeight * dataMax );

                        // var bar = chart.selectAll("g")
                        //     .data( data )
                        //     .enter().append("g")
                        //     .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; })
                        //     .attr("class", "ubcpi-chart-result");

                        // // console.log()
                        // bar.append("rect")
                        //     .attr("width", x)
                        //     .attr("height", barHeight - 1);

                        // bar.append("text")
                        //     .attr("x", function(d) { return x(d) - 3; })
                        //     .attr("y", barHeight / 2)
                        //     .attr("dy", ".35em")
                        //     .text(function(d) { console.log(d);return d; });

                    }).
                    error(function(data, status, header, config) {
                        notify('error', {
                            'title': 'Error retrieving statistics!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

        });
        angular.bootstrap(element, [appId]);
    });
}
