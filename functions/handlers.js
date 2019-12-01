bot = require("./bot")
const Telegraf = require('telegraf')
const game = require("./game")
const storage = require("./storage")

const max_in_line = 7

const url = 'ksibot.com'

const load_game_data = (message) => {
    if (message) {
        const text_links = message.entities.filter((ent) => ent.type == 'text_link')
        if (text_links) {
            const url = new URL(text_links[0].url)
            const board_in_base64 = url.searchParams.get('board')
            return game.load_data(board_in_base64)
        }
    } else return {}
}

const single_choose_pattern = /(?<action>.)(?<x>\d)(?<y>\d)/

const in_line_symbols = ['Р', 'Е', 'С', 'П', 'У', 'Б', 'Л', 'И', 'К', 'А']
const in_column_symbols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const single_board_buttons = (game_data) => game_data && Telegraf.Extra.markup((markup) =>
    markup.inlineKeyboard(
        [
            [markup.callbackButton('🚢', 'e')]
            .concat(in_line_symbols.slice(game_data.move, max_in_line + game_data.move).map((symbol) => markup.callbackButton(symbol, 'e')))
        ].concat(
            game_data.board.map((line, y) => [markup.callbackButton(in_column_symbols[y], 'e')]
                .concat(line.slice(game_data.move, max_in_line + game_data.move).map((val, x) => markup.callbackButton(val ? '⬜️' : ' ', `s${x + game_data.move}${y}`)))))
        .concat([
            [markup.callbackButton('⬅️', 'h'), markup.callbackButton('➡️', 'f')]
        ])
        .concat([
            [markup.callbackButton('Use it', 'k')]
        ])
    )
)

const board_buttons = (game_data) => game_data && Telegraf.Extra.markup((markup) =>
    markup.inlineKeyboard(
        [
            [markup.callbackButton('🚢', 'e')]
            .concat(in_line_symbols.slice(game_data.move, max_in_line + game_data.move).map((symbol) => markup.callbackButton(symbol, 'e')))
        ].concat(
            game_data.board.map((line, y) => [markup.callbackButton(in_column_symbols[y], 'e')]
                .concat(line.slice(game_data.move, max_in_line + game_data.move).map((val, x) => markup.callbackButton((!val && ' ') || (val == 1 && '▪️') || (val == 2 && '🔳'), `c${x + game_data.move}${y}`)))))
        .concat([
            [markup.callbackButton('⬅️', 'l'), markup.callbackButton('➡️', 'r')]
        ])
    )
)

const handle_error_to_callback_query = (ctx) => ctx.answerCbQuery('STOP SPAM!!!')

const hidden_url = (game_data) => `<a href="${url}?board=${game.to_data(game_data)}">.</a>`

const single_board_text = (game_data, from_id) => `Set your ships for battle with ${user_url((game_data.second.id == from_id && game_data.first) || (game_data.first.id == from_id && game_data.second))}${hidden_url(game_data)}`

const update_single_board = (ctx, game_data) => {
    ctx.editMessageText(single_board_text(game_data, ctx.update.callback_query.from.id), single_board_buttons(game_data).HTML()).catch((e) => {
        handle_error_to_callback_query(ctx)
    })
}

bot.hears(/\/start join\_(.+)/, (ctx) =>
    storage.load_game(ctx.match[1]).then((game_) => {
        const me = (game_.second.id == ctx.update.message.from.id && 'second') || (game_.first.id == ctx.update.message.from.id && 'first')
        if (me) {
            const game_data = game.new_single_board_data()
            game_data.id = game_.id
            game_data.me = me
            game_data.first = {
                id: game_.first.id,
                name: game_.first.name
            }
            game_data.second = {
                id: game_.second.id,
                name: game_.second.name
            }
            ctx.reply(single_board_text(game_data, ctx.update.message.from.id), single_board_buttons(game_data).HTML())
        }
    }).catch(ctx.reply)
)

bot.on('callback_query', (ctx) => {
    const action = ctx.update.callback_query.data.charAt(0);
    try {
        return actions[action] && actions[action](ctx)
    } catch (e) {
        console.log(e)
    }
})

const load_game = (ctx, func) => {
    storage.load_game(ctx.update.callback_query.inline_message_id).then((game_) => func(game_)).catch((e) => {
        ctx.answerCbQuery(e)
    })
}

const user_url = (user) => user && `<a href="tg://user?id=${user.id}">${user.name}</a>`

const update_error = (e) => console.log(e)

const update_join_game_status = (game_data) => {
    const text = `First: ${user_url(game_data.first)}${game_data.first.ready? ' ✅': ''}\nSecond: ${game_data.second ? user_url(game_data.second) + (game_data.second.ready? ' ✅': ''): '❔\nWaiting for second player...'}`
    const buttons = game_data.second ? ((game_data.first.ready && game_data.second.ready) ? start_game_button : set_ships_button(game_data)) : join_game_button
    bot.telegram.editMessageText(null, null, game_data.id, text, buttons.HTML()).catch(update_error)
}

const update_game = (game_data) => {
    const text = `${game_data.now == 'first'? '➡️': ''}${user_url(game_data.first)}\n${game_data.now == 'second'? '➡️': ''}${user_url(game_data.second)}`
    const buttons = board_buttons(game_data)
    bot.telegram.editMessageText(null, null, game_data.id, text, buttons.HTML()).catch(update_error)
}

const start_game_button = Telegraf.Extra.markup((markup) =>
    markup.inlineKeyboard(
        [
            [markup.callbackButton('Start game', 'n')]
        ]
    )
)

