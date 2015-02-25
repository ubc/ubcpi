/* Javascript for PeerInstructionXBlock. */

var generatePIXBlockId;
if (typeof generatePIXBlockId !== "function") {
    generatePIXBlockId = (function () {
        "use strict";
        var id = 0;
        return function () {
            return "ubcpi_" + (id += 1);
        }
    }());
}

function PeerInstructionXBlock(runtime, element, data) {
    "use strict";

    var handlerUrl = runtime.handlerUrl(element, 'submit_answer');
    var submitButton = $('.ubcpi_submit', element);

/*
    $('input[type="radio"]', element).click(function (eventObject) {
        var clicked = this;
        var answer = clicked.value;
        console.log("Submitting ", answer);
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"q": answer}),
            success: function (data, textStatus, jqXHR) {
                disableSubmit();
            },
            error: function (jqXHR, textStatus, errorThrown) {
            }
        });
    });
*/

    $(function ($) {
        var appId = generatePIXBlockId();
        var app = angular.module(appId, []);
        app.controller('ReviseController', function ($scope) {
            var self = this;

            $scope.appId = appId;
            $scope.question_text = data.question_text;
            $scope.options = data.options;

            self.answer = data.answer;
            self.submitting = false;

            self.disableSubmit = function () {
                var haveAnswer = typeof self.answer !== "undefined" && self.answer !== null;
                var enable = haveAnswer && !self.submitting;
                return !enable;
            };

            self.clickSubmit = function ($event) {
                console.log("Submitting ", self.answer);
                self.submitting = true;

                $.ajax({
                    type: "POST",
                    url: handlerUrl,
                    data: JSON.stringify({"q": self.answer}),
                    success: function (data, textStatus, jqXHR) {
                        console.log("Okay, got back", data);
                        self.submitting = false;
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.log("Something went wrong", arguments);
                    }
                });
            };

        });
        angular.bootstrap(element, [appId]);

        /* Here's where you'd do things on page load. */
        var savedAnswer = data.answer;

        // Handle null case
        if (!savedAnswer) {
            return;
        }
        else {
            enableSubmit();
        }

        $('input[value="' + savedAnswer + '"]', element).prop('checked', 'checked');

    });
}
