const _ = require('lodash');
const querystring = require('querystring');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const URLSearchParams = require('url-search-params');
const myInfoConfig = require('config').get('L2');
const proxyPath = require('config').get('proxy');
const securityHelper = require('./security');
const emitter = require('./emitter');

function getAuthoriseUrl(state, purpose, attributes) {
    return (
        myInfoConfig.authApiUrl +
        '?client_id=' +
        myInfoConfig.clientId +
        '&attributes=' +
        attributes +
        '&purpose=' +
        purpose +
        '&state=' +
        state +
        '&redirect_uri=' +
        myInfoConfig.redirectUrl
    );
}

async function getTokenApi(code) {
    const cacheCtl = 'no-cache';
    const contentType = 'application/x-www-form-urlencoded';
    const method = 'POST';

    // preparing the requegetAuthoriseUrlst with header and parameters
    // t2step3 PASTE CODE BELOW
    // assemble params for Token API
    const strParams =
        'grant_type=authorization_code' +
        '&code=' +
        code +
        '&redirect_uri=' +
        myInfoConfig.redirectUrl +
        '&client_id=' +
        myInfoConfig.clientId +
        '&client_secret=' +
        myInfoConfig.clientSecret;
    const params = querystring.parse(strParams);

    // assemble headers for Token API
    const strHeaders =
        'Content-Type=' + contentType + '&Cache-Control=' + cacheCtl;
    const headers = querystring.parse(strHeaders);

    // Sign request and add Authorization Headers
    // t3step2a PASTE CODE BELOW
    const authHeaders = securityHelper.generateAuthorizationHeader(
        myInfoConfig.tokenApiUrl,
        params,
        method,
        contentType,
        myInfoConfig.authLevel,
        myInfoConfig.clientId,
        myInfoConfig.privateKey,
        myInfoConfig.clientSecret,
        myInfoConfig.realmUrl
    );

    if (!_.isEmpty(authHeaders)) {
        _.set(headers, 'Authorization', authHeaders);
    }
    // t3step2a END PASTE CODE

    // console.log("Request Header for Token API:");
    // console.log(JSON.stringify(headers));
    emitter.emit(
        'info',
        `Request Header for Token API: ${JSON.stringify (headers)}`
    );

    const formParams = new URLSearchParams();
    formParams.append('grant_type', 'authorization_code');
    formParams.append('code', code);
    formParams.append('redirect_uri', myInfoConfig.redirectUrl);
    formParams.append('client_id', myInfoConfig.clientId);
    formParams.append('client_secret', myInfoConfig.clientSecret);

    emitter.emit('info', `Sending Token Request >>>${code}`);
    const options = {
        headers,
        method: 'POST',
        body: formParams
    }
    if (proxyPath !== "") {
        options.agent = new HttpsProxyAgent(proxyPath)
    }
    return fetch(myInfoConfig.tokenApiUrl, options)
        .then(res => {
            if (res.status === 200) {
                return res.json();
            } else {
                emitter.emit('warn', {
                    status: res.status,
                    msg: res.statusText,
                    url: res.url,
                });
                return Promise.reject({
                    status: 'ERROR',
                    msg: 'Myinfo Authorization error',
                });
            }
        })
        .then(token => {
            emitter.emit(
                'info',
                `Response from Token  >>>${JSON.stringify (token)}`
            );
            return token;
        });
}

