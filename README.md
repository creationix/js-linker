js-linker
=========

A library that searches for require calls in js code and links them together into a single script.

This tool can be used in node.js or in the browser.  It's a compile step similar to what browserify does.

## High-Level API

The high-level interface takes a loader function and the initial bootstrap js file and outputs all the combined js code of that file and it's dependencies.

```js
var compile = require('js-linker');
var fs = require('fs');

compile(loader, "./test.js", function (err, js) {
  if (err) throw err;
  console.log(js);
});

// Implement a loader for node.js
function loader(path, binary, callback) {
  fs.readFile(path, binary ? null : 'utf8', function (err, code) {
    if (err) {
      if (err.code === "ENOENT") return callback();
      return callback(err);
    }
    return callback(null, code);
  });
}
```

## Low-Level API

The library also exposes the parts if you want to do something custom like change how the code is generated or create script tags to update an existing definition database.

### mine.js

The mine script accepts js source and returns all the require call locations as well as the target string.

```js
var mine = require('js-linker/mine.js');
var fs = require('fs');
var code = fs.readFileSync("test.js");
var deps = mine(code);
```

### link.js

Link uses mine and the user provided `loader` function to scan code and all dependencies returning a large data structure ready to be converted to code.  Use this directly if you want to generate code your own custom way.

```js
var link = require('js-linker/link.js');

// Useing the same loader from above
link(loader, "./test.js", function (err, data) {
  // data has "initial" and "modules"
});
```

### gen.js

Generate code from the output in link.

```js
var gen = require('js-linker/gen.js');

// Generate code and bundle require runtime
var js = gen(data, true);

// Generate only module definitions
var bareJs = gen(data);
```
