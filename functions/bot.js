const Telegraf = require('telegraf')

const functions = require('firebase-functions');

const BOT_TOKEN = functions.config().bot.token

const bot = new Telegraf(BOT_TOKEN)

module.exports = bot