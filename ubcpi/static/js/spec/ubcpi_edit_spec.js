'use strict';

describe('UBCPI_Edit module', function () {
    var mockConfig, mockNotify;

    beforeEach(function () {
        mockNotify = jasmine.createSpy('notify');
        module(function ($provide) {
            $provide.value('notify', mockNotify);
        });
    });

    beforeEach(module(function($provide) {
        mockConfig = {
            data: {},
            urls: {}
        };
        $provide.provider('$rootElement', function() {
            this.$get = function() {
                var elem = angular.element('<div ng-app></div>');
                elem[0].config = mockConfig;
                return elem;
            };
        });
    }, 'ubcpi_edit'));

    describe('validateForm directive', function () {
        var $compile, scope, studioBackendService, $q;
        // Store references to $rootScope and $compile
        // so they are available to all tests in this describe block
        beforeEach(inject(function (_$compile_, _$rootScope_, _studioBackendService_, _$q_) {
            // The injector unwraps the underscores (_) from around the parameter names when matching
            $compile = _$compile_;
            scope = _$rootScope_;
            studioBackendService = _studioBackendService_;
            $q = _$q_;
            scope.form = {
                display_name: 'PI'
            };
            var element = angular.element(
                '<form name="piForm" validate-form ng-model="form">' +
                '<input name="display_name" ng-model="form.display_name" type="text" required />' +
                '</form>'
            );
            $compile(element)(scope);
        }));

        it('should call backend service to validate form', function () {
            var defer = $q.defer();
            spyOn(studioBackendService, 'validateForm').and.callFake(function () {
                return defer.promise;
            });
            defer.resolve();
            scope.$apply();

            expect(studioBackendService.validateForm).toHaveBeenCalledWith(scope.form);

        });

        it('should invalidate form when backend validate returns error', function () {
            var defer = $q.defer();
            spyOn(studioBackendService, 'validateForm').and.callFake(function () {
                return defer.promise;
            });
            defer.reject({error: 'invalid name'});
            scope.$apply();

            expect(scope.piForm.$errors).toEqual('invalid name');
        })
    });

    describe('studioBackendService', function () {
        var studioBackendService, $httpBackend, formData;


        beforeEach(inject(function (_studioBackendService_, _$httpBackend_) {
            studioBackendService = _studioBackendService_;
            $httpBackend = _$httpBackend_;
            formData = {
                display_name: 'PI'
            };
        }));

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
        });

        describe('validate_form', function () {

            beforeEach(function () {
                mockConfig.urls.validate_form = '/handler/validate_form';
            });

            it('should call backend validate form', function () {
                var data = undefined;
                $httpBackend.expectPOST('/handler/validate_form', formData).respond(200);

                studioBackendService.validateForm(formData).then(function (d) {
                    data = d;
                });
                $httpBackend.flush();

                expect(data).toBe(true);
            });

            it('should reject promise with error returned from backend when backend error', function () {
                var error = undefined;
                $httpBackend.expectPOST('/handler/validate_form', formData).respond(500, {error: 'error'});

                studioBackendService.validateForm(formData).catch(function (e) {
                    error = e;
                });
                $httpBackend.flush();

                expect(error).toEqual({error: 'error'});
            });
        });

        describe('studio_submit', function () {
            beforeEach(function () {
                mockConfig.urls.studio_submit = '/handler/studio_submit';
            });

            it('should submit form', function () {
                var exp = 'whatever';
                var data = undefined;
                $httpBackend.expectPOST('/handler/studio_submit', formData).respond(200, exp);

                studioBackendService.submit(formData).then(function (d) {
                    data = d;
                });
                $httpBackend.flush();

                expect(data).toEqual(exp);
            });

            it('should reject promise with error returned from backend when backend error', function () {
                var error = undefined;
                $httpBackend.expectPOST('/handler/studio_submit', formData).respond(500, {errors: 'error'});

                studioBackendService.submit(formData).catch(function (e) {
                    error = e;
                });
                $httpBackend.flush();

                expect(error).toEqual({errors: 'error'});
            })

        })
    });

    describe('EditSettingsController', function () {
        var $rootScope, createController, controller;

        beforeEach(inject(function ($controller, _$rootScope_) {
            mockConfig.data = {
                "correct_rationale": {"text": "correct rationale"},
                "image_position_locations": {"below": "Appears below", "above": "Appears above"},
                "rationale_size": {"max": 32000, "min": 1},
                "display_name": "Peer Instruction",
                "algo": {"num_responses": "#", "name": "simple"},
                "algos": {
                    "simple": "System will select one of each option to present to the students.",
                    "random": "Completely random selection from the response pool."
                },
                "correct_answer": 1,
                "seeds": [
                    {answer:2, rationale:'rationale3'},
                    {answer:1, rationale:'rationale2'},
                    {answer:0, rationale:'rationale1'},
                    {answer:2, rationale:'rationale3'},
                    {answer:1, rationale:'rationale2'},
                    {answer:0, rationale:'rationale1'}

                ],
                "question_text": {
                    "text": "What is the answer to life, the universe and everything?",
                    "image_show_fields": 0,
                    "image_url": "",
                    "image_position": "below",
                    "image_alt": ""
                },
                "options": [
                    {
                        "text": "21",
                        "image_show_fields": 0,
                        "image_url": "",
                        "image_position": "below",
                        "image_alt": ""
                    }, {
                        "text": "42",
                        "image_show_fields": 0,
                        "image_url": "",
                        "image_position": "below",
                        "image_alt": ""
                    }, {
                        "text": "63",
                        "image_show_fields": 0,
                        "image_url": "",
                        "image_position": "below",
                        "image_alt": ""
                    }
                ]
            };

            $rootScope = _$rootScope_;
            createController = function (params) {
                return $controller(
                    'EditSettingsController', {
                        $scope: $rootScope,
                        $stateParams: params || {}
                    });
            }
        }));

        beforeEach(function() {
            controller = createController();
        });

        it('should have correct initial states', function () {
            expect(controller.algos).toBe(mockConfig.data.algos);
            expect(controller.data.display_name).toBe(mockConfig.data.display_name);
            expect(controller.data.question_text).toBe(mockConfig.data.question_text);
            expect(controller.data.rationale_size).toBe(mockConfig.data.rationale_size);
            expect(controller.image_position_locations).toBe(mockConfig.data.image_position_locations);
            expect(controller.data.options).toBe(mockConfig.data.options);
            expect(controller.data.correct_answer).toBe(mockConfig.data.correct_answer);
            expect(controller.data.correct_rationale).toBe(mockConfig.data.correct_rationale);
            expect(controller.data.algo).toBe(mockConfig.data.algo);
            expect(controller.data.seeds).toBe(mockConfig.data.seeds);
        });

        it('should add option to the data when add_option is called', function() {
            var num_options = mockConfig.data.options.length;
            expect(controller.data.options.length).toBe(num_options);
            controller.add_option();
            expect(controller.data.options.length).toBe(num_options + 1);
            expect(controller.data.options[controller.data.options.length - 1]).toEqual(
                {'text': '', 'image_url': '', 'image_position': 'below', 'image_show_fields': 0, 'image_alt': ''}
            );
        });


        it('should delete option to the data when delete_option is called', function() {
            var num_options = mockConfig.data.options.length;
            expect(controller.data.options.length).toBe(num_options);
            controller.delete_option(1);
            expect(controller.data.options.length).toBe(num_options - 1);
            expect(controller.data.options).toEqual(
                [{
                    "text": "21",
                    "image_show_fields": 0,
                    "image_url": "",
                    "image_position": "below",
                    "image_alt": ""
                }, {
                    "text": "63",
                    "image_show_fields": 0,
                    "image_url": "",
                    "image_position": "below",
                    "image_alt": ""
                }]
            );
        });

        it('should add "No correct answer" option to a return options array when makeOptions is called', function() {
            var options = controller.makeOptions();
            expect(controller.data.options.length+1).toBe(options.length);
            expect(options[options.length-1]).toEqual("No correct answer");
        });

        it('should fail silently when invalid index is give to delete_option', function() {
            controller.delete_option(5);
            expect(controller.data.options.length).toBe(3);
        });

        it('should add seed when addSeed is called', function() {
            var num_seeds = mockConfig.data.seeds.length;
            expect(controller.data.seeds.length).toBe(num_seeds);
            controller.addSeed();
            expect(controller.data.seeds.length).toBe(num_seeds + 1);
            expect(controller.data.seeds[controller.data.seeds.length - 1]).toEqual({});
        });

        it('should delete seed to the data when deleteSeed is called', function() {
            var num_seeds = mockConfig.data.seeds.length;
            expect(controller.data.seeds.length).toBe(num_seeds);
            controller.deleteSeed(1);
            expect(controller.data.seeds.length).toBe(num_seeds - 1);
            expect(controller.data.seeds).toEqual([
                {answer:2, rationale:'rationale3'},
                {answer:0, rationale:'rationale1'},
                {answer:2, rationale:'rationale3'},
                {answer:1, rationale:'rationale2'},
                {answer:0, rationale:'rationale1'}
            ]);
        });

        it('should delete seeds containing an option when delete_option is called', function(){
            var num_seeds = mockConfig.data.seeds.length;

            controller.delete_option(2);
            expect(controller.data.seeds.length).toBe(num_seeds - 2);
            expect(controller.data.seeds).toEqual([
                {answer:1, rationale:'rationale2'},
                {answer:0, rationale:'rationale1'},
                {answer:1, rationale:'rationale2'},
                {answer:0, rationale:'rationale1'}
            ])
        });

        it('should fail silently when invalid index is give to deleteSeed', function() {
            controller.deleteSeed(7);
            expect(controller.data.seeds.length).toBe(6);
        });

        it('should flip the show image fields when image_show_fields is called', function() {
            expect(controller.data.question_text.image_show_fields).toBe(0);
            controller.image_show_fields(false);
            expect(controller.data.question_text.image_show_fields).toBe(true);
            controller.image_show_fields(false);
            expect(controller.data.question_text.image_show_fields).toBe(false);

            expect(controller.data.options[1].image_show_fields).toBe(0);
            controller.image_show_fields(1);
            expect(controller.data.options[1].image_show_fields).toBe(true);
            controller.image_show_fields(1);
            expect(controller.data.options[1].image_show_fields).toBe(false);
        });

        describe('submit', function () {
            var backendDeferred, studioBackendService;

            beforeEach(inject(function ($q, _studioBackendService_) {
                backendDeferred = $q.defer();
                studioBackendService = _studioBackendService_;
            }));

            it('should set the submitting status and show the notification', function () {
                spyOn(studioBackendService, 'submit').and.callFake(function () {
                    return backendDeferred.promise;
                });

                controller.submit();
                expect(mockNotify).toHaveBeenCalledWith('save', {state: 'start', message: "Saving"});

                backendDeferred.resolve();
                $rootScope.$apply();

                expect(mockNotify.calls.count()).toBe(2);
                expect(mockNotify.calls.argsFor(1)).toEqual(['save', {state: 'end'}]);
            });

            it('should call backendService with correct parameters', function () {
                spyOn(studioBackendService, 'submit').and.callFake(function () {
                    return backendDeferred.promise;
                });
                controller.submit();
                backendDeferred.resolve();
                $rootScope.$apply();

                expect(studioBackendService.submit).toHaveBeenCalledWith(controller.data);
            });

            it('should clear the submitting status when failed', function () {
                spyOn(studioBackendService, 'submit').and.callFake(function () {
                    return backendDeferred.promise;
                });

                controller.submit();

                backendDeferred.reject('backend error');
                $rootScope.$apply();

                expect(mockNotify.calls.count()).toBe(3);
            });
        });
    })
});

