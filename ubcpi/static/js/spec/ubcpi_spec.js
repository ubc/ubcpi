'use strict';

describe('UBCPI', function () {
    var mockUrls, mockNotify;

    beforeEach(function() {
        mockNotify = jasmine.createSpy('notify');
        mockUrls = jasmine.createSpy('urls');
        module(function ($provide) {
            $provide.constant('urls', mockUrls);
            $provide.value('notify', mockNotify);
        });
    });

    beforeEach(module('constants', function($provide) {
        $provide.constant('urls', mockUrls);
    }, 'UBCPI'));

    describe('Integer directive', function () {
        var $compile,
            $rootScope;
        // Store references to $rootScope and $compile
        // so they are available to all tests in this describe block
        beforeEach(inject(function (_$compile_, _$rootScope_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $compile = _$compile_;
            $rootScope = _$rootScope_;
        }));

        it('should replace string with integer', function () {
            var scope = $rootScope.$new(true);
            scope.rc = {choice: null};
            // Compile a piece of HTML containing the directive
            $compile("<form name='form'><input type=\"radio\" ng-model=\"rc.choice\" name=\"answer\" integer></form>")(scope);
            scope.form.answer.$setViewValue("5");
            scope.$digest();
            expect(scope.rc.choice).toBe(5)
        });
    });

    describe('backendService', function() {
        var backendService, httpBackend;


        beforeEach(inject(function(_backendService_, $httpBackend) {
            backendService = _backendService_;
            httpBackend = $httpBackend;
        }));

        afterEach(function() {
            httpBackend.verifyNoOutstandingExpectation();
            httpBackend.verifyNoOutstandingRequest();
        });

        describe('get_stats', function() {

            beforeEach(function() {
                mockUrls.get_stats = '/handler/get_stats';
            });

            it('should get stats', function() {
                // mock ajax request
                var exp = {
                    "revised": {"1": 1}, "original": {"0": 1}
                };
                httpBackend.expectPOST('/handler/get_stats', '""').respond(200, exp);

                backendService.getStats().then(function(data) {
                    expect(data).toEqual(exp);
                });
                httpBackend.flush();
            });

            it('should call notify when backend returns an error', function() {
                httpBackend.expectPOST('/handler/get_stats', '""').respond(500);

                backendService.getStats().then(function() {
                    expect(mockNotify).toHaveBeenCalled();
                });
                httpBackend.flush();
            });
        });

        describe('submit', function() {
            var post = {
                "q": 0,
                "rationale": "This is my answer.",
                "status": 0
            };

            beforeEach(function() {
                mockUrls.submit_answer = '/handler/submit';
            });

            it('should submit answers', function() {
                // mock ajax request

                var exp = {
                    "other_answers": {
                        "answers": [
                            {
                                "option": 0,
                                "rationale": "This is seed1"
                            },
                            {
                                "option": 1,
                                "rationale": "This is seed2"
                            }
                        ]
                    },
                    "answer_original": 0,
                    "rationale_original": "This is my answer.",
                    "answer_revised": null,
                    "rationale_revised": null
                };
                httpBackend.expectPOST('/handler/submit', post).respond(200, exp);

                backendService.submit(post.q, post.rationale, post.status).then(function(data) {
                    expect(data).toEqual(exp);
                });
                httpBackend.flush();
            });

            it('should call notify when backend returns an error', function() {
                httpBackend.expectPOST('/handler/submit', post).respond(500);

                backendService.submit(post.q, post.rationale, post.status).then(function() {
                    expect(mockNotify).toHaveBeenCalled();
                });
                httpBackend.flush();
            })

        })
    });

    describe('chartFactory', function() {
        var chartFactory;
        var dummyData = [
            {frequency: 20, label: 'Option 1', class: 'ubcpibar'},
            {frequency: 50, label: 'Option 2', class: 'ubcpibar'},
            {frequency: 5, label: 'Option 3 (correct option)', class: 'ubcpibar correct-answer'},
            {frequency: 45, label: 'Option 4', class: 'ubcpibar'},
            {frequency: 0, label: 'Option 5', class: 'ubcpibar'},
        ];

        beforeEach(inject(function(_chart_) {
            chartFactory = _chart_;
        }));

        it('should pass data to d3', function() {
            var spy = jasmine.createSpyObj('selection', ['append', 'attr', 'call', 'datum']);
            spyOn(d3, 'select').and.returnValue(spy);
            spy.call.and.returnValue(spy);
            spy.datum.and.returnValue(spy);

            chartFactory.createChart(dummyData, 'body');

            expect(d3.select).toHaveBeenCalledWith('body');
            expect(spy.datum).toHaveBeenCalledWith(dummyData);
        })
    });

    describe('ReviseController', function() {
        var $scope, createController;
        var mockNotify, mockChart, mockData;

        beforeEach(function() {
            mockNotify = jasmine.createSpy('notify');
            mockChart = jasmine.createSpyObj('chart', ['createChart']);
            var mockUrls = jasmine.createSpy('urls');
            mockData = {
                'question_text': {'text': 'question text'},
                'options': [
                    {'text': 'option1'}
                ],
                'display_name': 'PI Tool',
                'answer_original': null,
                'answer_revised': null,
                'rationale_original': null,
                'rationale_revised': null,
                'rationale_size': {'max': 32000, 'min': 1},
                'all_status': {'NEW': 0, 'ANSWERED': 1, 'REVISED': 2}
            };
            module(function ($provide) {
                $provide.constant('urls', mockUrls);
                $provide.value('notify', mockNotify);
                $provide.value('chart', mockChart);
                $provide.value('data', mockData);
            });
        });

        beforeEach(inject(function($controller) {
            $scope = {};
            createController = function(params) {
                return $controller(
                    'ReviseController', {
                        $scope: $scope,
                        $stateParams: params || {}
                    });
            }
        }));

        it('should have correct initial states', function() {
            var controller = createController();
            expect($scope.question_text).toEqual(mockData.question_text);
            expect($scope.options).toEqual(mockData.options);
            expect($scope.rationale_size).toEqual(mockData.rationale_size);
            expect($scope.chartDataOriginal).toEqual([
                {
                    'key': 'Original',
                    'color': '#33A6DC',
                    'values': []
                }
            ]);
            expect($scope.chartDataRevised).toEqual([
                {
                    'key': 'Revised',
                    'color': '#50C67B',
                    'values': []
                }
            ]);
            expect(controller.ALL_STATUS).toBe(mockData.all_status);
            expect(controller.answer).toBe(undefined);
            expect(controller.rationale).toBe(undefined);
            expect(controller.submitting).toBe(false);
        });

        describe('status', function() {
           it('should get correct status of the app', function() {
               var controller = createController();
               expect(controller.status()).toBe(controller.ALL_STATUS.NEW);

               controller.answer_original = 0;
               controller.rationale_original = 'This is my rationale';
               expect(controller.status()).toBe(controller.ALL_STATUS.ANSWERED);

               controller.answer_revised = 0;
               controller.rationale_revised = 'This is my revised rationale';
               expect(controller.status()).toBe(controller.ALL_STATUS.REVISED);
           })
        });

        describe('clickSubmit', function() {
            var backendDeferred, backendService;

            beforeEach(inject(function($q, _backendService_) {
                backendDeferred= $q.defer();
                backendService = _backendService_;
            }));

            it('should set the submitting status and show the notification', function() {
                spyOn(backendService, 'submit').and.callFake(function() {
                    return backendDeferred.promise;
                });
                var controller = createController();
                expect(controller.submitting).toBe(false);
                controller.clickSubmit().then(function() {
                    expect(mockNotify.calls.count()).toBe(2);
                    expect(mockNotify.calls.argsFor(1)).toBe(['save', {state: 'end'}]);
                    expect(controller.submitting).toBe(false);
                });
                expect(controller.submitting).toBe(true);
                expect(mockNotify).toHaveBeenCalledWith('save', {state: 'start', message: "Submitting"});
                backendDeferred.resolve({'answer_original': 'original'});
            });

            it('should call backendService with correct parameters', function() {
                var controller = createController();
                var submit = {
                    'answer': 1,
                    'rationale': 'my rationale',
                    'status': controller.ALL_STATUS.NEW
                };
                controller.answer = submit.answer;
                controller.rationale = submit.rationale;
                spyOn(backendService, 'submit').and.callFake(function() {
                    return {
                        then: function() {}
                    }
                });
                controller.clickSubmit();
                expect(backendService.submit).toHaveBeenCalledWith(submit.answer, submit.rationale, submit.status);
            });

            it('should process the response from backend', function() {
                var controller = createController();
                var response = {
                    'answer_original': 1,
                    'rationale_original': 'rationale',
                    'answer_revised': 2,
                    'rationale_revised': 'rationale revised',
                    'other_answers': null,
                    'correct_answer': 1,
                    'correct_rationale': 'correct rationale'
                };
                spyOn(backendService, 'submit').and.callFake(function() {
                    return {
                        then: function(callback) { return callback(response);}
                    }
                });
                controller.clickSubmit();
                for (var key in response) {
                    expect(controller.hasOwnProperty(key)).toBe(true);
                    expect(controller[key]).toEqual(response[key]);
                }
            })
        });

        describe('createChart', function() {
            it('should call chart service with correct parameters', function() {
                var controller = createController();
                controller.createChart('testdata', 'body');
                expect(mockChart.createChart).toHaveBeenCalledWith('testdata', 'body');
            })
        });

        describe('getState', function() {
            var backendService;

            beforeEach(inject(function(_backendService_) {
                backendService = _backendService_;
            }));

            it('should call backendService', function() {
                var controller = createController();
                spyOn(backendService, 'getStats').and.callFake(function() {
                    return {
                        then: function() {}
                    }
                });
                controller.getStats();
                expect(backendService.getStats).toHaveBeenCalled();
            });

            it('should process data from backend', function() {
                var controller = createController();
                var response = {
                    "revised": {"1": 1}, "original": {"0": 1}
                };
                spyOn(backendService, 'getStats').and.callFake(function() {
                    return {
                        then: function(callback) { return callback(response);}
                    }
                });
                controller.getStats();
                expect(controller.stats).toEqual(response);
            })
        })
    })
});