async function getPersonApi(accessToken, attributes) {
    const decoded = securityHelper.verifyJWS(
        accessToken,
        myInfoConfig.publicKey
    );
    if (decoded == undefined || decoded == null) {
        emitter.emit('warn', 'Invalid token, Not find Access Token');
        return Promise.reject({
            status: 'ERROR',
            msg: 'INVALID TOKEN',
        });
    }

    // console.log("Decoded Access Token:");
    // console.log(JSON.stringify(decoded));
    emitter.emit('info', `Decoded Access Token: ${JSON.stringify (decoded)}`);

    const uinfin = decoded.sub;
    if (uinfin == undefined || uinfin == null) {
        emitter.emit('warn', 'Not find Uinfin');
        return Promise.reject({
            status: 'ERROR',
            msg: 'UINFIN NOT FOUND',
        });
    }
    const url = myInfoConfig.personApiUrl + '/' + uinfin + '/';
    const cacheCtl = 'no-cache';
    const method = 'GET';
    // assemble params for Person API
    // t2step6 PASTE CODE BELOW
    const strParams =
        'client_id=' + myInfoConfig.clientId + '&attributes=' + attributes;
    const params = querystring.parse(strParams);

    // assemble headers for Person API
    const strHeaders = 'Cache-Control=' + cacheCtl;
    const headers = querystring.parse(strHeaders);

    // Sign request and add Authorization Headers
    // t3step2b PASTE CODE BELOW
    const authHeaders = securityHelper.generateAuthorizationHeader(
        url,
        params,
        method,
        '', // no content type needed for GET
        myInfoConfig.authLevel,
        myInfoConfig.clientId,
        myInfoConfig.privateKey,
        myInfoConfig.clientSecret,
        myInfoConfig.realmUrl
    );
    // t3step2b END PASTE CODE
    if (!_.isEmpty(authHeaders)) {
        _.set(headers, 'Authorization', authHeaders + ',Bearer ' + accessToken);
    } else {
        // NOTE: include access token in Authorization header as "Bearer " (with space behind)
        _.set(headers, 'Authorization', 'Bearer ' + accessToken);
    }

    // console.log("Request Header for Person API:");
    // console.log(JSON.stringify(headers));
    emitter.emit(
        'info',
        `Request Header for Person API: ${JSON.stringify (headers)}`
    );
    // console.log("Sending Person Request >>>");
    emitter.emit('info', `Sending Person Request >>>${uinfin}`);
    const options = {
        method: 'GET',
        headers,
    }
    if (proxyPath !== "") {
        options.agent = new HttpsProxyAgent(proxyPath)
    }
    return fetch(url + '?' + strParams, options)
        .then(res => res.text())
        .then(personData => {
            if (personData == undefined || personData == null) {
                emitter.emit('warn', 'Not found person data');
                return Promise.reject({
                    status: 'ERROR',
                    msg: 'PERSON DATA NOT FOUND',
                });
            } else {
                if (myInfoConfig.authLevel === 'L0') {
                    personData = JSON.parse(personData);
                    personData.uinfin = uinfin; // add the uinfin into the data to display on screen

                    // console.log("Person Data :");
                    // console.log(JSON.stringify(personData));
                    // successful. return data back to frontend
                    emitter.emit('info', `Response from Person  >>>${personData}`);
                    return personData;
                } else if (myInfoConfig.authLevel === 'L2') {
                    // console.log("Response from Person API:");
                    // console.log(personData);
                    //t3step3 PASTE CODE BELOW
                    // header.encryptedKey.iv.ciphertext.tag
                    emitter.emit('info', `Response from Person  >>>${personData}`);
                    const jweParts = personData.split('.');

                    return securityHelper
                        .decryptJWE(
                            jweParts[0],
                            jweParts[1],
                            jweParts[2],
                            jweParts[3],
                            jweParts[4],
                            myInfoConfig.privateKey
                        )
                        .then(personData => {
                            if (personData === undefined || personData == null) {
                                emitter.emit(
                                    'warn',
                                    'Invalid data or signature for person data'
                                );
                                return Promise.reject({
                                    status: 'ERROR',
                                    msg: 'INVALID DATA OR SIGNATURE FOR PERSON DATA',
                                });
                            }
                            personData.uinfin = uinfin; // add the uinfin into the data to display on screen

                            // console.log("Person Data (Decoded/Decrypted):");
                            // console.log(JSON.stringify(personData));
                            // successful. return data back to frontend
                            emitter.emit(
                                'info',
                                `Person Data (Decoded/Decrypted): ${JSON.stringify (personData)}`
                            );
                            return {
                                status: 'SUCCESS',
                                msg: personData,
                            };
                        });
                } else {
                    emitter.emit('warn', 'Unknown Auth Level');
                    return Promise.reject({
                        status: 'ERROR',
                        msg: 'Unknown Auth Level',
                    });
                }
            }
        });
}

module.exports = {
    getAuthoriseUrl,
    getTokenApi,
    getPersonApi,
};