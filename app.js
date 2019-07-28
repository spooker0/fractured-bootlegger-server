// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const express = require('express');
const app = express();

const config = require('./config.js');
const accounts = require('./controllers/accounts.js');
const mailer = require('./controllers/mailer.js');

// App config
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/static'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
        secret: '584be688-f388-4bea-a500-b28f26364712',
        proxy: true,
        resave: true,
        saveUninitialized: true,
        store: new MongoStore({url: config.mongoUrl + config.mongoDb + '?authSource=admin'})
    })
);

app.get('/', (req, res) => {
    // check if the user has an auto login key saved in a cookie //
    if (req.cookies.login === undefined) {
        res.render('login', {title: 'Login'});
    } else {
        accounts.validateLoginKey(req.cookies.login, req.ip, function (error, result) {
            if (result) {
                accounts.autoLogin(result.email, result.pass, function (loginResult) {
                    req.session.user = loginResult;
                    res.redirect('/home');
                });
            } else {
                res.render('login', {title: 'Login'});
            }
        });
    }
});

app.post('/autologin', (req, res) => {
    accounts.validateLoginKey(req.body.cookie, req.ip, function (error, result) {
        if (result) {
            accounts.autoLogin(result.email, result.pass, function (loginResult) {
                if (!loginResult) {
                    res.status(400).send('auto-login-failed');
                }

                req.session.user = loginResult;

                let sendResult = {
                    user: loginResult.user,
                    email: loginResult.email,
                    _id: loginResult._id
                };

                res.status(200).send(sendResult);
            });
        } else {
            res.status(400).send(error);
        }
    });
});

app.post('/', (req, res) => {
    accounts.manualLogin(req.body.email, req.body.pass, (error, result) => {
        if (!result) {
            res.status(400).send(error);
        } else {
            req.session.user = result;

            let sendResult = {
                user: result.user,
                email: result.email,
                _id: result._id
            };

            if (req.body['remember-me'] === 'false') {
                res.status(200).send(sendResult);
            } else {
                accounts.generateLoginKey(result.email, req.ip, function (key) {
                    res.cookie('login', key, {maxAge: 900000});
                    sendResult.cookie = key;
                    res.status(200).send(sendResult);
                });
            }
        }
    });
});

app.get('/home', (req, res) => {
    if (req.session.user === null) {
        res.redirect('/');
    } else {
        res.render('home', {
            title: 'Home',
            udata: req.session.user
        });
    }
});

app.post('/home', (req, res) => {
    if (req.session.user == null) {
        res.redirect('/');
    } else {
        accounts.updateAccount({
            id: req.session.user._id,
            user: req.body.user,
            pass: req.body.pass,
        }, function (error, result) {
            if (error) {
                res.status(400).send('error-updating-account');
            } else {
                req.session.user = result.value;
                res.status(200).send('ok');
            }
        });
    }
});

app.get('/register', (req, res) => {
    res.render('register', {title: 'Register', creation: true});
});

app.post('/register', (req, res) => {
    accounts.addNewAccount({
        user: req.body.user,
        email: req.body.email,
        pass: req.body.pass
    }, (error) => {
        if (error) {
            res.status(400).send(error);
        } else {
            res.status(200).send('ok');
        }
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('login');
    req.session.destroy(function (e) {
        res.status(200).send('ok');
    });
});

app.post('/delete', (req, res) => {
    accounts.deleteAccount(req.session.user._id, (error, result) => {
        if (!error) {
            res.clearCookie('login');
            req.session.destroy(function (e) {
                res.status(200).send('ok');
            });
        } else {
            res.status(400).send('record not found');
        }
    });
});

app.get('/reset-password', function (req, res) {
    accounts.validatePasswordKey(req.query.key, req.ip, (error, result) => {
        if (error || result == null) {
            res.redirect('/');
        } else {
            req.session.passKey = req.query.key;
            res.render('reset', {title: 'Reset Password'});
        }
    })
});

app.post('/reset-password', function (req, res) {
    let newPass = req.body.pass;
    let passKey = req.session.passKey;

    req.session.destroy();
    accounts.updatePassword(passKey, newPass, function (error, result) {
        if (result) {
            res.status(200).send('ok');
        } else {
            res.status(400).send('unable to update password');
        }
    })
});

app.post('/lost-password', function (req, res) {
    let email = req.body.email;
    accounts.generatePasswordKey(email, req.ip, function (error, account) {
        if (error) {
            res.status(400).send(error);
        } else {
            mailer.sendResetPasswordLink(account, function (error, message) {
                if (!error) {
                    res.status(200).send('ok');
                } else {
                    console.log(error);
                    res.status(400).send('unable to dispatch password reset');
                }
            });
        }
    });
});


app.all('*', function (req, res) {
    res.render('404', {title: 'Page Not Found'});
});

// Certificate
if (config.isEncryptedServer) {
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/doublecolossus.com/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/doublecolossus.com/cert.pem', 'utf8');
    const ca = fs.readFileSync('/etc/letsencrypt/live/doublecolossus.com/chain.pem', 'utf8');

    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };

    const httpsServer = https.createServer(credentials, app);

    httpsServer.listen(443, () => {
        console.log('HTTPS Server running on port 443');
    });
} else {
    const httpServer = http.createServer(app);

    httpServer.listen(80, () => {
        console.log('HTTP Server running on port 80');
    });
}