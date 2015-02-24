/* Javascript for PeerInstructionXBlock. */
function PeerInstructionXBlock(runtime, element, data) {
    "use strict";

    var handlerUrl = runtime.handlerUrl(element, 'submit_answer');
    var submitButton = $('.ubcpi_submit', element);

    var enableSubmit = function () {
        $('.ubcpi_submit', element).removeAttr('disabled');
    };

    $('input[type="radio"]', element).click(function (eventObject) {
        var clicked = this;
        var answer = clicked.value;
        console.log("Submitting ", answer);
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"q": answer}),
            success: function ( data, textStatus, jqXHR ) {
                enableSubmit();
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
        else {
            enableSubmit();
        }

        $('input[value="' + savedAnswer + '"]', element).prop( 'checked', 'checked' );

    });
}
