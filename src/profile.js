var Profile = require('./model.js').Profile
const uploadImage = require('./uploadCloudinary')
const isLogin = require('./middleware').isLogin

const getIndex = (req, res) => {
    res.send("hello world")
}

const findUsername = (username, callback) => {
    Profile.find({
        username: username
    }).exec((err, items) => {
        if (items && items.length === 1) {
            callback(items[0])
        }
        else {
            callback({})
        }
    })
}

const findUsernames = (usernames, callback) => {
    Profile.find({
        username: { $in: usernames }
    }).exec((err, items) => {
        callback(items)
    })
}

const updateProfile = (username, field, value, callback) => {
    Profile.update(
        { username: username },
        {
            $set: { [field]: value }
        }
    ).exec((err) => {
        callback(value)
    })
}

const putHeadline = (req, res) => {
    if (req.body && req.body.headline) {
        updateProfile(req.user, 'headline', req.body.headline, (value) => {
            res.send({
                username: req.user,
                headline: value
            })
        })
    } else {
        res.sendStatus(400)
    }
}

const getHeadline = (req, res) => {
    const users = req.params.users ? req.params.users.split(',') : [req.user]
    findUsernames(users, (results) => {
        let headlines = results.map((profile) => {
            return {
                username: profile.username,
                headline: profile.headline
            }
        })
        res.send({
            headlines: headlines
        })
    })
}

const getEmail = (req, res) => {
    const user = req.params.user ? req.params.user : req.user
    findUsername(user, (profile) => {
        res.send({
            username: user,
            email: profile.email
        })
    })

}

const putEmail = (req, res) => {
    if (req.body && req.body.email) {
        updateProfile(req.user, 'email', req.body.email, (value) => {
            res.send({
                username: req.user,
                email: value
            })
        })
    } else {
        res.sendStatus(400)
    }
}

const getDob = (req, res) => {
    findUsername(req.user, (profile) => {
        res.send({
            username: req.user,
            dob: profile.dob
        })
    })
}

const getZipcode = (req, res) => {
    const user = req.params.user ? req.params.user : req.user
    findUsername(user, (profile) => {
        res.send({
            username: user,
            zipcode: profile.zipcode
        })
    })
}

const putZipcode = (req, res) => {
    if (req.body && req.body.zipcode) {
        updateProfile(req.user, 'zipcode', req.body.zipcode, (value) => {
            res.send({
                username: req.user,
                zipcode: value
            })
        })
    } else {
        res.sendStatus(400)
    }
}

const getAvatars = (req, res) => {
    const users = req.params.users ? req.params.users.split(',') : [req.user]
    findUsernames(users, (results) => {
        let avatars = results.map((profile) => {
            return {
                username: profile.username,
                avatar: profile.avatar
            }
        })
        res.send({
            avatars: avatars
        })
    })
}

const putAvatar = (req, res) => {
    if (req.fileurl) {
        updateProfile(req.user, 'avatar', req.fileurl, (value) => {
            res.send({
                username: req.user,
                avatar: value
            })
        })
    } else {
        res.sendStatus(400)
    }
}

exports = (app) => {
    app.get('/dob', isLogin, getDob)
    app.put('/zipcode', isLogin, putZipcode)
    app.get('/zipcode/:user?', isLogin, getZipcode)
    app.put('/email', isLogin, putEmail)
    app.get('/email/:user?', isLogin, getEmail)
    app.put('/avatar', [isLogin, uploadImage('avatar')], putAvatar)
    app.get('/avatars/:users*?', isLogin, getAvatars)
    app.put('/headline', isLogin, putHeadline)
    app.get('/headline', isLogin, getHeadline)
    app.get('/headlines/:users*?', isLogin, getHeadline)
    app.get('/', getIndex)
}

exports.findUsername = findUsername
module.exports = exports