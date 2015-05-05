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

            self.createChart = function( data, containerSelector ) {

                var yMax = d3.max( data, function( array ) {
                    return d3.max( array.slice( 1 ) );
                } );

                // Layout
                var margin = {
                    top: 10,
                    right: 0,
                    bottom: 30,
                    left: 0
                };

                var width = 900 - margin.left - margin.right;
                var height = 300 - margin.top - margin.bottom;

                // Create the x boundaries
                var x = d3.scale.ordinal()
                    .domain(data.map(function (d) {return d[0]; }))
                    .rangeRoundBands([margin.left, width], 1);

                // Create the y boundaries
                var y = d3.scale.linear()
                     .domain([0, yMax])
                     .range([height, 0]);

                // Create the x-axis
                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                // Create the y-axis
                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                // Create the actual SVG element
                var svg = d3.select(containerSelector)
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                
                // Bar chart width
                var barWidth = 40;

                // add the bars to the chart
                var bars = svg.selectAll("rect")
                    .data(data)
                    .enter()
                    .append("rect")
                    .attr("class", "ubcpidatabar")
                    .attr("x", function(d, i) { return x( d[0] ); })
                    .attr("y", function(d, i) { return y( d[1] ); })
                    .attr("width", barWidth)
                    .attr("height", function(d) {return height - y(d[1]);})
                    .style("fill","rgb(51, 166, 220)");
                
                var yTextPadding = 20;

                // Add text labels and position them
                svg.selectAll( "text" )
                    .data(data)
                    .enter()
                    .append("text")
                   .text(function(d) {
                        return d[1];
                   })
                   .attr("text-anchor", "middle")
                   .attr("x", function(d, i) { return x( d[0] ) + barWidth/2; })
                   .attr("y", function(d) {return y(d[1]) + 15;})
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "11px")
                   .attr("fill", "white");

                // Implement the x axis
                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .append("text")
                    .attr("x", width)
                    .attr("dx", "0.71em")
                    .attr("text-anchor", "middle")
                    .text("Option");

                // Implement the y-axis
                svg.append("g")
                    .attr("class", "y axis")
                    .attr("transform", "translate(0,0)")
                    .call(yAxis)
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Number of answers");

            }

            self.getStats = function() {
                var statsUrl = runtime.handlerUrl(element, 'get_stats');
                $http.post(statsUrl, '""').
                    success(function(data, status, header, config) {

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
                            $scope.chartDataOriginal[0]['values'].push([$scope.options[i], count]);
                            $scope.chartDataOriginal[0]['data'].push( { name: $scope.options[i].name, value: count } );
                            $scope.chartDataOriginal[0]['originalData'].push( [$scope.options[i].name,count] );

                            count = 0;
                            if (i in data.revised) {
                                count = data.revised[i];
                            }
                            $scope.chartDataRevised[0]['values'].push([$scope.options[i], count]);
                            $scope.chartDataRevised[0]['revisedData'].push( [$scope.options[i].name,count] );
                        }

                        self.createChart( $scope.chartDataOriginal[0]['originalData'], '#original-bar-chart' );
                        self.createChart( $scope.chartDataRevised[0]['revisedData'], '#revised-bar-chart' );

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
