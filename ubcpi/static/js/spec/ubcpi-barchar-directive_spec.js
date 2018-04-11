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
                        .toBe('Option ' + (correct + 1) + ' (correct)');
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


    describe('pi-per-answer-chart', function () {
        var element, scope;

        beforeEach(inject(function ($compile, $rootScope) {
            scope = $rootScope;

            element = angular.element(
                '<pi-per-answer-chart options="options" stats="stats" answers="answers" correct="correct" per-answer-stats="per_answer_stats"></pi-per-answer-chart>'
            );
            $compile(element)(scope);
            scope.$digest();
        }));

        it('should not render anything when stats is empty', function () {
            expect(element.find('svg').length).toBe(0);
            expect(element.find('g').length).toBe(0);
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
            var answers = {"original": 2, "revised": 1};
            var correct = 0;

            describe('with enough submissions', function() {
                var stats = {
                    "original": {0: 4, 1: 5, 2: 1},
                    "revised": {0: 1, 1: 8, 2: 1},
                };
                beforeEach(function() {
                    scope.$apply(function () {
                        scope.options = options;
                        scope.stats = stats;
                        scope.answers = answers;
                        scope.correct = correct;
                        scope.per_answer_stats = 1;
                    });
                });

                it('should render the template with given data', function() {
                    // one graph for given answer per_answer_stats. two bars: one for initial choice, one for revision
                    expect(element.find('> svg').length).toBe(1);
                    expect(element.find('> svg > g').length).toBe(2);
                });

                it('should calculate percentage correctly for incorrect answer', function() {
                    expect(element.find('> svg > g').eq(0).find('> rect').length).toBe(2);
                    expect(
                        element.find('> svg > g').eq(0).find('> rect.ubcpibar').attr('width') /
                        element.find('> svg > g').eq(0).find('> rect:not(.ubcpibar)').attr('width')).toBe(0.5);
                    expect(element.find('> svg > g').eq(0).find('> svg > text').text()).toContain('50%');
                    expect(
                        element.find('> svg > g').eq(1).find('> rect.ubcpibar').attr('width') /
                        element.find('> svg > g').eq(1).find('> rect:not(.ubcpibar)').attr('width')).toBe(0.8);
                    expect(element.find('> svg > g').eq(1).find('> svg > text').text()).toContain('80%');
                });
            });

            describe('with enough submissions', function() {
                var stats = {
                    "original": {0: 4, 1: 5, 2: 1},
                    "revised": {0: 1, 1: 8, 2: 1},
                };
                beforeEach(function() {
                    scope.$apply(function () {
                        scope.options = options;
                        scope.stats = stats;
                        scope.answers = answers;
                        scope.correct = correct;
                        scope.per_answer_stats = correct;
                    });
                });

                it('should calculate percentage correctly for correct answer', function() {
                    expect(element.find('> svg > g').eq(0).find('> rect').length).toBe(2);
                    expect(
                        element.find('> svg > g').eq(0).find('> rect.correct-answer').attr('width') /
                        element.find('> svg > g').eq(0).find('> rect:not(.correct-answer)').attr('width')).toBe(0.4);
                    expect(element.find('> svg > g').eq(0).find('> svg > text').text()).toContain('40%');
                    expect(
                        element.find('> svg > g').eq(1).find('> rect.correct-answer').attr('width') /
                        element.find('> svg > g').eq(1).find('> rect:not(.correct-answer)').attr('width')).toBe(0.1);
                    expect(element.find('> svg > g').eq(1).find('> svg > text').text()).toContain('10%');
                });

                it('should update when stats changed', function() {
                    scope.$apply(function() {
                        scope.stats = {
                            "original": {0: 10, 1: 6, 2: 4},
                            "revised": {0: 4, 1: 14, 2: 2},
                        };
                    });
                    expect(element.find('> svg > g').eq(0).find('> rect').length).toBe(2);
                    expect(
                        element.find('> svg > g').eq(0).find('> rect.correct-answer').attr('width') /
                        element.find('> svg > g').eq(0).find('> rect:not(.correct-answer)').attr('width')).toBe(0.5);
                    expect(element.find('> svg > g').eq(0).find('> svg > text').text()).toContain('50%');
                    expect(
                        element.find('> svg > g').eq(1).find('> rect.correct-answer').attr('width') /
                        element.find('> svg > g').eq(1).find('> rect:not(.correct-answer)').attr('width')).toBe(0.2);
                    expect(element.find('> svg > g').eq(1).find('> svg > text').text()).toContain('20%');
                });
            });

            describe('with enough submissions and showing stats for user\'s revision', function() {
                var stats = {
                    "original": {0: 4, 1: 5, 2: 1},
                    "revised": {0: 1, 1: 8, 2: 1},
                };
                beforeEach(function() {
                    scope.$apply(function () {
                        scope.options = options;
                        scope.stats = stats;
                        scope.answers = answers;
                        scope.correct = correct;
                        scope.per_answer_stats = answers['revised'];
                    });
                });

                it('should not indicate it as user\'s initial answer', function() {
                    expect(element.find('> svg > g').eq(0).find('> svg > text').text()).not.toContain('including you');
                });
                it('should indicate it as user\'s revision', function() {
                    expect(element.find('> svg > g').eq(1).find('> svg > text').text()).toContain('including you');
                });
            });
        })
    });
});
