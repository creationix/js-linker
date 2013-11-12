"use strict";
var link = require('./link.js');
var gen = require('./gen.js');

module.exports = compile;
function compile(loader, initial, callback) {
  link(loader, initial, function (err, data) {
    if (err) return callback(err);
    var out;
    try { out = gen(data); }
    catch (err) { return callback(err); }
    callback(null, out);
  });
}
