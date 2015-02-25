function PIEdit(runtime, element) {
    var self = this;
    var notify;

    // The workbench doesn't support notifications.
    notify = typeof(runtime.notify) != 'undefined';

    this.init = function () {
        $(element).find('.cancel-button', element).bind('click', function () {
            runtime.notify('cancel', {});
        });

        $(element).find('#pi-submit-options', element).bind('click', self.piEditSubmitHandler);
    };

    this.piEditSubmitHandler = function () {
        // Take all of the fields, serialize them, and pass them to the
        // server for saving.
        var handlerUrl = runtime.handlerUrl(element, 'studio_submit');

        var data = {};

        data['question_text'] = $('#pi-question-text', element).val();
        data['options'] = $('input.pi-options', element).map(function(i, e) {
            return $(e).val();
        }).get();

        if (notify) {
            runtime.notify('save', {state: 'start', message: "Saving"});
        }

        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify(data),
            // There are issues with using proper status codes at the moment.
            // So we pass along a 'success' key for now.
            success: function (result) {
                if (result['success'] && notify) {
                    runtime.notify('save', {state: 'end'})
                } else if (notify) {
                    runtime.notify('error', {
                        'title': 'Error saving question',
                        'message': self.format_errors(result['errors'])
                    });
                }
            }
        });
    }

    self.init();
}

