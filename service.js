var Service = require('node-windows').Service;

var svc = new Service({
  name: 'Myinfo Server',
  description: 'Services interacting with Myinfo.',
  script: 'C:\\path\\to\\helloworld.js'
});

svc.on('install', function () {
  svc.start();
});

svc.install();