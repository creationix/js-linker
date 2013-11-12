"use strict";
var mine = require('./mine.js');
var pathJoin = require('./pathjoin.js');

// Given a loader implementation and an initial module, this will walk all dependencies
// and output an object with all the data required to generate a single js file.
module.exports = link;
function link(loader, initial, callback) {
  var modules = {};  // compiled modules
  var packagePaths = {}; // key is base + name , value is full path
  var aliases = {}; // path aliases from the "browser" directive in package.json

  resolveModule(".", initial, function (err, newPath) {
    if (err) return callback(err);
    callback(null, {
      initial: newPath,
      modules: modules
    });
  });

  function resolvePath(path, callback) {
    if (path in aliases) path = aliases[path];
    if (path in modules) return callback(null, path);
    if (/\.js$/.test(path)) {
      return loader(path, false, onJavaScript);
    }
    if (/\.json$/.test(path)) {
      return loader(path, false, onJson);
    }
    if (/#txt$/.test(path)) {
      return loader(path.substr(0, path.length - 4), false, onText);
    }
    if (/#bin$/.test(path)) {
      return loader(path.substr(0, path.length - 4), true, onBinary);
    }
    return callback(new Error("Invalid path extension: " + path));

    function onJavaScript(err, js) {
      if (err) return callback(err);
      var deps = mine(js);
      modules[path] = { type: "javascript", value: js, deps: deps };
      next(0);
      function next(index) {
        var dep = deps[index];
        if (!dep) return callback(null, path);
        resolveModule(pathJoin(path, '..'), dep.name, function (err, newPath) {
          if (err) return callback(err);
          dep.newPath = newPath;
          next(index + 1);
        });
      }
    }

    function onJson(err, json) {
      if (json === undefined) return callback(err);
      var value;
      try { value = JSON.parse(json); }
      catch (err) { return callback(err); }
      modules[path] = { type: "json", value: value };
      callback(null, path);
    }

    function onText(err, text) {
      if (text === undefined) return callback(err);
      modules[path] = { type: "text", value: text };
      callback(null, path);
    }

    function onBinary(err, binary) {
      if (binary === undefined) return callback(err);
      modules[path] = { type: "binary", value: binary };
      callback(null, path);
    }

  }

  function resolveModule(base, path, callback) {
    if (path[0] === ".") {
      return resolvePath(pathJoin(base, path), callback);
    }

    // non-local requires are assumed to belong to packages
    var index = path.indexOf("/");
    var name = index < 0 ? path : path.substr(0, index);
    return loadPackage(base, name, onPackage);

    function onPackage(err, metaPath) {
      if (metaPath === undefined) return callback(err);
      if (index < 0) path = metaPath;
      else path = pathJoin(metaPath, path.substr(index));
      return resolvePath(path, callback);
    }
  }

  function loadPackage(base, name, callback) {
    var key = pathJoin(base, name);
    if (key in packagePaths) return callback(null, packagePaths[key]);
    var metaPath = pathJoin(base, "node_modules", name, "package.json");
    loader(metaPath, false, function (err, json) {
      if (err) return callback(err);
      if (!json) {
        if (base === "/" || base === ".") return callback();
        return loadPackage(pathJoin(base, ".."), name, callback);
      }
      var meta;
      try { meta = JSON.parse(json); }
      catch (err) { return callback(err); }
      base = pathJoin(metaPath, "..");
      packagePaths[key] = base;
      if (meta.main) {
        aliases[base] = pathJoin(base, meta.main);
      }
      if (meta.browser) {
        for (var original in meta.browser) {
          aliases[pathJoin(base, original)] = pathJoin(base, meta.browser[original]);
        }
      }
      callback(null, base);
    });
  }
}
