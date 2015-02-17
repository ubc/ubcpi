/* Javascript for PeerInstructionXBlock. */
function PeerInstructionXBlock(runtime, element) {
    "use strict";

    var handlerUrl = runtime.handlerUrl(element, 'submit_answer');

    $('input[type="radio"]', element).click(function (eventObject) {
        var clicked = this;
        var answer = clicked.value;
        console.log("Submitting ", answer);
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"q": answer}),
            success: function () {
            }
        });
    });

    $(function ($) {
        /* Here's where you'd do things on page load. */
    });
}
