const functions = require('firebase-functions');

const webhook = require('./webhook')

exports.webhook = functions
    .region('europe-west1')
    .https.onRequest(webhook);