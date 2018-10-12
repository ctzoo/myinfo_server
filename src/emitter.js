const events = require('events')
const emitter = new events.EventEmitter()
const logger = require('./logger')

const mongoConfig = require('config').get('mongo');
const MongoClient = require('mongodb').MongoClient

emitter.on('person', async data => {
    try {
        const client = await MongoClient.connect(mongoConfig.url, {
            useNewUrlParser: true
        })
        const col = client.db(mongoConfig.db).collection('person')
        await col.insertOne(data)
        client.close()
    } catch (e) {
        logger.warn('mongodb data save error', e, JSON.stringify(data));
    }
})

emitter.on('person', data => {
    logger.info(JSON.stringify(data));
})

emitter.on('info', data => {
    logger.info(data);
})

emitter.on('warn', data => {
    logger.warn(JSON.stringify(data));
})

emitter.on('error', data => {
    logger.error(JSON.stringify(data));
})

module.exports = emitter