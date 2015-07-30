describe('UBCPI', function () {
    beforeEach(module(function($provide) {
        var mockConfig = {
            data: {},
            urls: {get_asset: 'cache'}
        };
        $provide.provider('$rootElement', function() {
            this.$get = function() {
                var elem = angular.element('<div ng-app></div>');
                elem[0].config = mockConfig;
                return elem;
            };
        });
    }, 'UBCPI'));


    describe('answer-result-directive', function () {
        var element, scope;

        beforeEach(module('cache?f=ubcpi-answer-result.html'));

        beforeEach(inject(function ($compile, $rootScope) {
            scope = $rootScope;

            element = angular.element(
                '<pi-answer-result legend="Answers" options="options" answer="answer" correct="correct"></pi-answer-result>'
            );
            $compile(element)(scope);
            scope.$digest();
        }));

        it('should render the template', function () {
            expect(element.find('fieldset').length).toBe(1);
            expect(element.find('legend').length).toBe(1);
            expect(element.find('legend').eq(0).text()).toBe('Answers');
        });

        describe('directive', function () {
            var options = [{
                "text": "21",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "show_image_fields": 0
            }, {
                "text": "42",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "show_image_fields": 0
            }, {
                "text": "63",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "show_image_fields": 0
            }];
            var answer = 1;
            var correct = 0;

            beforeEach(function() {
                scope.$apply(function () {
                    scope.options = options;
                    scope.answer = answer;
                    scope.correct = correct;
                });
            });

            it('should bind the data', function() {
                expect(element.find('label').length).toBe(options.length);
                expect(element.find('input').length).toBe(options.length);
            });

            it('should mark the correct answer and selected answer', function () {
                expect(element.find('label').eq(answer).find('div span').eq(1).text())
                    .toBe('(You chose this option initially)');
                expect(element.find('label').eq(correct).find('div span').eq(1).text())
                    .toBe('Correct Option');
            })
        })
    });
});