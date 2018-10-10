const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
    entry: ['@babel/polyfill', './src/app.js'],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './dist'),
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['latest']
                }
            },
        }, ],
    },
    target: 'node',
    externals: [nodeExternals()],
    plugins: [new UglifyJsPlugin()],
};