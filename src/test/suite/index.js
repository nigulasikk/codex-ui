const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '.');

  return new Promise((c, e) => {
    c();
  });
}

module.exports = { run };
