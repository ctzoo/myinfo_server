const path = require('path')
const chokidar = require('chokidar')
const jsonfile = require('jsonfile')
const emitter = require('./emitter')

const clientsPath = path.resolve(__dirname, '../data/clients.json')
const templatePath = path.resolve(__dirname, '../data/template.json')

let clients = jsonfile.readFileSync(clientsPath)
let template = jsonfile.readFileSync(templatePath)

const dataPath = path.resolve(__dirname, '../data')
chokidar.watch(dataPath).on('change', (event, path) => {
  try {
    clients = jsonfile.readFileSync(clientsPath)
    template = jsonfile.readFileSync(templatePath)
  } catch (e) {
    emitter.emit('warn', e.message)
  }
})

const getClients = () => {
  return clients
}

const getTemplate = () => {
  return template
}

module.exports = {
  getClients,
  getTemplate
}