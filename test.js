var compile = require('./compile.js');

var fs = require('fs');
compile(loader, "./test.js", function (err, js) {
  if (err) throw err;
  console.log(js);
});

function loader(path, binary, callback) {
  fs.readFile(path, binary ? null : 'utf8', function (err, code) {
    if (err) {
      if (err.code === "ENOENT") return callback();
      return callback(err);
    }
    return callback(null, code);
  });
}