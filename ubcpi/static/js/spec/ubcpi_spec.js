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
                var data = undefined;
                httpBackend.expectPOST('/handler/get_stats', '""').respond(200, exp);

                backendService.getStats().then(function(d) {
                    data = d;
                });
                httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function() {
                httpBackend.expectPOST('/handler/get_stats', '""').respond(500, 'error');

                var error = undefined;
                backendService.getStats().catch(function(e) {
                   error = e.data;
                });
                httpBackend.flush();

                expect(error).toBe('error');
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

                var data = undefined;
                backendService.submit(post.q, post.rationale, post.status).then(function(d) {
                    data = d;
                });
                httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function() {
                httpBackend.expectPOST('/handler/submit', post).respond(500, 'error');

                var error = undefined;
                backendService.submit(post.q, post.rationale, post.status).catch(function(e) {
                    error = e.data;
                });
                httpBackend.flush();

                expect(error).toBe('error');
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
        var $rootScope, createController;
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

        beforeEach(inject(function($controller, _$rootScope_) {
            $rootScope = _$rootScope_;
            createController = function(params) {
                return $controller(
                    'ReviseController', {
                        $scope: $rootScope,
                        $stateParams: params || {}
                    });
            }
        }));

        it('should have correct initial states', function() {
            var controller = createController();
            expect($rootScope.question_text).toEqual(mockData.question_text);
            expect($rootScope.options).toEqual(mockData.options);
            expect($rootScope.rationale_size).toEqual(mockData.rationale_size);
            expect($rootScope.chartDataOriginal).toEqual([
                {
                    'key': 'Original',
                    'color': '#33A6DC',
                    'values': []
                }
            ]);
            expect($rootScope.chartDataRevised).toEqual([
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
            var backendDeferred, backendService, controller;

            beforeEach(inject(function($q, _backendService_) {
                backendDeferred = $q.defer();
                backendService = _backendService_;
                controller = createController();
            }));

            it('should set the submitting status and show the notification', function() {
                spyOn(backendService, 'submit').and.callFake(function() {
                    return backendDeferred.promise;
                });

                expect(controller.submitting).toBe(false);

                controller.clickSubmit();
                expect(controller.submitting).toBe(true);
                expect(mockNotify).toHaveBeenCalledWith('save', {state: 'start', message: "Submitting"});

                backendDeferred.resolve({'answer_original': 'original'});
                $rootScope.$apply();

                expect(mockNotify.calls.count()).toBe(2);
                expect(mockNotify.calls.argsFor(1)).toEqual(['save', {state: 'end'}]);
                expect(controller.submitting).toBe(false);
            });

            it('should call backendService with correct parameters', function() {
                var submit = {
                    'answer': 1,
                    'rationale': 'my rationale',
                    'status': controller.ALL_STATUS.NEW
                };
                controller.answer = submit.answer;
                controller.rationale = submit.rationale;
                spyOn(backendService, 'submit').and.callFake(function() {
                    return {
                        then: function() { return { finally: function() {} }; }
                    }
                });
                controller.clickSubmit();
                expect(backendService.submit).toHaveBeenCalledWith(submit.answer, submit.rationale, submit.status);
            });

            it('should process the response from backend', function() {
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
                        then: function(callback) { callback(response);
                            return { finally: function() {}}
                        }
                    }
                });
                controller.clickSubmit();
                for (var key in response) {
                    expect(controller.hasOwnProperty(key)).toBe(true);
                    expect(controller[key]).toEqual(response[key]);
                }
            });

            it('should clear the submitting status when failed', function() {
                spyOn(backendService, 'submit').and.callFake(function() {
                    return backendDeferred.promise;
                });

                controller.clickSubmit();

                backendDeferred.reject('backend error');
                $rootScope.$apply();

                expect(controller.submitting).toBe(false);
                expect(mockNotify.calls.count()).toBe(3);
            });
        });

        describe('createChart', function() {
            it('should call chart service with correct parameters', function() {
                var controller = createController();
                controller.createChart('testdata', 'body');
                expect(mockChart.createChart).toHaveBeenCalledWith('testdata', 'body');
            })
        });

        describe('getState', function() {
            var backendService, controller, backendDeferred;

            beforeEach(inject(function(_backendService_, $q) {
                backendDeferred = $q.defer();
                backendService = _backendService_;
                controller = createController();
            }));

            it('should call backendService', function() {
                spyOn(backendService, 'getStats').and.callFake(function() {
                    return {
                        then: function() {}
                    }
                });
                controller.getStats();
                expect(backendService.getStats).toHaveBeenCalled();
            });

            it('should process data from backend', function() {
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
            });

            it('should call notify with error when backend errors', function() {
                spyOn(backendService, 'getStats').and.callFake(function() {
                    return backendDeferred.promise;
                });

                controller.getStats();
                backendDeferred.reject('error');
                $rootScope.$apply();

                expect(mockNotify).toHaveBeenCalledWith('error', {
                        'title': 'Error retrieving statistics!',
                        'message': 'Please refresh the page and try again!'
                });
            })
        })
    })
});

describe('PeerInstructionXBlock', function() {
    var mockRuntime, mockElement, mockData, mockModule;

    beforeEach(function() {
        mockRuntime = jasmine.createSpyObj('runtime', ['notify', 'handlerUrl']);
        mockRuntime.notify = undefined;
        mockRuntime.handlerUrl.and.callFake(function(element, handler) {
            return handler;
        });
        mockElement = jasmine.createSpy('element');
        mockData = jasmine.createSpy('data');
        mockModule = jasmine.createSpyObj('module', ['value', 'constant']);
        mockModule.value.and.returnValue(mockModule);
        mockModule.constant.and.returnValue(mockModule);
        spyOn(angular, 'module').and.returnValue(mockModule);
        spyOn(angular, 'bootstrap');
        PeerInstructionXBlock(mockRuntime, mockElement, mockData);
    });

    it('should setup angular module dependencies', function() {
        expect(angular.module.calls.count()).toBe(2);
        expect(angular.module.calls.argsFor(0)).toEqual(['constants']);
        expect(angular.module.calls.argsFor(1)).toEqual(['UBCPI']);
        expect(mockModule.value.calls.count()).toBe(2);
        expect(mockModule.value.calls.argsFor(0)).toContain('notify');
        expect(mockModule.value.calls.argsFor(1)).toEqual(['data', mockData]);
        expect(mockModule.constant.calls.count()).toBe(1);
        expect(mockModule.constant.calls.argsFor(0)).toContain('urls');
    });

    it('should bootstrap angular app', function() {
        expect(angular.bootstrap).toHaveBeenCalledWith(mockElement, ['UBCPI'], {})
    });

    it('should generate URLs using runtime', function() {
        expect(mockRuntime.handlerUrl.calls.count()).toBe(3);
        expect(mockRuntime.handlerUrl.calls.allArgs()).toEqual(
            [[mockElement, 'get_stats'], [mockElement, 'submit_answer'], [mockElement, 'get_asset']]);
        expect(mockModule.constant.calls.allArgs()).toEqual([['urls', {
            'get_stats': 'get_stats',
            'submit_answer': 'submit_answer',
            'get_asset': 'get_asset'
        }]])
    });
});

