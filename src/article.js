var Article = require('./model.js').Article
const isLogin = require('./middleware').isLogin

let articleId = new Date().getTime()

const findAuthor = (author, callback) => {
    Article.find({
        author: author
    }).exec((err, items) => {
        callback(items)
    })
}

const findID = (id, callback) => {
    Article.find({
        _id: id
    }).exec((err, items) => {
        callback(items)
    })
}

const sendArticleById = (res, id) => {
    findID(id, (results) => {
        if (results.length != 1) {
            res.send(400)
        }
        else {
            res.send({
                articles: results
            })
        }
    })
}

// post a new comment under an article
const postComment = (articleId, commentId, text, author, callback) => {
    Article.update(
        { _id: articleId },
        {
            $push: {
                comments: {
                    $each: [{
                        commentId: commentId,
                        author: author,
                        text: text,
                        date: new Date().getTime()
                    }],
                    $sort: { commentId: 1 }
                }
            }
        }
    ).exec((err) => {
        callback(err)
    })
}

// edit an article by id
const updateArticle = (id, text, callback) => {
    Article.update(
        { _id: id },
        {
            $set: { text: text }
        }
    ).exec((err) => {
        callback(err)
    })
}

// GET handler -> /articles
const getArticles = (req, res) => {
    if (req.params.id === undefined) {
        Article.find().exec((err, items) => {
            res.send({
                articles: items
            })
        })
    } else if (isNaN(req.params.id)) {
        findAuthor(req.params.id, (results) => {
            res.send({
                articles: results
            })
        })
    } else {
        findID(req.params.id, (results) => {
            res.send({
                articles: results
            })
        })
    }
}

// PUT handler -> /articles
const putArticles = (req, res) => {
    if (req.params.id === undefined || req.body.text === undefined) {
        return res.status(400).send('Bad Request')
    } else {
        if (req.params.id.match(/^\d/)) {
            findID(req.params.id, (result) => {
                if (result.length != 1) {
                    res.status(400).send('Bad Request')
                }
                else {
                    let article = result[0]
                    if (!req.body.commentId) {
                        if (article.author !== req.user) {
                            res.status(403).send('Forbidden')
                        }
                        else {
                            updateArticle(req.params.id, req.body.text,
                                () => sendArticleById(res, req.params.id))
                        }
                    }
                    else if (req.body.commentId == -1) {
                        let commentId = articleId + 1
                        articleId += 1
                        postComment(req.params.id, commentId, req.body.text,
                            req.user, () => sendArticleById(res, req.params.id))
                    }
                    else {
                        Article.findOne({ _id: req.params.id },
                            {
                                comments: {
                                    $elemMatch:
                                    { commentId: req.body.commentId }
                                }
                            }
                        ).exec((err, item) => {
                            if (item.comments[0].author !== req.user) {
                                res.status(403).send('Forbidden')
                            }
                            else {
                                sendArticleById(res, req.params.id)
                            }
                        })
                    }
                }
            })
        } else {
            res.status(400).send('Bad Request')
        }
    }
}

// POST handler -> /article
const postArticle = (req, res) => {
    if (typeof req.body.text !== 'string') {
        return res.status(400).send('Bad request')
    } else {
        let newArticle = {
            _id: articleId,
            author: req.user,
            img: null,
            date: new Date().getTime(),
            comments: [],
            text: req.body.text
        }
        new Article(newArticle).save()

        articleId += 1
        res.send({
            articles: [newArticle]
        })
    }
}

module.exports = (app) => {
    app.get('/articles/:id?', isLogin, getArticles)
    app.put('/articles/:id', isLogin, putArticles)
    app.post('/article', isLogin, postArticle)
}