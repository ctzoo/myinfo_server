const express = require('express')
const bodyParser = require('body-parser')
const oauthServer = require('oauth2-server')
const jwt = require('jsonwebtoken')
const myInfoApi = require('./api')
const clients = require('./clients.json')
const template = require('./template.json')

const app = express();
const secret = 'secret'

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.oauth = oauthServer({
    model: require('./model'),
    grants: ['client_credentials'],
    debug: true
});

app.all('/oauth/token', app.oauth.grant());

app.get('/', app.oauth.authorise(), (req, res) => {
    const user = req.user
    const state = jwt.sign({
        clientId: user.clientId,
        templateId: req.query.templateId
    }, secret)
    const attributes = template[req.query.templateId]
    res.redirect(myInfoApi.getAuthoriseUrl(state, user.purpose, attributes))
});

app.get('/callback', (req, res) => {
    const data = req.query
    const state = jwt.verify(data.state, secret)
    const users = clients.filter(item => item.clientId === state.clientId)
    const attributes = template[state.templateId]
    if (!users.length) {
        res.send({
            status: "ERROR",
            msg: "NO CLIENT INFORMATION"
        })
    } else {
        const user = users[0]
        myInfoApi.getTokenApi(data.code)
            .then(token => myInfoApi.getPersonApi(token.access_token, attributes))
            .then(message => {
                // TODO 错误码的返回
                res.redirect(`${user.redirectUrl}?data=${jwt.sign(message, user.clientSecret)}`)
            })
            .catch(e => {
                // TODO 错误码的返回
                res.redirect(`${user.redirectUrl}?data=${jwt.sign(e, user.clientSecret)}`)
            })
    }
});

app.use(app.oauth.errorHandler());

app.listen(3001);