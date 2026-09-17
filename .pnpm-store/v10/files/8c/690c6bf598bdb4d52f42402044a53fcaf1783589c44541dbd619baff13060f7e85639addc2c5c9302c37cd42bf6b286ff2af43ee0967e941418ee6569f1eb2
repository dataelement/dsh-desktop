/**
 * negotiator
 * Copyright(c) 2012 Isaac Z. Schlueter
 * Copyright(c) 2014 Federico Romero
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

var parseAccept = require('./accept');

/**
 * Module exports.
 * @public
 */

module.exports = preferredEncodings;
module.exports.preferredEncodings = preferredEncodings;

/**
 * Module variables.
 * @private
 */

function parseAcceptEncoding(accept) {
  var accepts = parseAccept(accept);
  var hasIdentity = false;
  var minQuality = 1;

  for (var i = 0, j = 0; i < accepts.length; i++) {
    var encoding = formatEncoding(accepts[i], i);

    if (encoding) {
      accepts[j++] = encoding;
      hasIdentity = hasIdentity || specify('identity', encoding);
      minQuality = Math.min(minQuality, encoding.q || 1);
    }
  }

  if (!hasIdentity) {
    /*
     * If identity doesn't explicitly appear in the accept-encoding header,
     * it's added to the list of acceptable encoding with the lowest q
     */
    accepts[j++] = {
      encoding: 'identity',
      q: minQuality,
      i: i
    };
  }

  accepts.length = j;
  return accepts;
}

/**
 * Format a parsed encoding for negotiation.
 * @private
 */

function formatEncoding(parsed, i) {
  if (!parsed.type) return null;

  return {
    encoding: parsed.type,
    q: parsed.parameters.q ? parseFloat(parsed.parameters.q) : 1,
    i: i
  };
}

/**
 * Get the priority of an encoding.
 * @private
 */

function getEncodingPriority(encoding, accepted, index) {
  var priority = {encoding: encoding, o: -1, q: 0, s: 0};

  for (var i = 0; i < accepted.length; i++) {
    var spec = specify(encoding, accepted[i], index);

    if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
      priority = spec;
    }
  }

  return priority;
}

/**
 * Get the specificity of the encoding.
 * @private
 */

function specify(encoding, spec, index) {
  var s = 0;
  if(spec.encoding.toLowerCase() === encoding.toLowerCase()){
    s |= 1;
  } else if (spec.encoding !== '*' ) {
    return null
  }

  return {
    encoding: encoding,
    i: index,
    o: spec.i,
    q: spec.q,
    s: s
  }
};

/**
 * Get the preferred encodings from an Accept-Encoding header.
 * @public
 */

function preferredEncodings(accept, provided, preferred) {
  var accepts = parseAcceptEncoding(accept || '');

  var comparator = preferred ? function comparator (a, b) {
    if (a.q !== b.q) {
      return b.q - a.q // higher quality first
    }

    var aPreferred = preferred.indexOf(a.encoding)
    var bPreferred = preferred.indexOf(b.encoding)

    if (aPreferred === -1 && bPreferred === -1) {
      // consider the original specifity/order
      return (b.s - a.s) || (a.o - b.o) || (a.i - b.i)
    }

    if (aPreferred !== -1 && bPreferred !== -1) {
      return aPreferred - bPreferred // consider the preferred order
    }

    return aPreferred === -1 ? 1 : -1 // preferred first
  } : compareSpecs;

  if (!provided) {
    // sorted list of all encodings
    return accepts
      .filter(isQuality)
      .sort(comparator)
      .map(getFullEncoding);
  }

  var priorities = provided.map(function getPriority(type, index) {
    return getEncodingPriority(type, accepts, index);
  });

  // sorted list of accepted encodings
  return priorities.filter(isQuality).sort(comparator).map(function getEncoding(priority) {
    return provided[priorities.indexOf(priority)];
  });
}

/**
 * Compare two specs.
 * @private
 */

function compareSpecs(a, b) {
  return (b.q - a.q) || (b.s - a.s) || (a.o - b.o) || (a.i - b.i);
}

/**
 * Get full encoding string.
 * @private
 */

function getFullEncoding(spec) {
  return spec.encoding;
}

/**
 * Check if a spec has any quality.
 * @private
 */

function isQuality(spec) {
  return spec.q > 0;
}