xdescribe('UBCPI XBlock', function () {

    var mockRuntime = {};
    var element;
    var fixture;
    var data;

    jasmine.getFixtures().fixturesPath = 'base/fixtures';

    var $compile,
        $rootScope;
    beforeEach(module('UBCPI'));

    beforeEach(inject(function (_$compile_, _$rootScope_) {
        // The injector unwraps the underscores (_) from around the parameter names when matching
        $compile = _$compile_;
        $rootScope = _$rootScope_;
    }));

    // Testing fixtures
    it('Outputs the question title', function () {

        fixture = loadFixtures('question-form.html');
        var question_heading = $('.question-text').text();

        expect(question_heading).toEqual('Question:');

    });

    // it( 'has no idea what it is doing', function() {
    //
    //     fixture = loadFixtures( 'question-form.html' );
    //
    //     mockRuntime = jasmine.createSpyObj( 'runtime', ['handlerUrl'] );
    //     mockRuntime.handlerUrl.and.callFake( function() {
    //         return 'test url';
    //     } );
    //
    //     // Intercept POST requests through JQuery
    //     spyOn( $, 'ajax' ).and.callFake( function( params ) {
    //         // Call through to the success handler
    //         params.success( {up:'test up', down:'test down'} );
    //     });
    //
    //     element = $( 'fieldset' ).get();
    //
    //     // select first answer
    //     // var answer = $( element ).find( 'input[type="radio"]:first' );
    //     // console.log( answer.eq(0) );
    //     // $( answer ).eq(0).click();
    //     //
    //     // // Mock a rationale
    //     // var textarea = $( element ).find( 'textarea' );
    //     // $( textarea ).val( 'Mock rationale' );
    //     //
    //     // var button = $( element ).find( 'input[type="button"]' );
    //     // $( button ).click();
    //
    //     // var pixb = PeerInstructionXBlock( mockRuntime, element, data );
    //
    // } );

});


