/* Javascript for PeerInstructionXBlock. */
function PeerInstructionXBlock(runtime, element, data) {
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
            success: function ( data, textStatus, jqXHR ) {
            },
            error: function( jqXHR, textStatus, errorThrown ) {
            }
        });
    });

    $(function ($) {
        /* Here's where you'd do things on page load. */
        var savedAnswer = data.answer;
        
        // Handle null case
        if( !savedAnswer ) {
            return;
        }

        // This will explode in the future
        // @todo Make sure we're not always selecting by value ;)
        $( 'input[value="' + savedAnswer + '"]' ).prop( 'checked', 'checked' );

    });
}