const actions = {
    s: (ctx) => {
        const game_data = load_game_data(ctx.update.callback_query.message)
        const {
            x,
            y
        } = ctx.update.callback_query.data.match(single_choose_pattern).groups
        if (game_data.board[y][x]) {
            game_data.board[y][x] = 0
        } else {
            game_data.board[y][x] = 1
        }
        update_single_board(ctx, game_data)
        ctx.answerCbQuery(' ')
    },
    h: (ctx) => {
        const game_data = load_game_data(ctx.update.callback_query.message)
        if (game_data.move <= 0) {
            ctx.answerCbQuery('No way')
        } else {
            game_data.move -= 1;
            update_single_board(ctx, game_data)
            ctx.answerCbQuery(' ')
        }
    },
    f: (ctx) => {
        const game_data = load_game_data(ctx.update.callback_query.message)
        if (game_data.move + max_in_line >= 10) {
            ctx.answerCbQuery('No way')
        } else {
            game_data.move += 1;
            update_single_board(ctx, game_data)
            ctx.answerCbQuery(' ')

        }
    },
    k: (ctx) => {
        const game_data = load_game_data(ctx.update.callback_query.message)
        if (game_data && game_data.board)
            game.check_game_board(game_data.board).then((ships) => {
                storage.load_game(game_data.id).then((game_) => {
                    if (game_.is_started) {
                        ctx.answerCbQuery('Game is started')
                    } else {
                        game_[game_data.me].ships = ships
                        if (!game_[game_data.me].ready) {
                            game_[game_data.me].ready = true
                            update_join_game_status(game_)
                        }
                        storage.save_game(game_)
                        ctx.answerCbQuery('Saved')
                    }
                })
            }).catch((e) => ctx.answerCbQuery(e))
    },
    e: (ctx) => ctx.answerCbQuery(' '),
    j: (ctx) => {
        load_game(ctx, (game_) => {
            if (game_.first.id == ctx.update.callback_query.from.id) {
                return ctx.answerCbQuery('No you')
            }
            if (game_.second) {
                return ctx.answerCbQuery('What are you doing?')
            }
            game_.second = {
                id: ctx.update.callback_query.from.id,
                name: ctx.update.callback_query.from.first_name + (ctx.update.callback_query.from.last_name ? ' ' + ctx.update.callback_query.from.last_name : '')
            }
            storage.save_game(game_)
            update_join_game_status(game_)
        })
    },
    n: (ctx) => {
        check_user(ctx, (game_) => {
            const board = game.start_new_game(game_)
            update_game(board)
            storage.save_game(game_)
        })
    },
    c: (ctx) => {
        const {
            x,
            y
        } = ctx.update.callback_query.data.match(single_choose_pattern).groups
        check_user(ctx, (game_) => {
            game.process_game(game_, x, y).then((board) => {
                update_game(board)
                storage.save_game(game_)
                ctx.answerCbQuery(' ')
            }).catch((e) => {
                if (e == 'end') {
                    ctx.editMessageText(`${user_url(game_[game_.now])} won!!!`, Telegraf.Extra.HTML())
                    storage.delete_game(game_)
                } else {
                    ctx.answerCbQuery(e)
                }
            })
        })
    },
    l: (ctx) => {
        check_user(ctx, (game_) => {
            if (game_[game_.now].move <= 0) {
                ctx.answerCbQuery('No way')
            } else {
                game_[game_.now].move -= 1
                update_game(game.clear_board(game_))
                storage.save_game(game_)
                ctx.answerCbQuery(' ')
            }
        })
    },
    r: (ctx) => {
        check_user(ctx, (game_) => {
            if (game_[game_.now].move + max_in_line >= 10) {
                ctx.answerCbQuery('No way')
            } else {
                game_[game_.now].move += 1
                update_game(game.clear_board(game_))
                storage.save_game(game_)
                ctx.answerCbQuery(' ')
            }
        })
    },
}

const check_user = (ctx, func) => {
    load_game(ctx, (game_) => {
        const user_id = ctx.update.callback_query.from.id
        if (user_id == game_.first.id || user_id == game_.second.id) {
            if (!game_.now) {
                func(game_)
            } else if (game_[game_.now].id == user_id) {
                func(game_)
            } else {
                return ctx.answerCbQuery('It is not your turn')
            }
        } else {
            return ctx.answerCbQuery('No you')
        }
    })
}

let bot_name = null

bot.telegram.getMe().then((name) => {
    bot_name = name.username
})

const set_ships_button = (game) => Telegraf.Extra.markup((markup) =>
    markup.inlineKeyboard(
        [
            [markup.urlButton('Set ships', `https://t.me/${bot_name}?start=join_${game.id}`)]
        ]
    )
)

const new_game = (first_user, game_id) => {
    return {
        id: game_id,
        first: {
            id: first_user.id,
            name: first_user.first_name + (first_user.last_name ? ' ' + first_user.last_name : '')
        }
    }
}

const join_game_button = Telegraf.Extra.markup((markup) =>
    markup.inlineKeyboard(
        [
            [markup.callbackButton('Join game', 'j')]
        ]
    )
)

bot.on('inline_query', (ctx) => {
    const results = [{
        type: 'article',
        id: 0,
        title: 'New game',
        input_message_content: {
            message_text: `Loading...`,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        },
        reply_markup: join_game_button.reply_markup // NO DEL
    }]
    ctx.answerInlineQuery(results)
})


bot.on('chosen_inline_result', (ctx) => {
    const game_data = new_game(ctx.update.chosen_inline_result.from, ctx.update.chosen_inline_result.inline_message_id)
    if (game_data) {
        storage.save_game(game_data)
        update_join_game_status(game_data)
    }
})

module.exports = bot