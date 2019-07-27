$(document).ready(function () {
    let resetValidator = new ResetValidator();

    $('#set-password-form').ajaxForm({
        beforeSubmit: () => {
            resetValidator.hideAlert();
            return resetValidator.validatePassword($('#pass-tf').val());
        },
        success: () => {
            let resetPasswordSubmit = $('#set-password-submit');
            resetPasswordSubmit.addClass('disabled');
            resetPasswordSubmit.prop('disabled', true);
            resetValidator.showSuccess("Your password has been reset.");
            setTimeout(function () {
                window.location.href = '/';
            }, 3000);
        },
        error: function () {
            resetValidator.showAlert("I'm sorry something went wrong, please try again.");
        }
    });

    let resetPasswordModal = $('#set-password');
    resetPasswordModal.modal('show');
    resetPasswordModal.on('shown', function () {
        $('#pass-tf').focus();
    });
});
