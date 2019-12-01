const functions = require('firebase-functions');

const webhook = require('./webhook')

exports.webhook = functions.https.onRequest(webhook);
