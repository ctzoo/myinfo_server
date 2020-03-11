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
    emitter.emit('info', `Client Request query data: ${user.clientId} -> ${JSON.stringify(req.query)}`)
    const state = jwt.sign({
        clientId: user.clientId,
        templateId: req.query.templateId,
        state: req.query.state
    },
        oauthConfig.stateSecret
    );
    const template = getTemplate()[req.query.templateId];
    const loginType = req.query.loginType;
    const authoriseUrl = myInfoApi.getAuthoriseUrl(state, user.purpose, template, loginType);
    emitter.emit('info', `Client Request redirect: ${user.clientId} -> ${authoriseUrl}`)
    res.redirect(authoriseUrl);
});

router.get('/callback', (req, res) => {
    emitter.emit('info', `Myinfo Callback Start for Client---------------------------------------`)
    const data = req.query;
    emitter.emit('info', `Myinfo Callback Get data: ${JSON.stringify(data)}`)
    try {
        emitter.emit('info', `Myinfo Callback Verify state data start: ${JSON.stringify(data)}`)
        const state = jwt.verify(data.state, oauthConfig.stateSecret);
        emitter.emit('info', `Myinfo Callback Verify state data success: ${JSON.stringify(state)}`)
        const users = getClients().filter(item => item.clientId === state.clientId);
        const template = getTemplate()[state.templateId];
        if (!users.length) {
            emitter.emit('warn', `Myinfo Callback Not find client[${state.clientId}]`);
            res.send({
                status: 'ERROR',
                msg: `NO CLIENT[${state.clientId}] INFORMATION`,
            });
        } else if (!template) {
            emitter.emit('warn', `Myinfo Callback Not find template[${state.templateId}]`);
            const user = users[0];
            const errMsg = {
                status: 'ERROR',
                msg: `NO TEMPLATE[${state.templateId}] INFORMATION`
            }
            res.redirect(
                `${user.redirectUrl}?state=${state.state}&data=${jwt.sign(errMsg, user.clientSecret)}`
            );
        } else if (!data.code) {
            emitter.emit('warn', `Myinfo Callback Not Return myinfo authorise codo[${JSON.stringify(data)}]`);
            const user = users[0];
            const errMsg = {
                status: 'ERROR',
                msg: 'NO FOUND myinfo authorise code'
            }
            res.redirect(
                `${user.redirectUrl}?state=${state.state}&data=${jwt.sign(errMsg, user.clientSecret)}`
            );
        } else {
            emitter.emit('info', `Myinfo Callback Success`);
            const user = users[0];
            emitter.emit('info', `Myinfo Server Start Get Token for Myinfo---------------------------------------`)
            myInfoApi
                .getTokenApi(data.code, template)
                .then(token => {
                    emitter.emit('info', `Myinfo Server Get Token Success: ${JSON.stringify(token)}`)
                    emitter.emit('info', `Myinfo Server Start Get Person for Myinfo---------------------------------------`)
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
                    emitter.emit('info', `Myinfo Server Get Person Success: ${state.state}`)
                    res.redirect(
                        `${user.redirectUrl}?state=${state.state}&data=${jwt.sign(data, user.clientSecret)}`
                    );
                })
                .catch(e => {
                    emitter.emit('warn', `Myinfo Server Get Person Data Failed: ${state.state} -> ${JSON.stringify(e)}`)
                    if (e.status) {
                        res.redirect(
                            `${user.redirectUrl}?state=${state.state}&data=${jwt.sign({ status: e.status, msg: e.msg }, user.clientSecret)}`
                        );
                    } else {
                        res.redirect(
                            `${user.redirectUrl}?state=${state.state}&data=${jwt.sign({ status: "ERROR", msg: "Network error" }, user.clientSecret)}`
                        );
                    }
                });
        }
    } catch (error) {
        emitter.emit('warn', `Myinfo Server Error: Client Query -> [${JSON.stringify(data)}], Error Info -> [${JSON.stringify(error)}]`);
        res.send({
            status: 'ERROR',
            msg: 'Myinfo Authorization error'
        });
    }
});

router.use(router.oauth.errorHandler());

app.use(`/${contentPath}`, router);

app.listen(3001);