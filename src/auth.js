const bcrypt = require('bcrypt')
const md5 = require('md5')
var redis = require('redis').createClient(process.env.REDIS_URL)
var Profile = require('./model.js').Profile
const isLogin = require('./middleware').isLogin
var models = require('./model.js')
var User = require('./model.js').User

const isLoggedIn = (req, res, next) => {
    var sid = req.cookies['sessionId']
    if (!sid) {
        next()
    } else {
        redis.hgetall(sid, (err, usernameObj) => {
            if (err) {
                console.log(err)
            }
            if (usernameObj) {
                req.user = usernameObj.username
            }
            next()
        })
    }
}

const saltRounds = 10;
const cookieKey = 'sessionId'

// handler for POST /login
const login = (req, res) => {
    if (req.user) {
        redis.del(req.cookies[cookieKey])
    }
    if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
        return res.status(400).send('Bad request.')
    } else {
        let username = req.body.username
        let password = req.body.password
        User.find({
            username: username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
                return res.status(500).send('Internal server error.')
            } else if (result.length === 0) {
                res.sendStatus(400).send('Username not registered.')
            } else {
                let currUser = result[0];
                let storedHash = bcrypt.hashSync(password, currUser.salt)
                if (storedHash !== currUser.hash) {
                    return res.status(401).send('Password incorrect.')
                }
                else {
                    let sessionKey = md5(username + new Date().getTime())
                    res.cookie(cookieKey, sessionKey, {
                        maxAge: 3600 * 1000,
                        httpOnly: true
                    })
                    redis.hmset(sessionKey, { username: username })
                    return res.send({
                        username: username,
                        result: "success"
                    })
                }
            }
        })
    }
}

// handler for POST /register
const register = (req, res) => {
    if (typeof req.body.username !== 'string'
        || typeof req.body.password !== 'string'
        || typeof req.body.email !== 'string'
        || typeof req.body.zipcode !== 'string'
        || typeof req.body.dob !== 'string') {
        return res.status(400).send('Bad request')
    } else {
        User.find({
            username: req.body.username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
                return res.status(500).send('Internal server error.')
            }
            if (result && result.length != 0) {
                res.sendStatus(401).send('Username already exists.')
            } else {
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(req.body.password, salt);
                new User({
                    username: req.body.username,
                    salt: salt,
                    hash: hash
                }).save()
                new Profile({
                    username: req.body.username,
                    email: req.body.email,
                    dob: req.body.dob,
                    following: [],
                    zipcode: req.body.zipcode,
                    phone: req.body.phone,
                    avatar: null,
                    headline: "Becoming a web developer!"
                }).save()
                res.send({
                    username: req.body.username,
                    result: "success"
                })
            }
        })
    }
}

// handler for PUT password
const password = (req, res) => {
    if (!(req.body && req.body.password)) {
        res.sendStatus(400)
    } else {
        redis.del(req.cookies[cookieKey])
        let username = req.user
        User.find({
            username: username
        }).exec(function (err, result) {
            if (err) {
                console.log(err)
            }
            if (result && result.length == 1) {
                let currentUser = result[0];
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(req.body.password, salt);
                User.update({
                    username: username
                }, {
                    username: username,
                    salt: salt,
                    hash: hash
                }).exec((err) => {
                    res.send({
                        username: username,
                        result: "success"
                    })
                })
            } else {
                res.sendStatus(400)
            }
        })
    }
}

// handler for PUT /logout
const logout = (req, res) => {
    redis.del(req.cookies[cookieKey], (err, response) => {
        if (response == 1) {
            res.clearCookie(cookieKey);
            res.sendStatus(200)
        } else {
            res.sendStatus(500)
        }
    })
}

exports = (app) => {
    app.put('/password', isLogin, password)
    app.put('/logout', isLogin, logout)
    app.post('/register', register)
    app.post('/login', login)
}

exports.isLoggedIn = isLoggedIn
module.exports = exports