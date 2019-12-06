const bot = require('./handlers')

module.exports = (req, res) => {
    bot.handleUpdate(req.body, res).then(() => {
        setTimeout(() => res.end('ok'), 1000)
    })
}