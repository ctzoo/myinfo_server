const express = require('express');
const bodyParser = require('body-parser');
const oauthServer = require('oauth2-server');
const jwt = require('jsonwebtoken');
const myInfoApi = require('./api');
const getClients = require('./data').getClients;
const getTemplate = require('./data').getTemplate;
const contentPath = require('config').get('content');
const oauthConfig = require('config').get('oauth');
const emitter = require('./emitter')

const app = express();
const router = express();

router.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

router.use(bodyParser.json());

router.oauth = oauthServer({
    model: require('./model'),
    grants: ['client_credentials'],
    accessTokenLifetime: oauthConfig.expire,
});

router.all('/oauth/token', router.oauth.grant());

router.get('/', router.oauth.authorise(), (req, res) => {
    // 回调增加state
    const user = req.user;
    const state = jwt.sign({
            clientId: user.clientId,
            templateId: req.query.templateId,
            state: req.query.state
        },
        oauthConfig.stateSecret
    );
    const template = getTemplate()[req.query.templateId];
    emitter.emit('token', req.query.state)
    res.redirect(myInfoApi.getAuthoriseUrl(state, user.purpose, template));
});

router.get('/callback*', (req, res) => {
    const data = req.query;
    const state = jwt.verify(data.state, oauthConfig.stateSecret);
    const users = getClients().filter(item => item.clientId === state.clientId);
    const template = getTemplate()[state.templateId];
    if (!users.length) {
        emitter.emit('warn', `Not find client[${state.clientId}]`);
        res.send({
            status: 'ERROR',
            msg: 'NO CLIENT INFORMATION',
        });
    } else {
        const user = users[0];
        emitter.emit('info', `Start get Token  >>>${data.code}`)
        myInfoApi
            .getTokenApi(data.code, template)
            .then(token => {
                emitter.emit('info', `Start get Person  >>>${token.access_token}`)
                return myInfoApi.getPersonApi(token.access_token, template)
            })
            .then(data => {
                // Myinfo平台接口记录来源系统、使用目的、客户NRIC/FIN, 提取数据的栏位名、提取时间
                emitter.emit('person', {
                    client: user.clientId,
                    purpose: user.purpose,
                    nric: data.msg.uinfin,
                    attributes: template.attributes
                })
                res.redirect(
                    `${user.redirectUrl}?state=${state.state}&data=${jwt.sign (data, user.clientSecret)}`
                );
            })
            .catch(e => {
                if (e.status) {
                    res.redirect(
                        `${user.redirectUrl}?state=${state.state}&data=${jwt.sign({status: e.status, msg: e.msg}, user.clientSecret)}`
                    );
                } else {
                    emitter.emit('error', `Response Error >>>${e.message}`)
                    res.redirect(
                        `${user.redirectUrl}?state=${state.state}&data=${jwt.sign({status: "ERROR", msg: "Network error"}, user.clientSecret)}`
                    );
                }
            });
    }
});

router.use(router.oauth.errorHandler());

app.use(`/${contentPath}`, router);

app.listen(3001);