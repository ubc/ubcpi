/* Javascript for PeerInstructionXBlock. */

// A unique XBlockID allowing us to have multiple instances of this XBlock on a page
var PIXBlockID = 0;

/**
 * Generate a unique ID. Uses the global PIXBlockID and adds on each time it is called
 *
 * @since 0.4.0
 *
 * @param null
 * @return (string) A unique XBlock ID of the form 'ubcpi_#'
 */

function generatePIXBlockID() {

    // Cache the global internally
    var internalID = PIXBlockID;

    // A prefix for the string
    var IDPrefix = 'ubcpi_';

    internalID += 1;
    PIXBlockID = internalID;

    return IDPrefix + internalID;

}/* generatePIXBlockID() */


/**
 * Set the statuses for new, answered and revised
 *
 * @since 1.0.0
 *
 * @param (object) self - The whole 'this' object
 * @return (object) Modified self object
 */

function setDefaultStatuses( self ) {

    self.STATUS_NEW      = 0;
    self.STATUS_ANSWERED = 1;
    self.STATUS_REVISED  = 2;

    return self;

}

/**
 * Based on the answers provided, return which status the problem is currently in
 * If the original answer is null/undef then we're at the start
 * If the original answer is not null/undef but the revised answer is, we're at step 2
 * If both the original answer and revised answer is not null/undef then we're at step 3
 *
 * @since 1.0.0
 *
 * @param (string) answer_original - What, if anything, the student has answered initially
 * @param (string) answer_revised - What, if anything, the student has answered after revision
 * @param (object) self - The whole 'this' object
 * @return (int) the status as set by setDefaultStatuses based on the passed answers
 */

function getStatus( answer_original, answer_revised, self ) {

    if ( typeof answer_original === 'undefined' || answer_original === null ) {
        return self.STATUS_NEW;
    } else if ( typeof answer_revised === 'undefined' || answer_revised === null ) {
        return self.STATUS_ANSWERED;
    } else {
        return self.STATUS_REVISED;
    }

}/* getStatus() */


function PeerInstructionXBlock(runtime, element, data) {
    "use strict";
    var notify;

    // The workbench doesn't support notifications.
    notify = $.proxy(runtime.notify, runtime) || function(){};

    $(function ($) {
        var appId = generatePIXBlockID();

        var app = angular.module(appId, ['nvd3ChartDirectives', 'ngSanitize']);
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

            // Set statuses. Makes it testable.
            setDefaultStatuses( self );

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

            self.status = function() {
                return getStatus( self.answer_original, self.answer_revised, self );
            };

            self.disableSubmit = function () {
                var haveAnswer = typeof self.answer !== "undefined" && self.answer !== null;
                var size = self.rationale.length;
                var haveRationale = size >= $scope.rationale_size.min &&
                    ($scope.rationale_size.max == '#' || size <= $scope.rationale_size.max);
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
                        notify('save', {state: 'end'});
                    }).
                    error(function(data, status, header, config) {
                        notify('error', {
                            'title': 'Error submitting answer!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

            self.createChart = function( data, containerSelector ) {

                var i;
                var modifiedData = [];

                for (i = 0; i < data.length; ++i) {
                    var thisFreq = data[i][1];
                    var thisLabel = 'Option ' + (i+1);

                    var thisObject = {};

                    thisObject.class = 'ubcpibar';
                    thisObject.frequency = thisFreq;

                    // If this is the 'correct' answer, then add that to the label
                    if ( self.correct_answer == (i) ) {
                        thisLabel += ' (correct option)';
                        thisObject.class = 'ubcpibar correct-answer';
                    }

                    thisObject.label = thisLabel;
                    modifiedData.push(thisObject);
                }

                data = modifiedData;

                // var dummyData = [
                //     {frequency: 20, label: 'Option 1', class: 'ubcpibar'},
                //     {frequency: 50, label: 'Option 2', class: 'ubcpibar'},
                //     {frequency: 5, label: 'Option 3 (correct option)', class: 'ubcpibar correct-answer'},
                //     {frequency: 45, label: 'Option 4', class: 'ubcpibar'},
                //     {frequency: 0, label: 'Option 5', class: 'ubcpibar'},
                // ];
                //
                // data = dummyData;

                var totalFreq = 0;
                var loopIndex = 0;

                // Calculate the total number of submissions
                for ( loopIndex = 0; loopIndex < data.length; ++loopIndex ) {
                    var thisFreq = data[loopIndex].frequency;
                    totalFreq += thisFreq;
                }

                // Layout
                var margin = {
                    top: 10,
                    right: 0,
                    bottom: 30,
                    left: 0
                };

                var width = 750 - margin.left - margin.right;
                var height = 250 - margin.top - margin.bottom;

                var svg = d3.select(containerSelector)
                    .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom);
                //
                var x = d3.scale.ordinal()
                    .rangeRoundBands([0, width], 0.1);

                var y = d3.scale.linear()
                    .range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom");

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left")
                    .ticks(10, "%");

                x.domain(data.map(function(d) { return d.label; }));
                y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Frequency");

                var bars = svg.selectAll(".ubcpibar")
                    .data(data)
                    .enter()
                .append("g");

                bars.append("rect").attr("class", function(d,i){ return d.class; } )
                    .attr("x", function(d) { return x(d.label); })
                    .attr("width", x.rangeBand())
                    .attr("y", function(d) { return y(d.frequency); })
                    .attr("height", function(d) { return height - y(d.frequency); });

                bars.append("text")
                    .attr("x", function(d) { return x(d.label); })
                    .attr("y", function(d) { return y(d.frequency); })
                    .attr("dy", function(d) {

                        // If the frequency is 0, we have to adjust style slightly
                        if ( d.frequency == 0 ) {
                            return "-0.5em";
                        }

                        return "1.25em";

                    } )
                    .attr("dx", (x.rangeBand()/2)-15 + "px" )
                    .text( function(d){

                        var percentage = (d.frequency/totalFreq) * 100;
                        var rounded = Math.round( percentage*10 )/10;
                        return rounded.toFixed(1) + '%';
                    } );

            };

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
                            $scope.chartDataOriginal[0].values.push([$scope.options[i], count]);
                            $scope.chartDataOriginal[0].data.push( { name: $scope.options[i], value: count } );
                            $scope.chartDataOriginal[0].originalData.push( [$scope.options[i],count] );

                            count = 0;
                            if (i in data.revised) {
                                count = data.revised[i];
                            }
                            $scope.chartDataRevised[0].values.push([$scope.options[i], count]);
                            $scope.chartDataRevised[0].revisedData.push( [$scope.options[i],count] );
                        }

                        self.createChart( $scope.chartDataOriginal[0].originalData, '#original-bar-chart' );
                        self.createChart( $scope.chartDataRevised[0].revisedData, '#revised-bar-chart' );

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