describe('PIEdit function', function () {
    var mockRuntime, mockElement, mockData, mockModule;

    beforeEach(function () {
        mockRuntime = jasmine.createSpyObj('runtime', ['notify', 'handlerUrl']);
        mockRuntime.notify = undefined;
        mockRuntime.handlerUrl.and.callFake(function (element, handler) {
            return handler;
        });
        mockElement = [jasmine.createSpy('element')];
        mockData = jasmine.createSpy('data');
        mockModule = jasmine.createSpyObj('module', ['value', 'constant']);
        mockModule.value.and.returnValue(mockModule);
        mockModule.constant.and.returnValue(mockModule);
        spyOn(angular, 'module').and.returnValue(mockModule);
        spyOn(angular, 'bootstrap');
        PIEdit(mockRuntime, mockElement, mockData);
    });

    it('should setup angular module dependencies', function () {
        expect(angular.module.calls.count()).toBe(1);
        expect(angular.module.calls.argsFor(0)).toEqual(['ubcpi_edit']);
        expect(mockModule.value.calls.count()).toBe(1);
        expect(mockModule.value.calls.argsFor(0)).toContain('notify');
    });

    it('should bootstrap angular app', function () {
        expect(angular.bootstrap).toHaveBeenCalledWith($(mockElement), ['ubcpi_edit'], {strictDi: true})
    });

    it('should generate URLs using runtime', function () {
        expect(mockRuntime.handlerUrl.calls.count()).toBe(2);
        expect(mockRuntime.handlerUrl.calls.allArgs()).toEqual(
            [[mockElement, 'studio_submit'], [mockElement, 'validate_form']]);
    });
});

