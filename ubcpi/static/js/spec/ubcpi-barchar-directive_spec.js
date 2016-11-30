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


    describe('barchart-directive', function () {
        var element, scope;

        beforeEach(inject(function ($compile, $rootScope) {
            scope = $rootScope;

            element = angular.element(
                '<pi-barchart options="options" stats="stats" answer="answer" correct="correct"></pi-barchart>'
            );
            $compile(element)(scope);
            scope.$digest();
        }));

        it('should not render anything when stats is empty', function () {
            expect(element.find('svg').length).toBe(0);
            expect(element.find('g.axis').length).toBe(0);
        });

        describe('directive', function () {
            var options = [{
                "text": "21",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "image_show_fields": 0
            }, {
                "text": "42",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "image_show_fields": 0
            }, {
                "text": "63",
                "image_alt": "",
                "image_url": "",
                "image_position": "below",
                "image_show_fields": 0
            }];
            var answer = 1;
            var correct = 0;

            describe('with enough submissions', function() {
                var stats = {0:5, 2:5};
                beforeEach(function() {
                    scope.$apply(function () {
                        scope.options = options;
                        scope.stats = stats;
                        scope.answer = answer;
                        scope.correct = correct;
                    });
                });

                it('should render the template with given data', function() {
                    expect(element.find('svg').length).toBe(1);
                    expect(element.find('g.axis').length).toBe(2);
                });

                it('should bind the data', function() {
                    expect(element.find('g rect.ubcpibar').length).toBe(options.length);
                });

                it('should mark the correct answer label', function () {
                    expect(element.find('g.axis').eq(0).find('text').eq(correct).text())
                        .toBe('Option ' + (correct + 1) + '(correct)');
                });

                it('should calculate percentage correctly', function() {
                    expect(element.find('svg>g:not(.axis)>text').length).toBe(options.length);
                    expect(element.find('svg>g:not(.axis)>text').eq(0).text()).toBe('50.0%');
                    expect(element.find('svg>g:not(.axis)>text').eq(1).text()).toBe('0.0%');
                    expect(element.find('svg>g:not(.axis)>text').eq(2).text()).toBe('50.0%');
                });
            });

            describe('with enough submissions', function() {
                var stats = {0:2, 2:2};
                beforeEach(function() {
                    scope.$apply(function () {
                        scope.options = options;
                        scope.stats = stats;
                        scope.answer = answer;
                        scope.correct = correct;
                    });
                });
                it('should not generate chart if minial total frequency is not satisfied', function () {
                    expect(element.find('span').length).toBe(1);
                    expect(element.text()).toEqual('Not enough data to generate the chart. Please check back later.');
                });
            });

            xit('should update when stats changed', function() {
                scope.$apply(function() {
                    scope.stats = {0:4, 1:8}
                });
                expect(element.find('svg>g:not(.axis)>text').length).toBe(options.length);
                expect(element.find('svg>g:not(.axis)>text').eq(0).text()).toBe('33.3%');
                expect(element.find('svg>g:not(.axis)>text').eq(1).text()).toBe('66.7%');
                expect(element.find('svg>g:not(.axis)>text').eq(2).text()).toBe('0.0%');
            })
        })
    });
});
