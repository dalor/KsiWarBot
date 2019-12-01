const db = require('./db')

const save_game = (game) => {
    db.collection('games').doc(game.id).set(game)
}

exports.save_game = save_game

const load_game = (game_id) => new Promise((resolve, reject) => {
    db.collection('games').doc(game_id).get().then((doc) => {
        if (!doc.exists) {
            reject('No such game')
        } else {
            resolve(doc.data())
        }
    }).catch(err => {
        console.log('Error getting document', err);
    });
})

exports.load_game = load_game

const delete_game = (game) => {
    db.collection('games').doc(game.id).delete()
}

exports.delete_game = delete_game