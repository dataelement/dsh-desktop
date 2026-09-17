/*!
 * negotiator
 * Copyright(c) 2026 Blake Embrey
 * MIT Licensed
 */

'use strict';

var contentType = require('content-type');

/**
 * Module exports.
 * @private
 */

module.exports = parseAccept;

/**
 * Parse an Accept-style header.
 * @private
 */

function parseAccept(header) {
  var values = [];
  var index = 0;

  while (index < header.length) {
    var start = skipOptionalWhitespace(header, index);
    var parsed = contentType.parse(header, { comma: true, start: start });

    // `content-type` normalizes the type, but accept methods return original casing.
    parsed.type = header.slice(start, start + parsed.type.length);
    values.push(parsed);

    index = parsed.index + 1;
  }

  return values;
}

/**
 * Skip optional whitespace.
 * @private
 */

function skipOptionalWhitespace(header, index) {
  var cursor = index;

  while (header.charCodeAt(cursor) === 0x20 || header.charCodeAt(cursor) === 0x09) {
    cursor++;
  }

  return cursor;
}
