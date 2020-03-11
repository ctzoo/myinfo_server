const _ = require('lodash');
const querystring = require('querystring');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const URLSearchParams = require('url-search-params');
const proxyPath = require('config').get('proxy');
const timeout = require('config').get('timeout');
const securityHelper = require('./security');
const emitter = require('./emitter');

function getAuthoriseUrl(state, purpose, template, loginType) {
  const url =
    template.authApiUrl +
    '?client_id=' +
    template.clientId +
    '&attributes=' +
    template.attributes +
    '&purpose=' +
    purpose +
    '&state=' +
    state +
    '&redirect_uri=' +
    template.redirectUrl;
  return loginType ? url + '&login_type=' + loginType : url;
}

async function getTokenApi(code, template) {
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
    template.redirectUrl +
    '&client_id=' +
    template.clientId +
    '&client_secret=' +
    template.clientSecret;
  const params = querystring.parse(strParams);

  // assemble headers for Token API
  const strHeaders =
    'Content-Type=' + contentType + '&Cache-Control=' + cacheCtl;
  const headers = querystring.parse(strHeaders);

  // Sign request and add Authorization Headers
  // t3step2a PASTE CODE BELOW
  const authHeaders = securityHelper.generateAuthorizationHeader(
    template.tokenApiUrl,
    params,
    method,
    contentType,
    template.authLevel,
    template.clientId,
    template.privateKey,
    template.clientSecret,
    template.realmUrl
  );

  if (!_.isEmpty(authHeaders)) {
    _.set(headers, 'Authorization', authHeaders);
  }
  // t3step2a END PASTE CODE
  emitter.emit('info', `Myinfo Server Request Token API Header : ${JSON.stringify(headers)}`);

  const formParams = new URLSearchParams();
  formParams.append('grant_type', 'authorization_code');
  formParams.append('code', code);
  formParams.append('redirect_uri', template.redirectUrl);
  formParams.append('client_id', template.clientId);
  formParams.append('client_secret', template.clientSecret);

  emitter.emit('info', `Myinfo Server Start Request Token API : ${formParams.toString()}`);
  const options = {
    headers,
    method: 'POST',
    body: formParams,
    timeout: timeout * 1000,
  };
  if (proxyPath !== '') {
    options.agent = new HttpsProxyAgent(proxyPath);
  }
  return fetch(template.tokenApiUrl, options)
    .then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        emitter.emit('warn', `Myinfo Server Request Token API Failed: ${JSON.stringify(res)}`);
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
      emitter.emit('info', `Myinfo Server Request Token API Success Return Token: ${JSON.stringify(token)}`);
      return token;
    });
}

async function getPersonApi(accessToken, template) {
  emitter.emit('info', `Myinfo Server Start Verify Access Token: ${accessToken}`);
  const decoded = securityHelper.verifyJWS(accessToken, template.publicKey);
  if (decoded == undefined || decoded == null) {
    emitter.emit('warn', 'Myinfo Server Verify Access Token Failed');
    return Promise.reject({
      status: 'ERROR',
      msg: 'INVALID TOKEN',
    });
  }
  emitter.emit('info', 'Myinfo Server Verify Access Token Success');

  const uinfin = decoded.sub;
  if (uinfin == undefined || uinfin == null) {
    emitter.emit('warn', 'Myinfo Server Not Find Uinfin');
    return Promise.reject({
      status: 'ERROR',
      msg: 'UINFIN NOT FOUND',
    });
  }
  const url = template.personApiUrl + '/' + uinfin + '/';
  const cacheCtl = 'no-cache';
  const method = 'GET';
  // assemble params for Person API
  // t2step6 PASTE CODE BELOW
  const strParams =
    'client_id=' + template.clientId + '&attributes=' + template.attributes;
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
    template.authLevel,
    template.clientId,
    template.privateKey,
    template.clientSecret,
    template.realmUrl
  );
  // t3step2b END PASTE CODE
  if (!_.isEmpty(authHeaders)) {
    _.set(headers, 'Authorization', authHeaders + ',Bearer ' + accessToken);
  } else {
    // NOTE: include access token in Authorization header as "Bearer " (with space behind)
    _.set(headers, 'Authorization', 'Bearer ' + accessToken);
  }
  emitter.emit('info', `Myinfo Server Request Person API Header: ${JSON.stringify(headers)}`);

  const options = {
    method: 'GET',
    headers,
    timeout: timeout * 1000,
  };
  if (proxyPath !== '') {
    options.agent = new HttpsProxyAgent(proxyPath);
  }

  emitter.emit('info', `Myinfo Server Start Request Person API: ${uinfin}`);
  return fetch(url + '?' + strParams, options)
    .then(res => res.text())
    .then(personData => {
      if (personData == undefined || personData == null) {
        emitter.emit('warn', 'Myinfo Server Request Person API Failed: Not found person data');
        return Promise.reject({
          status: 'ERROR',
          msg: 'PERSON DATA NOT FOUND',
        });
      } else {
        emitter.emit('info', 'Myinfo Server Request Person API Success');
        if (template.authLevel === 'L0') {
          personData = JSON.parse(personData);
          if (personData.uinfin == undefined || personData.uinfin == null) {
            personData.uinfin = uinfin; // add the uinfin into the data to display on screen
          }
          return personData;
        } else if (template.authLevel === 'L2') {
          const jweParts = personData.split('.');
          emitter.emit('info', 'Myinfo Server Start Decrypt Person Data');
          return securityHelper
            .decryptJWE(
              jweParts[0],
              jweParts[1],
              jweParts[2],
              jweParts[3],
              jweParts[4],
              template.privateKey
            )
            .then(personDataJWS => {
              if (personDataJWS === undefined || personDataJWS == null) {
                emitter.emit('warn', 'Myinfo Server Decrypt Person Data Failed: Invalid data or signature for person data jws');
                return Promise.reject({
                  status: 'ERROR',
                  msg: 'INVALID DATA OR SIGNATURE FOR PERSON DATA',
                });
              }
              emitter.emit('info', `Myinfo Server Decrypt Person Data Success: ${personDataJWS}`);

              emitter.emit('info', 'Myinfo Server Start Verify Person Data');
              const personData = securityHelper.verifyJWS(
                personDataJWS,
                template.publicKey
              );
              if (personData == undefined || personData == null) {
                emitter.emit('warn', 'Myinfo Server Verify Person Data Failed: Invalid signature for person data');
                return Promise.reject({
                  status: 'ERROR',
                  msg: 'INVALID DATA OR SIGNATURE FOR PERSON DATA',
                });
              }
              if (personData.uinfin == undefined || personData.uinfin == null) {
                // add the uinfin into the data to display on screen
                personData.uinfin = uinfin;
              }
              // console.log(JSON.stringify(personData));
              emitter.emit('info', 'Myinfo Server Verify Person Data Success');
              return {
                status: 'SUCCESS',
                msg: personData,
              };
            });
        } else {
          emitter.emit('warn', 'Myinfo Server Decrypt Person Unknown Auth Level');
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
