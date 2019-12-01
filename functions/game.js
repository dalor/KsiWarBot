const to_data = (obj) => {
    return (new Buffer.from(JSON.stringify(obj))).toString('base64')
}

exports.to_data = to_data

const load_data = (str) => {
    return JSON.parse((new Buffer.from(str, 'base64')).toString())
}

exports.load_data = load_data

const new_board = () => {
    return [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
}

const new_single_board_data = () => {
    return {
        board: new_board(),
        move: 0
    }
}

exports.new_single_board_data = new_single_board_data

const copy_board = (board) => {
    return board.map((line) => line.map((val => val)))
}

const new_ship = () => {
    return {
        length: 0,
        dots: [],
        way: null
    }
}

const dot = (x, y) => {
    return {
        x: parseInt(x),
        y: parseInt(y)
    }
}

const check_game_board = (board_old) => new Promise((resolve, reject) => {
    const board = copy_board(board_old);
    const ships = {
        1: [],
        2: [],
        3: [],
        4: []
    }
    const find_full = (x, y, ship) => {
        const nx = 1 + parseInt(x)
        const ny = 1 + parseInt(y)
        if ((ny < 10 && nx < 10 && board[ny][nx]) || (x - 1 >= 0 && ny < 10 && board[ny][x - 1])) {
            reject('Other ship near diagonal')
        } else if (nx < 10 && board[y][nx] && ny < 10 && board[ny][x]) {
            reject('Ship in two ways')
        } else {
            ship.dots.push(dot(x, y))
            ship.length += 1
            board[y][x] = 0
            if (nx < 10 && board[y][nx] && (ship.way == null || ship.way == 0)) {
                ship.way = 0 //Вправо
                find_full(nx, y, ship)
            } else if (ny < 10 && board[ny][x] && (ship.way == null || ship.way == 1)) {
                ship.way = 1 //Вниз
                find_full(x, ny, ship)
            } else {
                if (ships[ship.length]) {
                    ships[ship.length].push(ship)
                } else {
                    reject('Unapropriate ship length')
                }
            }
        }
    }
    for (let y in board) {
        for (let x in board[y]) {
            if (board[y][x]) {
                find_full(x, y, new_ship())
            }
        }
    }
    if (ships[1].length != 4 || ships[2].length != 3 || ships[3].length != 2 || ships[4].length != 1) {
        reject(`1️⃣: ${4 - ships[1].length} | 2️⃣: ${3 - ships[2].length} | 3️⃣: ${2 - ships[3].length} | 4️⃣: ${1 - ships[4].length}`)
    } else {
        resolve(ships)
    }
})


exports.check_game_board = check_game_board

const new_board_with_lines = () => new_board().map((line) => {
    return {
        dots: line
    }
})

const start_new_game = (game_data) => {
    game_data.now = 'first'
    game_data.first.board = new_board_with_lines()
    game_data.first.move = 0
    game_data.second.board = new_board_with_lines()
    game_data.second.move = 0
    game_data.is_started = true
    return clear_board(game_data)
}

exports.start_new_game = start_new_game

const clear_board = (game_data) => {
    return {
        move: game_data[game_data.now].move,
        board: game_data[(game_data.now == 'first') ? 'second' : 'first'].board.map((line) => line.dots),
        id: game_data.id,
        first: {
            id: game_data.first.id,
            name: game_data.first.name
        },
        second: {
            id: game_data.second.id,
            name: game_data.second.name
        },
        now: game_data.now
    }
}

exports.clear_board = clear_board

const check_ship_is_dead = (ship) => {
    for (let dot of ship.dots) {
        if (!dot.dead) return false
    }
    return true
}

const near_dots = [dot(-1, -1), dot(0, -1), dot(1, -1), dot(1, 0), dot(1, 1), dot(0, 1), dot(-1, 1), dot(-1, 0)]

const make_ship_dead = (ship, board) => {
    ship.dead = true
    for (let dot_ of ship.dots) {
        for (let near_dot of near_dots) {
            const new_dot = dot(near_dot.x + dot_.x, near_dot.y + dot_.y)
            if (new_dot.x >= 0 && new_dot.x < 10 && new_dot.y >= 0 && new_dot.y < 10) {
                if (!board[new_dot.y].dots[new_dot.x]) {
                    board[new_dot.y].dots[new_dot.x] = 1
                }
            }
        }
    }
}

const check_all_ships_is_dead = (ships) => {
    for (let ship_id in ships) {
        for (let ship of ships[ship_id]) {
            if (!ship.dead) return false
        }
    }
    return true
}

const process_game = (game, x, y) => new Promise((resolve, reject) => {
    const now = game.now
    const next = (now == 'first') ? 'second' : 'first'
    if (game[next].board[y].dots[x]) {
        reject('You have already check it')
    } else {
        const next_user = game[next]
        for (let ship_list_id in next_user.ships) {
            for (let ship of next_user.ships[ship_list_id].filter((ship) => !ship.dead)) {
                for (let dot of ship.dots) {
                    if (dot.x == x && dot.y == y) {
                        next_user.board[y].dots[x] = 2
                        dot.dead = true
                        if (check_ship_is_dead(ship)) {
                            make_ship_dead(ship, next_user.board)
                            if (check_all_ships_is_dead(next_user.ships)) {
                                reject('end')
                            }
                        }
                        return resolve(clear_board(game))
                    }
                }
            }
        }
        next_user.board[y].dots[x] = 1
        game.now = next
        return resolve(clear_board(game))
    }
})

exports.process_game = process_game