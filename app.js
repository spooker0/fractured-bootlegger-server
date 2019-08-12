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

require('./controllers/auth.js')(app);

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