"use strict";

module.exports = gen;
function gen(data, bundled) {
  var sources = [];
  var hasBinary = false;
  for (var name in data.modules) {
    var module = data.modules[name];
    var generator;
    if (module.type === "javascript") {
      generator = genJs;
    }
    else if (module.type === "json" || module.type === "text") {
      generator = genJson;
    }
    else if (module.type === "binary") {
      generator = genBinary;
      hasBinary = true;
    }
    else throw new TypeError("Invalid type: " + module.type);
    var source = generator(module).trim();
    source = "defs[" + JSON.stringify(name) + "] = function (module, exports) {\n" +
      source + "\n};";
    sources.push(source);
  }
  sources = sources.join("\n\n");
  if (!bundled) return sources;
  sources = [
    "var modules = {};",
    "var defs = {};",
    sources,
    "var realRequire = typeof require === 'undefined' ? null : require;",
    "require = " + $require.toString().replace("$", "")
  ];
  if (hasBinary) sources.push(hexToBin.toString());
  sources.push("require(" + JSON.stringify(data.initial) + ");");
  return sources.join("\n\n");
}

function genJs(module) {
  var offset = 0;
  var source = module.value;
  module.deps.forEach(function (dep) {
    if (dep.newPath === undefined) return;
    var start = offset + dep.offset;
    var end = start + dep.name.length;
    source = source.substr(0, start) + dep.newPath + source.substr(end);
    offset += dep.newPath.length - dep.name.length;
  });
  return source;
}

function genJson(module) {
  return "module.exports = " + JSON.stringify(module.value) + ";";
}

function genBinary(module) {
  return "module.exports = hexToBin('" + binToHex(module.value) + "');";
}

var modules, defs, realRequire;

function $require(name) {
  var mod = modules[name];
  if (!mod) {
    var def = defs[name];
    if (!def) {
      if (realRequire) return realRequire(name);
      throw new Error("Missing module: " + name);
    }
    mod = modules[name] = { exports: {} };
    def(mod, mod.exports);
  }
  return mod.exports;
}

function binToHex(binary) {
  var hex = "";
  for (var i = 0, l = binary.length; i < l; i++) {
    var byte = binary[i];
    hex += (byte >> 4).toString(16) + (byte & 0xf).toString(16);
  }
  return hex;
}

function hexToBin(hex) {
  var length = hex.length >> 1;
  var binary = new Uint8Array(length);
  for (var i = 0; i < length; i++) {
    binary[i] = parseInt(hex.substr(i << 1, 2), 16);
  }
  return binary;
}
