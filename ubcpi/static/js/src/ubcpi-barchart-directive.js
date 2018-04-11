angular.module('UBCPI').
    directive('piBarchart', ['gettext', function(gettext){
        return {
            restrict: 'E',
            scope: {
                options: '=',
                stats: '=',
                correct: '=',
                answer: '=',
                role: '='
            },
            // no overwrite template
            replace: false,
            link: function(scope, element) {
                // watch the stats as it could be async populated
                scope.$watch('stats', function(stats) {
                    if(!stats) {
                        return;
                    }

                    var data = [];
                    for (var i = 0; i < scope.options.length; i++) {
                        data.push({
                            frequency: i in stats ? stats[i] : 0,
                            label: 'Option ' + (i + 1) + (scope.correct == i ? ' (correct)' : ''),
                            class: 'ubcpibar' +  (scope.correct == i ? ' correct-answer' : '')
                        });
                    }

                    // generate the chart
                    var chartLayout = d3.custom.barChart(scope, gettext);

                    d3.select(element[0])
                        .datum(data)
                        .call(chartLayout)
                }, true)
            }
        }
    }]);


angular.module('UBCPI').
    directive('piPerAnswerChart', ['gettext', function(gettext){
        return {
            restrict: 'E',
            scope: {
                options: '=',
                stats: '=',
                correct: '=',
                role: '=',
                answers: '=',
                perAnswerStats: '='
            },
            // no overwrite template
            replace: false,
            link: function(scope, element) {
                // watch the stats as it could be async populated
                scope.$watch('stats', function(stats) {
                    if(!stats) {
                        return;
                    }

                    var data = [];
                    var allAnswerCount = 0;
                    for (var k in stats) {
                        var total = 0;
                        for (var op in stats[k]) {
                            total += stats[k][op];
                        }
                        if (total > allAnswerCount) {
                            allAnswerCount = total;
                        }
                        data.push({
                            percentage: (total > 0 && typeof stats[k][scope.perAnswerStats] !== 'undefined'?
                                (stats[k][scope.perAnswerStats] / total) * 100 : 0),
                            order: k === 'original'? 0 : 1,
                            label:  (scope.answers[k] == scope.perAnswerStats? gettext('(including you) ') : '') +
                                (k === 'original'? gettext('initial choice') : gettext('after revision')),
                            class: 'ubcpibar' +  (scope.correct == scope.perAnswerStats ? ' correct-answer' : '')
                        });
                    }

                    d3.select(element[0]).select("svg").remove();   // remove old chart
                    // generate the chart
                    var chartLayout = d3.custom.perAnswerChart(scope, gettext, allAnswerCount);
                    d3.select(element[0])
                        .datum(data)
                        .call(chartLayout);
                }, true)
            }
        }
    }]);
