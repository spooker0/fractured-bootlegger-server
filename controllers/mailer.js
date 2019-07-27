const sendgridMail = require('@sendgrid/mail');
const config = require('../config.js');

sendgridMail.setApiKey(config.sendgridApiKey);

let mailer = {};

mailer.sendResetPasswordLink = function (account, callback) {
    const message = {
        to: account.email,
        from: 'no-reply@doublecolossus.com',
        subject: 'Fractured Bootlegger Password Reset',
        html: mailer.craftMessage(account)
    };
    sendgridMail.send(message, (error, result) => {
        callback(error, result);
    });
};

mailer.craftMessage = function (account) {
    let html = "<html><body>";
    html += "Hi " + account.user + ",<br><br>";
    html += "Your email for logging in is <b>" + account.email + "</b><br><br>";
    html += "<a href='" + config.siteUrl + '/reset-password?key=' + account.passKey + "'>Click here to reset your password</a><br><br>";
    html += "For further questions or troubleshooting, ask in Discord";
    return html;
};

module.exports = mailer;

