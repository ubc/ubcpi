angular.module('UBCPI').
    directive('piAnswerResult', function(){
        return {
            restrict: 'E',
            scope: {
                legend: '@',
                data: '=',
                correct: '=',
                answer: '='
            },
            templateUrl: 'ubcpi-answer-result.html'
        }
    });