xdescribe('UBCPI XBlock Submissions Enabled', function () {

    var mockSelf;
    var mockScope;
    var disabledButton;

    beforeEach(function () {

        mockSelf = {
            answer: null,
            rationale: undefined,
            submitting: false
        };

        mockScope = {
            rationale_size: {
                min: 1,
                max: 32000
            }
        };

    });

    // Test that the submit button should be disabled when no answer is given
    it('Ensures the submit button is disabled when no answer', function () {

        disabledButton = disableSubmit(mockSelf, mockScope);

        expect(disabledButton).toEqual(true);

    });

    // Test that the submit button should be disabled when an answer is given, but no rationale
    it('Ensures the submit button is disabled when no rationale', function () {

        mockSelf.answer = 1;
        disabledButton = disableSubmit(mockSelf, mockScope);

        expect(disabledButton).toEqual(true);

    });

    // Test that if we have an answer and a rationale (with default min/max) that the submit button is enabled
    it('Ensures the submit button is ENABLED when answer and rationale provided', function () {

        mockSelf.answer = 1;
        mockSelf.rationale = 'Mock rationale';
        disabledButton = disableSubmit(mockSelf, mockScope);

        expect(disabledButton).toEqual(false);

    });

    // Now test that the max/min stuff works as expected
    it('Ensures that when the rationale is not long enough the submit button is disabled', function () {

        mockScope.rationale_size.min = 20;
        mockSelf.answer = 1;
        mockSelf.rationale = 'Answer too short'; // 16 chars
        disabledButton = disableSubmit(mockSelf, mockScope);

        expect(disabledButton).toEqual(true);

    });

    it('Ensures that when the rationale is too long the submit button is disabled', function () {

        mockScope.rationale_size.max = 10;
        mockSelf.answer = 1;
        mockSelf.rationale = 'Answer too long'; // 16 chars
        disabledButton = disableSubmit(mockSelf, mockScope);

        expect(disabledButton).toEqual(true);

    });

});

