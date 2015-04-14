function PIEdit(runtime, element, data) {
    var self = this;

    $(function ($) {
        var app = angular.module("ubcpi_edit", ['ngMessages']);
        app.run(function($http) {
            // set up CSRF Token from cookie. This is needed by all post requests
            $http.defaults.headers.post['X-CSRFToken'] = $.cookie('csrftoken');
        });

        app.directive('validateForm', function($q, $http) {
            return {
                require: 'ngModel',
                link: function(scope, elm, attrs, ctrl) {
                    scope.$watch(attrs.ngModel, function(model) {
                        if (model != null) {
                            ctrl.$validate();
                        }
                    }, true);
                    ctrl.$asyncValidators.validate_form = function (modelValue, viewValue) {
                        scope.piForm.$errors = {};
                        var handlerUrl = runtime.handlerUrl(element, 'validate_form');
                        return $http.post(handlerUrl, modelValue).
                            then(function resolved() {
                                return true;
                            }, function rejected(response) {
                                scope.piForm.$errors = response.data.error;
                                return $q.reject('error');
                            });
                    };
                }
            };
        });

        app.controller('EditSettingsController', function ($scope, $http) {
            var self = this;
            self.algos = data.algos;
            self.data = {};
            self.data.display_name = data.display_name;
            self.data.question_text = data.question_text;
            self.data.options = data.options;
            self.data.correct_answer = data.options[0];
            if (data.correct_answer)
                self.data.correct_answer = data.correct_answer;
            if (data.correct_rationale)
                self.data.correct_rationale = data.correct_rationale;
            self.data.algo = data.algo;
            self.data.seeds = data.seeds;

            self.cancel = function() {
                runtime.notify('cancel', {});
            };
            self.add_option = function() {
                self.data.options.push('');
            };
            self.delete_option = function(index) {
                self.data.options.splice(index, 1);
            };
            self.addSeed = function() {
                self.data.seeds.push({});
            };
            self.deleteSeed = function(index) {
                self.data.seeds.splice(index, 1);
            };
            self.submit = function() {
                // Take all of the fields, serialize them, and pass them to the
                // server for saving.
                var handlerUrl = runtime.handlerUrl(element, 'studio_submit');

                runtime.notify('save', {state: 'start', message: "Saving"});
                
                $http.post(handlerUrl, self.data).
                    success(function(data, status, header, config) {
                        runtime.notify('save', {state: 'end'})
                    }).
                    error(function(data, status, header, config) {
                        runtime.notify('error', {
                            'title': 'Error saving question',
                            'message': self.format_errors(result['errors'])
                        });
                    });
            };
        });
        angular.bootstrap(element, ["ubcpi_edit"]);
    });
}

