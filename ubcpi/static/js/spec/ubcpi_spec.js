'use strict';

describe('UBCPI module', function () {
    var mockNotify, mockConfig;

    beforeEach(module(function($provide) {
        mockConfig = {
            data: {},
            urls: {get_asset: 'cache'}
        };
        mockNotify = jasmine.createSpy('notify');
        $provide.provider('$rootElement', function() {
            this.$get = function() {
                var elem = angular.element('<div ng-app></div>');
                elem[0].config = mockConfig;
                return elem;
            };
        });
        $provide.value('notify', mockNotify);
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

    describe('autoFocus directive', function() {
        var $compile, $rootScope;
        beforeEach(inject(function (_$compile_, _$rootScope_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $compile = _$compile_;
            $rootScope = _$rootScope_;
        }));

        it('should set focus to the element', function() {
            var scope = $rootScope.$new(true);
            var element = $compile("<form name='form'><input type='text' name='test' auto-focus></form>")(scope);
            scope.$digest();
            expect(element.is(":focus"));
        });
    });

    describe('Confirm flag inappropriate directive', function () {
        var element, scope, compile;
        var confirmMsg = "Flag as inappropriate";
        var backendService;
        var backendDefer;
        var successFlagResult = { 'success': 'true' };
        var failFlagResult = { 'success': 'false' };

        beforeEach(inject(function ($compile, $rootScope, _backendService_, _$q_) {
            scope = $rootScope;
            compile = $compile;
            backendService = _backendService_;
            backendDefer = _$q_.defer();

            scope.otherAnswer = {"option": 0, "rationale": "A dummy answer.", "id": "123-456-789"};

            window.gettext = function(){};
            spyOn(window, 'gettext').and.callFake(function (t) {
                return t;
            });
            spyOn(backendService, 'flagInappropriate').and.callFake(function (id) {
                expect(id).toBe(scope.otherAnswer.id);
                return backendDefer.promise;
            });

            element = angular.element(
                '<div confirm-flag-appropriate="' + confirmMsg + '"></div>'
            );
        }));

        it('should prompt confirmation dialog', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(window.confirm).toHaveBeenCalledWith(confirmMsg);
        });

        it('should flag answer if clicked OK', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.flagInappropriate).toHaveBeenCalledWith(scope.otherAnswer.id);

            backendDefer.resolve(successFlagResult);
            scope.$digest();
            expect($(element).text()).toBe('Answer reported as inappropriate');
        });

        it('should not flag the answer if clicked cancel', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return false;
            });
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.flagInappropriate).not.toHaveBeenCalled();
        });

        it('should show failed flagging message accordingly', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.flagInappropriate).toHaveBeenCalledWith(scope.otherAnswer.id);

            backendDefer.resolve(failFlagResult);
            scope.$digest();
            expect($(element).text()).toBe('Error reporting inappropriate answer. Please refresh the page and try again.');
        });

        it('should show proper message when backend calls failed', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.flagInappropriate).toHaveBeenCalledWith(scope.otherAnswer.id);

            backendDefer.reject();
            scope.$digest();
            expect($(element).text()).toBe('Error reporting inappropriate answer. Please refresh the page and try again.');
        });

    });

    describe('Confirm staff toggle inappropriate directive', function () {
        var element, scope, compile;
        var confirmMsg = "Flag as inappropriate";
        var backendService;
        var backendDefer;

        beforeEach(inject(function ($compile, $rootScope, _backendService_, _$q_) {
            scope = $rootScope;
            compile = $compile;
            backendService = _backendService_;
            backendDefer = _$q_.defer();

            scope.ans = {"option": 0, "rationale": "A dummy answer.", "id": "123-456-789"};
            scope.rc = { explanationPool: { pool: null } };

            window.gettext = function(){};
            spyOn(window, 'gettext').and.callFake(function (t) {
                return t;
            });
            spyOn(backendService, 'staffToggleInappropriate').and.callFake(function (id, value) {
                expect(id).toBe(scope.ans.id);
                return backendDefer.promise;
            });
        }));

        // it('should prompt confirmation dialog', function() {
        //     spyOn(window, 'confirm').and.callFake(function (msg) {
        //         return true;
        //     });
        // 
        //     element = angular.element(
        //         '<div confirm-staff-toggle-inappropriate="' + confirmMsg + '" value="false"></div>'
        //     );
        //     compile(element)(scope);
        //     scope.$digest();
        // 
        //     $(element).click();
        //     expect(window.confirm).toHaveBeenCalledWith(confirmMsg);
        // });

        it('should flag answer if clicked OK', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });

            element = angular.element(
                '<div confirm-staff-toggle-inappropriate="' + confirmMsg + '" value="true"></div>'
            );
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.staffToggleInappropriate).toHaveBeenCalledWith(scope.ans.id, 'true');

            var successToggleResult = [{
                "option": "0",
                "considered_inappropriate": true,
                "explanation": scope.ans.rationale,
                "staff_set_inappropriate": true,
                "id": scope.ans.id,
                "inappropriate_report_count": 0}]

            backendDefer.resolve(successToggleResult);
            scope.$digest();
            expect(scope.rc.explanationPool.pool).toBe(successToggleResult);
        });

        // it('should not flag the answer if clicked cancel', function() {
        //     spyOn(window, 'confirm').and.callFake(function (msg) {
        //         return false;
        //     });
        // 
        //     element = angular.element(
        //         '<div confirm-staff-toggle-inappropriate="' + confirmMsg + '" value="false"></div>'
        //     );
        //     compile(element)(scope);
        //     scope.$digest();
        // 
        //     $(element).click();
        //     expect(backendService.staffToggleInappropriate).not.toHaveBeenCalled();
        // });

        it('should handle backend service error', function() {
            spyOn(window, 'confirm').and.callFake(function (msg) {
                return true;
            });

            element = angular.element(
                '<div confirm-staff-toggle-inappropriate="' + confirmMsg + '" value="true"></div>'
            );
            compile(element)(scope);
            scope.$digest();

            $(element).click();
            expect(backendService.staffToggleInappropriate).toHaveBeenCalledWith(scope.ans.id, 'true');

            backendDefer.reject();
            scope.$digest();
            expect(scope.rc.explanationPool.pool).toBe(null);
        });

    });

    describe('backendService', function() {
        var backendService, $httpBackend;


        beforeEach(inject(function(_backendService_, _$httpBackend_) {
            backendService = _backendService_;
            $httpBackend = _$httpBackend_;
        }));

        afterEach(function() {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        describe('get_stats', function() {

            beforeEach(function() {
                mockConfig.urls.get_stats = '/handler/get_stats';
            });

            it('should get stats', function() {
                // mock ajax request
                var exp = {
                    "revised": {"1": 1}, "original": {"0": 1}
                };
                var data = undefined;
                $httpBackend.expectPOST('/handler/get_stats', '""').respond(200, exp);

                backendService.getStats().then(function(d) {
                    data = d;
                });
                $httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function() {
                $httpBackend.expectPOST('/handler/get_stats', '""').respond(500, 'error');

                var error = undefined;
                backendService.getStats().catch(function(e) {
                   error = e.data;
                });
                $httpBackend.flush();

                expect(error).toBe('error');
            });
        });

        describe('get_data', function() {

            beforeEach(function() {
                mockConfig.urls.get_data = '/handler/get_data';
            });

            it('should get data', function() {
                // mock ajax request
                var exp = {
                    "answer_original": null,
                    "rationale_original": null,
                    "answer_revised": null,
                    "rationale_revised": null,
                };
                var data = undefined;
                $httpBackend.expectPOST('/handler/get_data', '""').respond(200, exp);

                backendService.get_data().then(function(d) {
                    data = d;
                });
                $httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function() {
                $httpBackend.expectPOST('/handler/get_data', '""').respond(500, 'error');

                var error = undefined;
                backendService.get_data().catch(function(e) {
                   error = e.data;
                });
                $httpBackend.flush();

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
                mockConfig.urls.submit_answer = '/handler/submit';
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
                $httpBackend.expectPOST('/handler/submit', post).respond(200, exp);

                var data = undefined;
                backendService.submit(post.q, post.rationale, post.status).then(function(d) {
                    data = d;
                });
                $httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function() {
                $httpBackend.expectPOST('/handler/submit', post).respond(500, 'error');

                var error = undefined;
                backendService.submit(post.q, post.rationale, post.status).catch(function(e) {
                    error = e.data;
                });
                $httpBackend.flush();

                expect(error).toBe('error');
            })

        });

        describe('flag_inappropriate', function() {

            beforeEach(function() {
                mockConfig.urls.flag_inappropriate = '/handler/flag_inappropriate';
            });

            it('should flag inappropriate', function() {
                // mock ajax request
                var testId = "123-456-789";
                var post = {
                    "id": testId
                };
                var exp = {
                    "success": "true"
                };
                $httpBackend.expectPOST('/handler/flag_inappropriate', post).respond(200, exp);

                backendService.flagInappropriate(testId).then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });

            it('should return false status if answer cannot be flagged', function() {
                // mock ajax request
                var testId = "987-654-321";
                var post = {
                    "id": testId
                };
                var exp = {
                    "success": "false"
                };
                $httpBackend.expectPOST('/handler/flag_inappropriate', post).respond(200, exp);

                backendService.flagInappropriate(testId).then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });

            it('should reject promise with error returned from backend when backend error ', function() {
                // mock ajax request
                var testId = "987-654-321";
                var post = {
                    "id": testId
                };
                $httpBackend.expectPOST('/handler/flag_inappropriate', post).respond(400, 'error');

                backendService.flagInappropriate(testId).catch(function(e) {
                    expect(e.data).toEqual('error');
                });
                $httpBackend.flush();
            });
        });

        describe('staff_toggle_inappropriate', function() {

            beforeEach(function() {
                mockConfig.urls.staff_toggle_inappropriate = '/handler/staff_toggle_inappropriate';
            });

            it('should allow staff to flag answer as inappropriate', function() {
                // mock ajax request
                var testId = "123-456-789";
                var post = {
                    "id": testId,
                    "considered_inappropriate": "true"
                };
                var exp = [{
                    "optione": "1",
                    "considered_inappropriate": true,
                    "explanation": "test explanation",
                    "staff_set_inappropriate": true,
                    "id": testId,
                    "inappropriate_report_count": 0
                }];
                $httpBackend.expectPOST('/handler/staff_toggle_inappropriate', post).respond(200, exp);

                backendService.staffToggleInappropriate(testId, "true").then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });

            it('should allow staff to flag answer as appropriate', function() {
                // mock ajax request
                var testId = "123-456-789";
                var post = {
                    "id": testId,
                    "considered_inappropriate": "false"
                };
                var exp = [{
                    "optione": "1",
                    "considered_inappropriate": false,
                    "explanation": "test explanation",
                    "staff_set_inappropriate": false,
                    "id": testId,
                    "inappropriate_report_count": 0
                }];
                $httpBackend.expectPOST('/handler/staff_toggle_inappropriate', post).respond(200, exp);

                backendService.staffToggleInappropriate(testId, "false").then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });

            it('should allow staff to clear flagging', function() {
                // mock ajax request
                var testId = "123-456-789";
                var post = {
                    "id": testId,
                    "considered_inappropriate": "null"
                };
                var exp = [{
                    "optione": "1",
                    "considered_inappropriate": false,
                    "explanation": "test explanation",
                    "staff_set_inappropriate": null,
                    "id": testId,
                    "inappropriate_report_count": 0
                }];
                $httpBackend.expectPOST('/handler/staff_toggle_inappropriate', post).respond(200, exp);

                backendService.staffToggleInappropriate(testId, "null").then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });
        });

        describe('get_pool_status', function() {

            beforeEach(function() {
                mockConfig.urls.get_pool_status = '/handler/get_pool_status';
            });

            it('should allow staff to get pool staus', function() {
                // mock ajax request
                var post = {
                };
                var exp = [{
                    "option": "1",
                    "considered_inappropriate": false,
                    "explanation": "testing for soil",
                    "staff_set_inappropriate": null,
                    "id": "75720d09-35e9-46dc-b72d-8e85c7297d4f",
                    "inappropriate_report_count": 0
                    }, {
                    "option": "1",
                    "considered_inappropriate": false,
                    "explanation": "test test etst",
                    "staff_set_inappropriate": null,
                    "id": "21268762-29c3-4cf6-a578-a0995a6155cc",
                    "inappropriate_report_count": 0
                }];
                $httpBackend.expectPOST('/handler/get_pool_status', post).respond(200, exp);

                backendService.getPoolStatus().then(function(result) {
                    expect(result).toEqual(exp);
                });
                $httpBackend.flush();
            });

        });
    });

    describe('ReviseController', function() {
        var $rootScope, createController;
        var mockNotify;

        beforeEach(function() {
            mockNotify = jasmine.createSpy('notify');
            module(function ($provide) {
                $provide.value('notify', mockNotify);
            });
        });

        beforeEach(inject(function($controller, _$rootScope_) {
            $rootScope = _$rootScope_;
            mockConfig.data = {
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
            expect($rootScope.question_text).toEqual(mockConfig.data.question_text);
            expect($rootScope.options).toEqual(mockConfig.data.options);
            expect($rootScope.rationale_size).toEqual(mockConfig.data.rationale_size);
            expect(controller.ALL_STATUS).toBe(mockConfig.data.all_status);
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
           });
        });

        describe('clickSubmit', function() {
            var backendDeferred, backendService, controller, backendGetDataDeferred;

            beforeEach(inject(function($q, _backendService_) {
                backendDeferred = $q.defer();
                backendService = _backendService_;
                backendGetDataDeferred = $q.defer();

                spyOn(backendService, 'get_data').and.callFake(function() {
                    return backendGetDataDeferred.promise;
                });

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
                backendGetDataDeferred.resolve({
                    "answer_original": null,
                    "rationale_original": null,
                    "answer_revised": null,
                    "rationale_revised": null
                });
                $rootScope.$apply();

                expect(mockNotify.calls.count()).toBe(2);
                expect(mockNotify.calls.argsFor(1)).toEqual(['save', {state: 'end'}]);
                expect(controller.submitting).toBe(false);
            });

            it('should call notify with error when backend errors', function() {

                backendGetDataDeferred.reject('error');
                $rootScope.$apply();

                expect(mockNotify).toHaveBeenCalledWith('error', {
                        'title': 'Error retrieving data!',
                        'message': 'Please refresh the page and try again!'
                });
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
                backendGetDataDeferred.resolve({
                    "answer_original": null,
                    "rationale_original": null,
                    "answer_revised": null,
                    "rationale_revised": null
                });
                $rootScope.$apply();

                expect(controller.submitting).toBe(false);
                expect(mockNotify.calls.count()).toBe(3);
            });
        });

        describe('getState', function() {
            var backendService, controller, backendDeferred;

            beforeEach(inject(function(_backendService_, $q) {
                backendDeferred = $q.defer();
                backendService = _backendService_;
                var backendGetDataDeferred = $q.defer();

                spyOn(backendService, 'get_data').and.callFake(function() {
                    return backendGetDataDeferred.promise;
                });
                backendGetDataDeferred.resolve({
                    "answer_original": null,
                    "rationale_original": null,
                    "answer_revised": null,
                    "rationale_revised": null
                });
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
            });
        });
    })
});

describe('PeerInstructionXBlock function', function() {
    var mockRuntime, mockElement, mockData, mockModule;

    beforeEach(function() {
        mockRuntime = jasmine.createSpyObj('runtime', ['notify', 'handlerUrl']);
        mockRuntime.notify = undefined;
        mockRuntime.handlerUrl.and.callFake(function(element, handler) {
            return handler;
        });
        mockElement = jasmine.createSpy('element');
        mockData = jasmine.createSpy('data');
        mockModule = jasmine.createSpyObj('module', ['value']);
        mockModule.value.and.returnValue(mockModule);
        spyOn(angular, 'module').and.returnValue(mockModule);
        spyOn(angular, 'bootstrap');
        PeerInstructionXBlock(mockRuntime, mockElement, mockData);
    });

    it('should setup angular module dependencies', function() {
        expect(angular.module.calls.count()).toBe(1);
        expect(angular.module.calls.argsFor(0)).toEqual(['UBCPI']);
        expect(mockModule.value.calls.count()).toBe(1);
        expect(mockModule.value.calls.argsFor(0)).toContain('notify');
    });

    it('should bootstrap angular app', function() {
        expect(angular.bootstrap).toHaveBeenCalledWith($(mockElement), ['UBCPI'], {strictDi: true})
    });

    it('should generate URLs using runtime', function() {
        expect(mockRuntime.handlerUrl.calls.count()).toBe(7);
        expect(mockRuntime.handlerUrl.calls.allArgs()).toEqual(
            [[mockElement, 'get_stats'], [mockElement, 'submit_answer'], [mockElement, 'get_asset'], [mockElement, 'get_data'], [mockElement, 'flag_inappropriate'], [mockElement, 'get_pool_status'], [mockElement, 'staff_toggle_inappropriate']]);
    });
});
