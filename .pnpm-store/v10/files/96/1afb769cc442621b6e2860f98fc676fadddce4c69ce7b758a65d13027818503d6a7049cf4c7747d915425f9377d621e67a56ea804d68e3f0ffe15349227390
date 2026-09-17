var exports;
var semver = require("semver");

if (semver.satisfies(process.version, "<8")) {
  exports = require("../lib/es6");
} else {
  exports = require("../lib/es7");
}

module.exports = exports;
module.exports.default = exports;
