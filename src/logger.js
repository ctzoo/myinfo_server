const log4js = require('log4js')
const logLevel = require('config').get('logLevel');

log4js.configure({
    disableClustering: true,
    appenders: {
        out: {
            type: 'dateFile',
            filename: 'logs/out.log'
        }
    },
    categories: {
        default: {
            appenders: ['out'],
            level: logLevel
        }
    }
})
module.exports = log4js.getLogger()