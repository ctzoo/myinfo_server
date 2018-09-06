const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const nodeExternals = require('webpack-node-externals')

module.exports = {
  entry: ['./src/app.js'],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist')
  },
  target: 'node',
  externals: [nodeExternals()],
  plugins: [
    new UglifyJsPlugin()
  ]
}