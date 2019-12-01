const bot = require('./handlers')

module.exports = (req, res) => {
    bot.handleUpdate(req.body, res).then(() => {
        res.end('ok');
    })
}