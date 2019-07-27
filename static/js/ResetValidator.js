function ResetValidator() {
    this.modal = $('#set-password');
    this.modal.modal({show: false, keyboard: false, backdrop: 'static'});
    this.alert = $('#set-password .alert');
    this.alert.hide();
}

ResetValidator.prototype.validatePassword = function (password) {
    if (password.length >= 6) {
        return true;
    } else {
        this.showAlert('Password Should Be At Least 6 Characters');
        return false;
    }
};

ResetValidator.prototype.showAlert = function (message) {
    this.alert.attr('class', 'alert alert-danger');
    this.alert.html(message);
    this.alert.show();
};

ResetValidator.prototype.hideAlert = function () {
    this.alert.hide();
};

ResetValidator.prototype.showSuccess = function (message) {
    this.alert.attr('class', 'alert alert-success');
    this.alert.html(message);
    this.alert.fadeIn(500);
};
