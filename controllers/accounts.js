const bcrypt = require('bcrypt');
const moment = require('moment');
const guid = require('uuid/v4');
const MongoClient = require('mongodb').MongoClient;

const config = require('../config.js');

let db, accounts;

MongoClient.connect(config.mongoUrl, {useNewUrlParser: true}, function (error, client) {
    if (error) {
        console.log(error);
    } else {
        db = client.db(config.mongoDb);
        accounts = db.collection('accounts');
        accounts.createIndex({user: 1, email: 1});
    }
});

/*
	Login
*/
exports.autoLogin = function (email, pass, callback) {
    accounts.findOne({email: email}, function (error, result) {
        if (result && result.pass === pass) {
            callback(result);
        } else {
            callback(null);
        }
    });
};

exports.manualLogin = function (email, pass, callback) {
    accounts.findOne({email: email}, function (error, result) {
        if (result === null) {
            callback('user-not-found');
        } else {
            validatePassword(pass, result.pass, function (error, response) {
                if (response) {
                    callback(null, result);
                } else {
                    callback('invalid-password');
                }
            });
        }
    });
};

exports.generateLoginKey = function (email, ipAddress, callback) {
    let cookie = guid();
    accounts.findOneAndUpdate({email: email}, {
        $set: {
            ip: ipAddress,
            cookie: cookie
        }
    }, {returnOriginal: false}, function (error, result) {
        if (error)
            console.log(error);
        callback(cookie);
    });
};

exports.validateLoginKey = function (cookie, ipAddress, callback) {
    accounts.findOne({cookie: cookie, ip: ipAddress}, callback);
};

exports.generatePasswordKey = function (email, ipAddress, callback) {
    let passKey = guid();
    accounts.findOneAndUpdate({email: email}, {
        $set: {
            ip: ipAddress,
            passKey: passKey
        }, $unset: {cookie: ''}
    }, {returnOriginal: false}, function (error, result) {
        if (result.value != null) {
            callback(null, result.value);
        } else {
            callback(error || 'account not found');
        }
    });
};

exports.validatePasswordKey = function (passKey, ipAddress, callback) {
    accounts.findOne({passKey: passKey, ip: ipAddress}, callback);
};

/*
	CRUD
*/
exports.addNewAccount = function (newData, callback) {
    accounts.findOne({email: newData.email}, function (error, result) {
        if (result) {
            callback('email-taken');
        } else {
            saltAndHash(newData.pass, function (hash) {
                newData.pass = hash;
                newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
                newData.guid = guid();
                accounts.insertOne(newData, callback);
            });
        }
    });
};

exports.updateAccount = function (newData, callback) {
    let findOneAndUpdate = function (data) {
        let update = {
            user: data.user
        };
        if (data.pass)
            update.pass = data.pass;
        accounts.findOneAndUpdate({_id: getObjectId(data.id)}, {$set: update}, {returnOriginal: false}, callback);
    };
    if (newData.pass === '') {
        findOneAndUpdate(newData);
    } else {
        saltAndHash(newData.pass, function (hash) {
            newData.pass = hash;
            findOneAndUpdate(newData);
        });
    }
};

exports.updatePassword = function (passKey, newPass, callback) {
    saltAndHash(newPass, function (hash) {
        newPass = hash;
        accounts.findOneAndUpdate({passKey: passKey}, {
            $set: {pass: newPass},
            $unset: {passKey: ''}
        }, {returnOriginal: false}, callback);
    });
};

/*
	Management
*/
exports.getAllRecords = function (callback) {
    accounts.find().toArray(
        function (e, res) {
            if (e) callback(e)
            else callback(null, res)
        });
};

exports.deleteAccount = function (id, callback) {
    accounts.deleteOne({_id: getObjectId(id)}, callback);
};

exports.deleteAllAccounts = function (callback) {
    accounts.deleteMany({}, callback);
};

/*
	Bcrypt security
*/
let saltAndHash = function (pass, callback) {
    bcrypt.hash(pass, 10, function (error, hash) {
        callback(hash);
    });
};

let validatePassword = function (plainPass, hashedPass, callback) {
    bcrypt.compare(plainPass, hashedPass, function (error, result) {
        callback(null, result);
    });
};

let getObjectId = function (id) {
    return new require('mongodb').ObjectID(id);
};

let listIndexes = function () {
    accounts.indexes(null, function (e, indexes) {
        for (var i = 0; i < indexes.length; i++)
            console.log('index:', i, indexes[i]);
    });
};
