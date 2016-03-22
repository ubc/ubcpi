angular.module('UBCPI').
    directive('piBarchart', function(){
        return {
            restrict: 'E',
            scope: {
                options: '=',
                stats: '=',
                correct: '=',
                answer: '=',
                is_instructor: '=',
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
                            label: 'Option ' + (i + 1) + (scope.correct == i ? '(correct)' : ''),
                            class: 'ubcpibar' +  (scope.correct == i ? ' correct-answer' : '')
                        });
                    }

                    // generate the chart
                    var chartLayout = d3.custom.barChart();

                    d3.select(element[0])
                        .datum(data)
                        .call(chartLayout)
                }, true);

                scope.$watch('instructor', function(is_instructor){
                    console.log( 'scope watch: ' + is_instructor );
                }, true);
            }
        }
    });
