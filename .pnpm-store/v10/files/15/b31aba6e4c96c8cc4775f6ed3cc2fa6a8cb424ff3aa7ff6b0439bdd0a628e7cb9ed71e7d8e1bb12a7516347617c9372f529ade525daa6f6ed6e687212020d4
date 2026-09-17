(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.plist = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Parser functions.
 */

var parserFunctions = require('./lib/parse');
Object.keys(parserFunctions).forEach(function (k) { exports[k] = parserFunctions[k]; });

/**
 * Builder functions.
 */

var builderFunctions = require('./lib/build');
Object.keys(builderFunctions).forEach(function (k) { exports[k] = builderFunctions[k]; });

},{"./lib/build":2,"./lib/parse":3}],2:[function(require,module,exports){
(function (Buffer){(function (){
/**
 * Module dependencies.
 */

var base64 = require('base64-js');
var xmlbuilder = require('xmlbuilder');

/**
 * Module exports.
 */

exports.build = build;

/**
 * Accepts a `Date` instance and returns an ISO date string.
 *
 * @param {Date} d - Date instance to serialize
 * @returns {String} ISO date string representation of `d`
 * @api private
 */

function ISODateString(d){
  function pad(n){
    return n < 10 ? '0' + n : n;
  }
  return d.getUTCFullYear()+'-'
    + pad(d.getUTCMonth()+1)+'-'
    + pad(d.getUTCDate())+'T'
    + pad(d.getUTCHours())+':'
    + pad(d.getUTCMinutes())+':'
    + pad(d.getUTCSeconds())+'Z';
}

/**
 * Returns the internal "type" of `obj` via the
 * `Object.prototype.toString()` trick.
 *
 * @param {Mixed} obj - any value
 * @returns {String} the internal "type" name
 * @api private
 */

var toString = Object.prototype.toString;
function type (obj) {
  var m = toString.call(obj).match(/\[object (.*)\]/);
  return m ? m[1] : m;
}

/**
 * Generate an XML plist string from the input object `obj`.
 *
 * @param {Object} obj - the object to convert
 * @param {Object} [opts] - optional options object
 * @returns {String} converted plist XML string
 * @api public
 */

function build (obj, opts) {
  var XMLHDR = {
    version: '1.0',
    encoding: 'UTF-8'
  };

  var XMLDTD = {
    pubid: '-//Apple//DTD PLIST 1.0//EN',
    sysid: 'http://www.apple.com/DTDs/PropertyList-1.0.dtd'
  };

  var doc = xmlbuilder.create('plist');

  doc.dec(XMLHDR.version, XMLHDR.encoding, XMLHDR.standalone);
  doc.dtd(XMLDTD.pubid, XMLDTD.sysid);
  doc.att('version', '1.0');

  walk_obj(obj, doc);

  if (!opts) opts = {};
  // default `pretty` to `true`
  opts.pretty = opts.pretty !== false;
  return doc.end(opts);
}

/**
 * depth first, recursive traversal of a javascript object. when complete,
 * next_child contains a reference to the build XML object.
 *
 * @api private
 */

function walk_obj(next, next_child) {
  var tag_type, i, prop;
  var name = type(next);

  if ('Undefined' == name) {
    return;
  } else if (Array.isArray(next)) {
    next_child = next_child.ele('array');
    for (i = 0; i < next.length; i++) {
      walk_obj(next[i], next_child);
    }

  } else if (Buffer.isBuffer(next)) {
    next_child.ele('data').raw(next.toString('base64'));

  } else if ('Object' == name) {
    next_child = next_child.ele('dict');
    for (prop in next) {
      if (next.hasOwnProperty(prop)) {
        next_child.ele('key').txt(prop);
        walk_obj(next[prop], next_child);
      }
    }

  } else if ('Number' == name) {
    // detect if this is an integer or real
    // TODO: add an ability to force one way or another via a "cast"
    tag_type = (next % 1 === 0) ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());

  } else if ('Date' == name) {
    next_child.ele('date').txt(ISODateString(new Date(next)));

  } else if ('Boolean' == name) {
    next_child.ele(next ? 'true' : 'false');

  } else if ('String' == name) {
    next_child.ele('string').txt(next);

  } else if ('ArrayBuffer' == name) {
    next_child.ele('data').raw(base64.fromByteArray(next));

  } else if (next && next.buffer && 'ArrayBuffer' == type(next.buffer)) {
    // a typed array
    next_child.ele('data').raw(base64.fromByteArray(new Uint8Array(next.buffer), next_child));

  } else if ('Null' === name) {
    next_child.ele('null').txt('');

  }
}

}).call(this)}).call(this,{"isBuffer":require("../node_modules/is-buffer/index.js")})
},{"../node_modules/is-buffer/index.js":11,"base64-js":8,"xmlbuilder":44}],3:[function(require,module,exports){
(function (Buffer){(function (){
/**
 * Module dependencies.
 */

const { DOMParser } = require('@xmldom/xmldom');

/**
 * Module exports.
 */

exports.parse = parse;

var TEXT_NODE = 3;
var CDATA_NODE = 4;
var COMMENT_NODE = 8;


/**
 * We ignore raw text (usually whitespace), <!-- xml comments -->,
 * and raw CDATA nodes.
 *
 * @param {Element} node
 * @returns {Boolean}
 * @api private
 */

function shouldIgnoreNode (node) {
  return node.nodeType === TEXT_NODE
    || node.nodeType === COMMENT_NODE
    || node.nodeType === CDATA_NODE;
}

/**
 * Check if the node is empty. Some plist file has such node:
 * <key />
 * this node shoud be ignored.
 *
 * @see https://github.com/TooTallNate/plist.js/issues/66
 * @param {Element} node
 * @returns {Boolean}
 * @api private
 */
function isEmptyNode(node){
  if(!node.childNodes || node.childNodes.length === 0) {
    return true;
  } else {
    return false;
  }
}

function invariant(test, message) {
  if (!test) {
    throw new Error(message);
  }
}

/**
 * Parses a Plist XML string. Returns an Object.
 *
 * @param {String} xml - the XML String to decode
 * @returns {Mixed} the decoded value from the Plist XML
 * @api public
 */

function parse (xml) {
  var doc = new DOMParser().parseFromString(xml);
  invariant(
    doc.documentElement.nodeName === 'plist',
    'malformed document. First element should be <plist>'
  );
  var plist = parsePlistXML(doc.documentElement);

  // the root <plist> node gets interpreted as an Array,
  // so pull out the inner data first
  if (plist.length == 1) plist = plist[0];

  return plist;
}

/**
 * Convert an XML based plist document into a JSON representation.
 *
 * @param {Object} xml_node - current XML node in the plist
 * @returns {Mixed} built up JSON object
 * @api private
 */

function parsePlistXML (node) {
  var i, new_obj, key, val, new_arr, res, counter, type;

  if (!node)
    return null;

  if (node.nodeName === 'plist') {
    new_arr = [];
    if (isEmptyNode(node)) {
      return new_arr;
    }
    for (i=0; i < node.childNodes.length; i++) {
      if (!shouldIgnoreNode(node.childNodes[i])) {
        new_arr.push( parsePlistXML(node.childNodes[i]));
      }
    }
    return new_arr;
  } else if (node.nodeName === 'dict') {
    new_obj = {};
    key = null;
    counter = 0;
    if (isEmptyNode(node)) {
      return new_obj;
    }
    for (i=0; i < node.childNodes.length; i++) {
      if (shouldIgnoreNode(node.childNodes[i])) continue;
      if (counter % 2 === 0) {
        invariant(
          node.childNodes[i].nodeName === 'key',
          'Missing key while parsing <dict/>.'
        );
        key = parsePlistXML(node.childNodes[i]);
      } else {
        invariant(
          node.childNodes[i].nodeName !== 'key',
          'Unexpected key "'
            + parsePlistXML(node.childNodes[i])
            + '" while parsing <dict/>.'
        );
        new_obj[key] = parsePlistXML(node.childNodes[i]);
      }
      counter += 1;
    }
    if (counter % 2 === 1) {
      new_obj[key] = '';
    }
    
    return new_obj;

  } else if (node.nodeName === 'array') {
    new_arr = [];
    if (isEmptyNode(node)) {
      return new_arr;
    }
    for (i=0; i < node.childNodes.length; i++) {
      if (!shouldIgnoreNode(node.childNodes[i])) {
        res = parsePlistXML(node.childNodes[i]);
        if (null != res) new_arr.push(res);
      }
    }
    return new_arr;

  } else if (node.nodeName === '#text') {
    // TODO: what should we do with text types? (CDATA sections)

  } else if (node.nodeName === 'key') {
    if (isEmptyNode(node)) {
      return '';
    }

    invariant(
      node.childNodes[0].nodeValue !== '__proto__',
      '__proto__ keys can lead to prototype pollution. More details on CVE-2022-22912'
    );

    return node.childNodes[0].nodeValue;
  } else if (node.nodeName === 'string') {
    res = '';
    if (isEmptyNode(node)) {
      return res;
    }
    for (i=0; i < node.childNodes.length; i++) {
      var type = node.childNodes[i].nodeType;
      if (type === TEXT_NODE || type === CDATA_NODE) {
        res += node.childNodes[i].nodeValue;
      }
    }
    return res;

  } else if (node.nodeName === 'integer') {
    invariant(
      !isEmptyNode(node),
      'Cannot parse "" as integer.'
    );
    return parseInt(node.childNodes[0].nodeValue, 10);

  } else if (node.nodeName === 'real') {
    invariant(
      !isEmptyNode(node),
      'Cannot parse "" as real.'
    );
    res = '';
    for (i=0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType === TEXT_NODE) {
        res += node.childNodes[i].nodeValue;
      }
    }
    return parseFloat(res);

  } else if (node.nodeName === 'data') {
    res = '';
    if (isEmptyNode(node)) {
      return Buffer.from(res, 'base64');
    }
    for (i=0; i < node.childNodes.length; i++) {
      if (node.childNodes[i].nodeType === TEXT_NODE) {
        res += node.childNodes[i].nodeValue.replace(/\s+/g, '');
      }
    }
    return Buffer.from(res, 'base64');

  } else if (node.nodeName === 'date') {
    invariant(
      !isEmptyNode(node),
      'Cannot parse "" as Date.'
    )
    return new Date(node.childNodes[0].nodeValue);

  } else if (node.nodeName === 'null') {
    return null;

  } else if (node.nodeName === 'true') {
    return true;

  } else if (node.nodeName === 'false') {
    return false;
  } else {
    throw new Error('Invalid PLIST tag ' + node.nodeName);
  }
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"./xmldom/dom-parser":4,"buffer":9}],4:[function(require,module,exports){
function DOMParser(options){
	this.options = options ||{locator:{}};
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML?htmlEntity.entityMap:{'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"};
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}

	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source && typeof source === 'string'){
		sax.parse(source,defaultNSMap,entityMap);
	}else{
		sax.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler
 *
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;

		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},

	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},

	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		throw new ParseError(error, this.locator);
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
var htmlEntity = require('./entities');
var sax = require('./sax');
var XMLReader = sax.XMLReader;
var ParseError = sax.ParseError;
var DOMImplementation = exports.DOMImplementation = require('./dom').DOMImplementation;
exports.XMLSerializer = require('./dom').XMLSerializer ;
exports.DOMParser = DOMParser;
exports.__DOMHandler = DOMHandler;
//}

},{"./dom":5,"./entities":6,"./sax":7}],5:[function(require,module,exports){
function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class)
		}
		pt.constructor = Class
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);

/**
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 */
function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
};

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},
	
	getElementsByClassName: function(className) {
		var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
		return new LiveNodeList(this, function(base) {
			var ls = [];
			_visitNode(base.documentElement, function(node) {
				if(node !== base && node.nodeType == ELEMENT_NODE) {
					if(pattern.test(node.getAttribute('class'))) {
						ls.push(node);
					}
				}
			});
			return ls;
		});
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix||'';
	var uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		var startVisibleNamespaces = visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			if (uri) {
				// Avoid empty namespace value like xmlns:ds=""
				// Empty namespace URL will we produce an invalid XML document
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		/**
		 * Well-formedness constraint: No < in Attribute Values
		 * The replacement text of any entity referred to directly or indirectly in an attribute value must not contain a <.
		 * @see https://www.w3.org/TR/xml/#CleanAttrVals
		 * @see https://www.w3.org/TR/xml/#NT-AttValue
		 */
		return buf.push(' ', node.name, '="', node.value.replace(/[<&"]/g,_xmlEncoder), '"');
	case TEXT_NODE:
		/**
		 * The ampersand character (&) and the left angle bracket (<) must not appear in their literal form,
		 * except when used as markup delimiters, or within a comment, a processing instruction, or a CDATA section.
		 * If they are needed elsewhere, they must be escaped using either numeric character references or the strings
		 * `&amp;` and `&lt;` respectively.
		 * The right angle bracket (>) may be represented using the string " &gt; ", and must, for compatibility,
		 * be escaped using either `&gt;` or a character reference when it appears in the string `]]>` in content,
		 * when that string is not marking the end of a CDATA section.
		 *
		 * In the content of elements, character data is any string of characters
		 * which does not contain the start-delimiter of any markup
		 * and does not include the CDATA-section-close delimiter, `]]>`.
		 *
		 * @see https://www.w3.org/TR/xml/#NT-CharData
		 */
		return buf.push(node.data
			.replace(/[<&]/g,_xmlEncoder)
			.replace(/]]>/g, ']]&gt;')
		);
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC ', pubid);
			if (sysid && sysid!='.') {
				buf.push(' ', sysid);
			}
			buf.push('>');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM ', sysid, '>');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.Node = Node;
	exports.DOMException = DOMException;
	exports.DOMImplementation = DOMImplementation;
	exports.XMLSerializer = XMLSerializer;
//}

},{}],6:[function(require,module,exports){
exports.entityMap = {
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: "\u00a0",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
};

},{}],7:[function(require,module,exports){
//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

/**
 * Creates an error that will not be caught by XMLReader aka the SAX parser.
 *
 * @param {string} message
 * @param {any?} locator Optional, can provide details about the location in the source
 * @constructor
 */
function ParseError(message, locator) {
	this.message = message
	this.locator = locator
	if(Error.captureStackTrace) Error.captureStackTrace(this, ParseError);
}
ParseError.prototype = new Error();
ParseError.prototype.name = ParseError.name

function XMLReader(){
	
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName ); // No known test case
					}
		        }else{
		        	parseStack.push(config)
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				}else{
					end++;
				}
			}
		}catch(e){
			if (e instanceof ParseError) {
				throw e;
			}
			errorHandler.error('element parse error: '+e)
			end = -1;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){

	/**
	 * @param {string} qname
	 * @param {string} value
	 * @param {number} startIndex
	 */
	function addAttribute(qname, value, startIndex) {
		if (qname in el.attributeNames) errorHandler.fatalError('Attribute ' + qname + ' redefined')
		el.addValue(qname, value, startIndex)
	}
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName'); // No known test case
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					addAttribute(attrName, value, start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				addAttribute(attrName, value, start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="'); // No known test case
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')") // No known test case
			}
			break;
		case ''://end document
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!');
					addAttribute(attrName, value.replace(/&#?\w+;/g,entityReplacer), start)
				}else{
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					addAttribute(value, value, start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					addAttribute(attrName, value, start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					addAttribute(attrName, attrName, start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/'
			domBuilder.startPrefixMapping(nsPrefix, value) 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix) 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n]}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA() 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = false;
			var sysid = false;
			if(len>3){
				if(/^public$/i.test(matchs[2][0])){
					pubid = matchs[3][0];
					sysid = len>4 && matchs[4][0];
				}else if(/^system$/i.test(matchs[2][0])){
					sysid = matchs[3][0];
				}
			}
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name, pubid, sysid);
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

function ElementAttributes(){
	this.attributeNames = {}
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	addValue:function(qName, value, offset) {
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this.attributeNames[qName] = this.length;
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;
exports.ParseError = ParseError;

},{}],8:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],9:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":8,"buffer":9,"ieee754":10}],10:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],11:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],12:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  module.exports = {
    Disconnected: 1,
    Preceding: 2,
    Following: 4,
    Contains: 8,
    ContainedBy: 16,
    ImplementationSpecific: 32
  };

}).call(this);

},{}],13:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  module.exports = {
    Element: 1,
    Attribute: 2,
    Text: 3,
    CData: 4,
    EntityReference: 5,
    EntityDeclaration: 6,
    ProcessingInstruction: 7,
    Comment: 8,
    Document: 9,
    DocType: 10,
    DocumentFragment: 11,
    NotationDeclaration: 12,
    // Numeric codes up to 200 are reserved to W3C for possible future use.
    // Following are types internal to this library:
    Declaration: 201,
    Raw: 202,
    AttributeDeclaration: 203,
    ElementDeclaration: 204,
    Dummy: 205
  };

}).call(this);

},{}],14:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Copies all enumerable own properties from `sources` to `target`
  var assign, getValue, isArray, isEmpty, isFunction, isObject, isPlainObject,
    hasProp = {}.hasOwnProperty;

  assign = function(target, ...sources) {
    var i, key, len, source;
    if (isFunction(Object.assign)) {
      Object.assign.apply(null, arguments);
    } else {
      for (i = 0, len = sources.length; i < len; i++) {
        source = sources[i];
        if (source != null) {
          for (key in source) {
            if (!hasProp.call(source, key)) continue;
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };

  // Determines if `val` is a Function object
  isFunction = function(val) {
    return !!val && Object.prototype.toString.call(val) === '[object Function]';
  };

  // Determines if `val` is an Object
  isObject = function(val) {
    var ref;
    return !!val && ((ref = typeof val) === 'function' || ref === 'object');
  };

  // Determines if `val` is an Array
  isArray = function(val) {
    if (isFunction(Array.isArray)) {
      return Array.isArray(val);
    } else {
      return Object.prototype.toString.call(val) === '[object Array]';
    }
  };

  // Determines if `val` is an empty Array or an Object with no own properties
  isEmpty = function(val) {
    var key;
    if (isArray(val)) {
      return !val.length;
    } else {
      for (key in val) {
        if (!hasProp.call(val, key)) continue;
        return false;
      }
      return true;
    }
  };

  // Determines if `val` is a plain Object
  isPlainObject = function(val) {
    var ctor, proto;
    return isObject(val) && (proto = Object.getPrototypeOf(val)) && (ctor = proto.constructor) && (typeof ctor === 'function') && (ctor instanceof ctor) && (Function.prototype.toString.call(ctor) === Function.prototype.toString.call(Object));
  };

  // Gets the primitive value of an object
  getValue = function(obj) {
    if (isFunction(obj.valueOf)) {
      return obj.valueOf();
    } else {
      return obj;
    }
  };

  module.exports.assign = assign;

  module.exports.isFunction = isFunction;

  module.exports.isObject = isObject;

  module.exports.isArray = isArray;

  module.exports.isEmpty = isEmpty;

  module.exports.isPlainObject = isPlainObject;

  module.exports.getValue = getValue;

}).call(this);

},{}],15:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  module.exports = {
    None: 0,
    OpenTag: 1,
    InsideTag: 2,
    CloseTag: 3
  };

}).call(this);

},{}],16:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLAttribute, XMLNode;

  NodeType = require('./NodeType');

  XMLNode = require('./XMLNode');

  // Represents an attribute
  module.exports = XMLAttribute = (function() {
    class XMLAttribute {
      // Initializes a new instance of `XMLAttribute`

      // `parent` the parent node
      // `name` attribute target
      // `value` attribute value
      constructor(parent, name, value) {
        this.parent = parent;
        if (this.parent) {
          this.options = this.parent.options;
          this.stringify = this.parent.stringify;
        }
        if (name == null) {
          throw new Error("Missing attribute name. " + this.debugInfo(name));
        }
        this.name = this.stringify.name(name);
        this.value = this.stringify.attValue(value);
        this.type = NodeType.Attribute;
        // DOM level 3
        this.isId = false;
        this.schemaTypeInfo = null;
      }

      // Creates and returns a deep clone of `this`
      clone() {
        return Object.create(this);
      }

      // Converts the XML fragment to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.attribute(this, this.options.writer.filterOptions(options));
      }

      
      // Returns debug string for this node
      debugInfo(name) {
        name = name || this.name;
        if (name == null) {
          return "parent: <" + this.parent.name + ">";
        } else {
          return "attribute: {" + name + "}, parent: <" + this.parent.name + ">";
        }
      }

      isEqualNode(node) {
        if (node.namespaceURI !== this.namespaceURI) {
          return false;
        }
        if (node.prefix !== this.prefix) {
          return false;
        }
        if (node.localName !== this.localName) {
          return false;
        }
        if (node.value !== this.value) {
          return false;
        }
        return true;
      }

    };

    // DOM level 1
    Object.defineProperty(XMLAttribute.prototype, 'nodeType', {
      get: function() {
        return this.type;
      }
    });

    Object.defineProperty(XMLAttribute.prototype, 'ownerElement', {
      get: function() {
        return this.parent;
      }
    });

    // DOM level 3
    Object.defineProperty(XMLAttribute.prototype, 'textContent', {
      get: function() {
        return this.value;
      },
      set: function(value) {
        return this.value = value || '';
      }
    });

    // DOM level 4
    Object.defineProperty(XMLAttribute.prototype, 'namespaceURI', {
      get: function() {
        return '';
      }
    });

    Object.defineProperty(XMLAttribute.prototype, 'prefix', {
      get: function() {
        return '';
      }
    });

    Object.defineProperty(XMLAttribute.prototype, 'localName', {
      get: function() {
        return this.name;
      }
    });

    Object.defineProperty(XMLAttribute.prototype, 'specified', {
      get: function() {
        return true;
      }
    });

    return XMLAttribute;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],17:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLCData, XMLCharacterData;

  NodeType = require('./NodeType');

  XMLCharacterData = require('./XMLCharacterData');

  // Represents a  CDATA node
  module.exports = XMLCData = class XMLCData extends XMLCharacterData {
    // Initializes a new instance of `XMLCData`

    // `text` CDATA text
    constructor(parent, text) {
      super(parent);
      if (text == null) {
        throw new Error("Missing CDATA text. " + this.debugInfo());
      }
      this.name = "#cdata-section";
      this.type = NodeType.CData;
      this.value = this.stringify.cdata(text);
    }

    // Creates and returns a deep clone of `this`
    clone() {
      return Object.create(this);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.cdata(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLCharacterData":18}],18:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var XMLCharacterData, XMLNode;

  XMLNode = require('./XMLNode');

  // Represents a character data node
  module.exports = XMLCharacterData = (function() {
    class XMLCharacterData extends XMLNode {
      // Initializes a new instance of `XMLCharacterData`

      constructor(parent) {
        super(parent);
        this.value = '';
      }

      
      // Creates and returns a deep clone of `this`
      clone() {
        return Object.create(this);
      }

      // DOM level 1 functions to be implemented later
      substringData(offset, count) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      appendData(arg) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      insertData(offset, arg) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      deleteData(offset, count) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      replaceData(offset, count, arg) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      isEqualNode(node) {
        if (!super.isEqualNode(node)) {
          return false;
        }
        if (node.data !== this.data) {
          return false;
        }
        return true;
      }

    };

    // DOM level 1
    Object.defineProperty(XMLCharacterData.prototype, 'data', {
      get: function() {
        return this.value;
      },
      set: function(value) {
        return this.value = value || '';
      }
    });

    Object.defineProperty(XMLCharacterData.prototype, 'length', {
      get: function() {
        return this.value.length;
      }
    });

    // DOM level 3
    Object.defineProperty(XMLCharacterData.prototype, 'textContent', {
      get: function() {
        return this.value;
      },
      set: function(value) {
        return this.value = value || '';
      }
    });

    return XMLCharacterData;

  }).call(this);

}).call(this);

},{"./XMLNode":35}],19:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLCharacterData, XMLComment;

  NodeType = require('./NodeType');

  XMLCharacterData = require('./XMLCharacterData');

  // Represents a comment node
  module.exports = XMLComment = class XMLComment extends XMLCharacterData {
    // Initializes a new instance of `XMLComment`

    // `text` comment text
    constructor(parent, text) {
      super(parent);
      if (text == null) {
        throw new Error("Missing comment text. " + this.debugInfo());
      }
      this.name = "#comment";
      this.type = NodeType.Comment;
      this.value = this.stringify.comment(text);
    }

    // Creates and returns a deep clone of `this`
    clone() {
      return Object.create(this);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.comment(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLCharacterData":18}],20:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var XMLDOMConfiguration, XMLDOMErrorHandler, XMLDOMStringList;

  XMLDOMErrorHandler = require('./XMLDOMErrorHandler');

  XMLDOMStringList = require('./XMLDOMStringList');

  // Implements the DOMConfiguration interface
  module.exports = XMLDOMConfiguration = (function() {
    class XMLDOMConfiguration {
      constructor() {
        var clonedSelf;
        this.defaultParams = {
          "canonical-form": false,
          "cdata-sections": false,
          "comments": false,
          "datatype-normalization": false,
          "element-content-whitespace": true,
          "entities": true,
          "error-handler": new XMLDOMErrorHandler(),
          "infoset": true,
          "validate-if-schema": false,
          "namespaces": true,
          "namespace-declarations": true,
          "normalize-characters": false,
          "schema-location": '',
          "schema-type": '',
          "split-cdata-sections": true,
          "validate": false,
          "well-formed": true
        };
        this.params = clonedSelf = Object.create(this.defaultParams);
      }

      // Gets the value of a parameter.

      // `name` name of the parameter
      getParameter(name) {
        if (this.params.hasOwnProperty(name)) {
          return this.params[name];
        } else {
          return null;
        }
      }

      // Checks if setting a parameter to a specific value is supported.

      // `name` name of the parameter
      // `value` parameter value
      canSetParameter(name, value) {
        return true;
      }

      // Sets the value of a parameter.

      // `name` name of the parameter
      // `value` new value or null if the user wishes to unset the parameter
      setParameter(name, value) {
        if (value != null) {
          return this.params[name] = value;
        } else {
          return delete this.params[name];
        }
      }

    };

    // Returns the list of parameter names
    Object.defineProperty(XMLDOMConfiguration.prototype, 'parameterNames', {
      get: function() {
        return new XMLDOMStringList(Object.keys(this.defaultParams));
      }
    });

    return XMLDOMConfiguration;

  }).call(this);

}).call(this);

},{"./XMLDOMErrorHandler":21,"./XMLDOMStringList":23}],21:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Represents the error handler for DOM operations
  var XMLDOMErrorHandler;

  module.exports = XMLDOMErrorHandler = class XMLDOMErrorHandler {
    // Initializes a new instance of `XMLDOMErrorHandler`

    constructor() {}

    // Called on the error handler when an error occurs.

    // `error` the error message as a string
    handleError(error) {
      throw new Error(error);
    }

  };

}).call(this);

},{}],22:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Implements the DOMImplementation interface
  var XMLDOMImplementation;

  module.exports = XMLDOMImplementation = class XMLDOMImplementation {
    // Tests if the DOM implementation implements a specific feature.

    // `feature` package name of the feature to test. In Level 1, the
    //           legal values are "HTML" and "XML" (case-insensitive).
    // `version` version number of the package name to test. 
    //           In Level 1, this is the string "1.0". If the version is 
    //           not specified, supporting any version of the feature will 
    //           cause the method to return true.
    hasFeature(feature, version) {
      return true;
    }

    // Creates a new document type declaration.

    // `qualifiedName` qualified name of the document type to be created
    // `publicId` public identifier of the external subset
    // `systemId` system identifier of the external subset
    createDocumentType(qualifiedName, publicId, systemId) {
      throw new Error("This DOM method is not implemented.");
    }

    // Creates a new document.

    // `namespaceURI` namespace URI of the document element to create
    // `qualifiedName` the qualified name of the document to be created
    // `doctype` the type of document to be created or null
    createDocument(namespaceURI, qualifiedName, doctype) {
      throw new Error("This DOM method is not implemented.");
    }

    // Creates a new HTML document.

    // `title` document title
    createHTMLDocument(title) {
      throw new Error("This DOM method is not implemented.");
    }

    // Returns a specialized object which implements the specialized APIs 
    // of the specified feature and version.

    // `feature` name of the feature requested.
    // `version` version number of the feature to test
    getFeature(feature, version) {
      throw new Error("This DOM method is not implemented.");
    }

  };

}).call(this);

},{}],23:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Represents a list of string entries
  var XMLDOMStringList;

  module.exports = XMLDOMStringList = (function() {
    class XMLDOMStringList {
      // Initializes a new instance of `XMLDOMStringList`
      // This is just a wrapper around an ordinary
      // JS array.

      // `arr` the array of string values
      constructor(arr) {
        this.arr = arr || [];
      }

      // Returns the indexth item in the collection.

      // `index` index into the collection
      item(index) {
        return this.arr[index] || null;
      }

      // Test if a string is part of this DOMStringList.

      // `str` the string to look for
      contains(str) {
        return this.arr.indexOf(str) !== -1;
      }

    };

    // Returns the number of strings in the list.
    Object.defineProperty(XMLDOMStringList.prototype, 'length', {
      get: function() {
        return this.arr.length;
      }
    });

    return XMLDOMStringList;

  }).call(this);

}).call(this);

},{}],24:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDTDAttList, XMLNode;

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents an attribute list
  module.exports = XMLDTDAttList = class XMLDTDAttList extends XMLNode {
    // Initializes a new instance of `XMLDTDAttList`

    // `parent` the parent `XMLDocType` element
    // `elementName` the name of the element containing this attribute
    // `attributeName` attribute name
    // `attributeType` type of the attribute
    // `defaultValueType` default value type (either #REQUIRED, #IMPLIED,
    //                    #FIXED or #DEFAULT)
    // `defaultValue` default value of the attribute
    //                (only used for #FIXED or #DEFAULT)
    constructor(parent, elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      super(parent);
      if (elementName == null) {
        throw new Error("Missing DTD element name. " + this.debugInfo());
      }
      if (attributeName == null) {
        throw new Error("Missing DTD attribute name. " + this.debugInfo(elementName));
      }
      if (!attributeType) {
        throw new Error("Missing DTD attribute type. " + this.debugInfo(elementName));
      }
      if (!defaultValueType) {
        throw new Error("Missing DTD attribute default. " + this.debugInfo(elementName));
      }
      if (defaultValueType.indexOf('#') !== 0) {
        defaultValueType = '#' + defaultValueType;
      }
      if (!defaultValueType.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/)) {
        throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT. " + this.debugInfo(elementName));
      }
      if (defaultValue && !defaultValueType.match(/^(#FIXED|#DEFAULT)$/)) {
        throw new Error("Default value only applies to #FIXED or #DEFAULT. " + this.debugInfo(elementName));
      }
      this.elementName = this.stringify.name(elementName);
      this.type = NodeType.AttributeDeclaration;
      this.attributeName = this.stringify.name(attributeName);
      this.attributeType = this.stringify.dtdAttType(attributeType);
      if (defaultValue) {
        this.defaultValue = this.stringify.dtdAttDefault(defaultValue);
      }
      this.defaultValueType = defaultValueType;
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.dtdAttList(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],25:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDTDElement, XMLNode;

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents an attribute
  module.exports = XMLDTDElement = class XMLDTDElement extends XMLNode {
    // Initializes a new instance of `XMLDTDElement`

    // `parent` the parent `XMLDocType` element
    // `name` element name
    // `value` element content (defaults to #PCDATA)
    constructor(parent, name, value) {
      super(parent);
      if (name == null) {
        throw new Error("Missing DTD element name. " + this.debugInfo());
      }
      if (!value) {
        value = '(#PCDATA)';
      }
      if (Array.isArray(value)) {
        value = '(' + value.join(',') + ')';
      }
      this.name = this.stringify.name(name);
      this.type = NodeType.ElementDeclaration;
      this.value = this.stringify.dtdElementValue(value);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.dtdElement(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],26:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDTDEntity, XMLNode, isObject;

  ({isObject} = require('./Utility'));

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents an entity declaration in the DTD
  module.exports = XMLDTDEntity = (function() {
    class XMLDTDEntity extends XMLNode {
      // Initializes a new instance of `XMLDTDEntity`

      // `parent` the parent `XMLDocType` element
      // `pe` whether this is a parameter entity or a general entity
      //      defaults to `false` (general entity)
      // `name` the name of the entity
      // `value` internal entity value or an object with external entity details
      // `value.pubID` public identifier
      // `value.sysID` system identifier
      // `value.nData` notation declaration
      constructor(parent, pe, name, value) {
        super(parent);
        if (name == null) {
          throw new Error("Missing DTD entity name. " + this.debugInfo(name));
        }
        if (value == null) {
          throw new Error("Missing DTD entity value. " + this.debugInfo(name));
        }
        this.pe = !!pe;
        this.name = this.stringify.name(name);
        this.type = NodeType.EntityDeclaration;
        if (!isObject(value)) {
          this.value = this.stringify.dtdEntityValue(value);
          this.internal = true;
        } else {
          if (!value.pubID && !value.sysID) {
            throw new Error("Public and/or system identifiers are required for an external entity. " + this.debugInfo(name));
          }
          if (value.pubID && !value.sysID) {
            throw new Error("System identifier is required for a public external entity. " + this.debugInfo(name));
          }
          this.internal = false;
          if (value.pubID != null) {
            this.pubID = this.stringify.dtdPubID(value.pubID);
          }
          if (value.sysID != null) {
            this.sysID = this.stringify.dtdSysID(value.sysID);
          }
          if (value.nData != null) {
            this.nData = this.stringify.dtdNData(value.nData);
          }
          if (this.pe && this.nData) {
            throw new Error("Notation declaration is not allowed in a parameter entity. " + this.debugInfo(name));
          }
        }
      }

      // Converts the XML fragment to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.dtdEntity(this, this.options.writer.filterOptions(options));
      }

    };

    // DOM level 1
    Object.defineProperty(XMLDTDEntity.prototype, 'publicId', {
      get: function() {
        return this.pubID;
      }
    });

    Object.defineProperty(XMLDTDEntity.prototype, 'systemId', {
      get: function() {
        return this.sysID;
      }
    });

    Object.defineProperty(XMLDTDEntity.prototype, 'notationName', {
      get: function() {
        return this.nData || null;
      }
    });

    // DOM level 3
    Object.defineProperty(XMLDTDEntity.prototype, 'inputEncoding', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDTDEntity.prototype, 'xmlEncoding', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDTDEntity.prototype, 'xmlVersion', {
      get: function() {
        return null;
      }
    });

    return XMLDTDEntity;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./Utility":14,"./XMLNode":35}],27:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDTDNotation, XMLNode;

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents a NOTATION entry in the DTD
  module.exports = XMLDTDNotation = (function() {
    class XMLDTDNotation extends XMLNode {
      // Initializes a new instance of `XMLDTDNotation`

      // `parent` the parent `XMLDocType` element
      // `name` the name of the notation
      // `value` an object with external entity details
      // `value.pubID` public identifier
      // `value.sysID` system identifier
      constructor(parent, name, value) {
        super(parent);
        if (name == null) {
          throw new Error("Missing DTD notation name. " + this.debugInfo(name));
        }
        if (!value.pubID && !value.sysID) {
          throw new Error("Public or system identifiers are required for an external entity. " + this.debugInfo(name));
        }
        this.name = this.stringify.name(name);
        this.type = NodeType.NotationDeclaration;
        if (value.pubID != null) {
          this.pubID = this.stringify.dtdPubID(value.pubID);
        }
        if (value.sysID != null) {
          this.sysID = this.stringify.dtdSysID(value.sysID);
        }
      }

      // Converts the XML fragment to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.dtdNotation(this, this.options.writer.filterOptions(options));
      }

    };

    // DOM level 1
    Object.defineProperty(XMLDTDNotation.prototype, 'publicId', {
      get: function() {
        return this.pubID;
      }
    });

    Object.defineProperty(XMLDTDNotation.prototype, 'systemId', {
      get: function() {
        return this.sysID;
      }
    });

    return XMLDTDNotation;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],28:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDeclaration, XMLNode, isObject;

  ({isObject} = require('./Utility'));

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents the XML declaration
  module.exports = XMLDeclaration = class XMLDeclaration extends XMLNode {
    // Initializes a new instance of `XMLDeclaration`

    // `parent` the document object

    // `version` A version number string, e.g. 1.0
    // `encoding` Encoding declaration, e.g. UTF-8
    // `standalone` standalone document declaration: true or false
    constructor(parent, version, encoding, standalone) {
      super(parent);
      // arguments may also be passed as an object
      if (isObject(version)) {
        ({version, encoding, standalone} = version);
      }
      if (!version) {
        version = '1.0';
      }
      this.type = NodeType.Declaration;
      this.version = this.stringify.xmlVersion(version);
      if (encoding != null) {
        this.encoding = this.stringify.xmlEncoding(encoding);
      }
      if (standalone != null) {
        this.standalone = this.stringify.xmlStandalone(standalone);
      }
    }

    // Converts to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.declaration(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./Utility":14,"./XMLNode":35}],29:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDocType, XMLNamedNodeMap, XMLNode, isObject;

  ({isObject} = require('./Utility'));

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLNamedNodeMap = require('./XMLNamedNodeMap');

  // Represents doctype declaration
  module.exports = XMLDocType = (function() {
    class XMLDocType extends XMLNode {
      // Initializes a new instance of `XMLDocType`

      // `parent` the document object

      // `pubID` public identifier of the external subset
      // `sysID` system identifier of the external subset
      constructor(parent, pubID, sysID) {
        var child, i, len, ref;
        super(parent);
        this.type = NodeType.DocType;
        // set DTD name to the name of the root node
        if (parent.children) {
          ref = parent.children;
          for (i = 0, len = ref.length; i < len; i++) {
            child = ref[i];
            if (child.type === NodeType.Element) {
              this.name = child.name;
              break;
            }
          }
        }
        this.documentObject = parent;
        // arguments may also be passed as an object
        if (isObject(pubID)) {
          ({pubID, sysID} = pubID);
        }
        if (sysID == null) {
          [sysID, pubID] = [pubID, sysID];
        }
        if (pubID != null) {
          this.pubID = this.stringify.dtdPubID(pubID);
        }
        if (sysID != null) {
          this.sysID = this.stringify.dtdSysID(sysID);
        }
      }

      // Creates an element type declaration

      // `name` element name
      // `value` element content (defaults to #PCDATA)
      element(name, value) {
        var child;
        child = new XMLDTDElement(this, name, value);
        this.children.push(child);
        return this;
      }

      // Creates an attribute declaration

      // `elementName` the name of the element containing this attribute
      // `attributeName` attribute name
      // `attributeType` type of the attribute (defaults to CDATA)
      // `defaultValueType` default value type (either #REQUIRED, #IMPLIED, #FIXED or
      //                    #DEFAULT) (defaults to #IMPLIED)
      // `defaultValue` default value of the attribute
      //                (only used for #FIXED or #DEFAULT)
      attList(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
        var child;
        child = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
        this.children.push(child);
        return this;
      }

      // Creates a general entity declaration

      // `name` the name of the entity
      // `value` internal entity value or an object with external entity details
      // `value.pubID` public identifier
      // `value.sysID` system identifier
      // `value.nData` notation declaration
      entity(name, value) {
        var child;
        child = new XMLDTDEntity(this, false, name, value);
        this.children.push(child);
        return this;
      }

      // Creates a parameter entity declaration

      // `name` the name of the entity
      // `value` internal entity value or an object with external entity details
      // `value.pubID` public identifier
      // `value.sysID` system identifier
      pEntity(name, value) {
        var child;
        child = new XMLDTDEntity(this, true, name, value);
        this.children.push(child);
        return this;
      }

      // Creates a NOTATION declaration

      // `name` the name of the notation
      // `value` an object with external entity details
      // `value.pubID` public identifier
      // `value.sysID` system identifier
      notation(name, value) {
        var child;
        child = new XMLDTDNotation(this, name, value);
        this.children.push(child);
        return this;
      }

      // Converts to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.docType(this, this.options.writer.filterOptions(options));
      }

      // Aliases
      ele(name, value) {
        return this.element(name, value);
      }

      att(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
        return this.attList(elementName, attributeName, attributeType, defaultValueType, defaultValue);
      }

      ent(name, value) {
        return this.entity(name, value);
      }

      pent(name, value) {
        return this.pEntity(name, value);
      }

      not(name, value) {
        return this.notation(name, value);
      }

      up() {
        return this.root() || this.documentObject;
      }

      isEqualNode(node) {
        if (!super.isEqualNode(node)) {
          return false;
        }
        if (node.name !== this.name) {
          return false;
        }
        if (node.publicId !== this.publicId) {
          return false;
        }
        if (node.systemId !== this.systemId) {
          return false;
        }
        return true;
      }

    };

    // DOM level 1
    Object.defineProperty(XMLDocType.prototype, 'entities', {
      get: function() {
        var child, i, len, nodes, ref;
        nodes = {};
        ref = this.children;
        for (i = 0, len = ref.length; i < len; i++) {
          child = ref[i];
          if ((child.type === NodeType.EntityDeclaration) && !child.pe) {
            nodes[child.name] = child;
          }
        }
        return new XMLNamedNodeMap(nodes);
      }
    });

    Object.defineProperty(XMLDocType.prototype, 'notations', {
      get: function() {
        var child, i, len, nodes, ref;
        nodes = {};
        ref = this.children;
        for (i = 0, len = ref.length; i < len; i++) {
          child = ref[i];
          if (child.type === NodeType.NotationDeclaration) {
            nodes[child.name] = child;
          }
        }
        return new XMLNamedNodeMap(nodes);
      }
    });

    // DOM level 2
    Object.defineProperty(XMLDocType.prototype, 'publicId', {
      get: function() {
        return this.pubID;
      }
    });

    Object.defineProperty(XMLDocType.prototype, 'systemId', {
      get: function() {
        return this.sysID;
      }
    });

    Object.defineProperty(XMLDocType.prototype, 'internalSubset', {
      get: function() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    return XMLDocType;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./Utility":14,"./XMLDTDAttList":24,"./XMLDTDElement":25,"./XMLDTDEntity":26,"./XMLDTDNotation":27,"./XMLNamedNodeMap":34,"./XMLNode":35}],30:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDOMConfiguration, XMLDOMImplementation, XMLDocument, XMLNode, XMLStringWriter, XMLStringifier, isPlainObject;

  ({isPlainObject} = require('./Utility'));

  XMLDOMImplementation = require('./XMLDOMImplementation');

  XMLDOMConfiguration = require('./XMLDOMConfiguration');

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  XMLStringifier = require('./XMLStringifier');

  XMLStringWriter = require('./XMLStringWriter');

  // Represents an XML builder
  module.exports = XMLDocument = (function() {
    class XMLDocument extends XMLNode {
      // Initializes a new instance of `XMLDocument`

      // `options.keepNullNodes` whether nodes with null values will be kept
      //     or ignored: true or false
      // `options.keepNullAttributes` whether attributes with null values will be
      //     kept or ignored: true or false
      // `options.ignoreDecorators` whether decorator strings will be ignored when
      //     converting JS objects: true or false
      // `options.separateArrayItems` whether array items are created as separate
      //     nodes when passed as an object value: true or false
      // `options.noDoubleEncoding` whether existing html entities are encoded:
      //     true or false
      // `options.stringify` a set of functions to use for converting values to
      //     strings
      // `options.writer` the default XML writer to use for converting nodes to
      //     string. If the default writer is not set, the built-in XMLStringWriter
      //     will be used instead.
      constructor(options) {
        super(null);
        this.name = "#document";
        this.type = NodeType.Document;
        this.documentURI = null;
        this.domConfig = new XMLDOMConfiguration();
        options || (options = {});
        if (!options.writer) {
          options.writer = new XMLStringWriter();
        }
        this.options = options;
        this.stringify = new XMLStringifier(options);
      }

      // Ends the document and passes it to the given XML writer

      // `writer` is either an XML writer or a plain object to pass to the
      // constructor of the default XML writer. The default writer is assigned when
      // creating the XML document. Following flags are recognized by the
      // built-in XMLStringWriter:
      //   `writer.pretty` pretty prints the result
      //   `writer.indent` indentation for pretty print
      //   `writer.offset` how many indentations to add to every line for pretty print
      //   `writer.newline` newline sequence for pretty print
      end(writer) {
        var writerOptions;
        writerOptions = {};
        if (!writer) {
          writer = this.options.writer;
        } else if (isPlainObject(writer)) {
          writerOptions = writer;
          writer = this.options.writer;
        }
        return writer.document(this, writer.filterOptions(writerOptions));
      }

      // Converts the XML document to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.document(this, this.options.writer.filterOptions(options));
      }

      // DOM level 1 functions to be implemented later
      createElement(tagName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createDocumentFragment() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createTextNode(data) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createComment(data) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createCDATASection(data) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createProcessingInstruction(target, data) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createAttribute(name) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createEntityReference(name) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByTagName(tagname) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM level 2 functions to be implemented later
      importNode(importedNode, deep) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createElementNS(namespaceURI, qualifiedName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createAttributeNS(namespaceURI, qualifiedName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByTagNameNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementById(elementId) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM level 3 functions to be implemented later
      adoptNode(source) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      normalizeDocument() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      renameNode(node, namespaceURI, qualifiedName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM level 4 functions to be implemented later
      getElementsByClassName(classNames) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createEvent(eventInterface) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createRange() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createNodeIterator(root, whatToShow, filter) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      createTreeWalker(root, whatToShow, filter) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

    };

    // DOM level 1
    Object.defineProperty(XMLDocument.prototype, 'implementation', {
      value: new XMLDOMImplementation()
    });

    Object.defineProperty(XMLDocument.prototype, 'doctype', {
      get: function() {
        var child, i, len, ref;
        ref = this.children;
        for (i = 0, len = ref.length; i < len; i++) {
          child = ref[i];
          if (child.type === NodeType.DocType) {
            return child;
          }
        }
        return null;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'documentElement', {
      get: function() {
        return this.rootObject || null;
      }
    });

    // DOM level 3
    Object.defineProperty(XMLDocument.prototype, 'inputEncoding', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'strictErrorChecking', {
      get: function() {
        return false;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'xmlEncoding', {
      get: function() {
        if (this.children.length !== 0 && this.children[0].type === NodeType.Declaration) {
          return this.children[0].encoding;
        } else {
          return null;
        }
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'xmlStandalone', {
      get: function() {
        if (this.children.length !== 0 && this.children[0].type === NodeType.Declaration) {
          return this.children[0].standalone === 'yes';
        } else {
          return false;
        }
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'xmlVersion', {
      get: function() {
        if (this.children.length !== 0 && this.children[0].type === NodeType.Declaration) {
          return this.children[0].version;
        } else {
          return "1.0";
        }
      }
    });

    // DOM level 4
    Object.defineProperty(XMLDocument.prototype, 'URL', {
      get: function() {
        return this.documentURI;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'origin', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'compatMode', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'characterSet', {
      get: function() {
        return null;
      }
    });

    Object.defineProperty(XMLDocument.prototype, 'contentType', {
      get: function() {
        return null;
      }
    });

    return XMLDocument;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./Utility":14,"./XMLDOMConfiguration":20,"./XMLDOMImplementation":22,"./XMLNode":35,"./XMLStringWriter":40,"./XMLStringifier":41}],31:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, WriterState, XMLAttribute, XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLDocument, XMLDocumentCB, XMLElement, XMLProcessingInstruction, XMLRaw, XMLStringWriter, XMLStringifier, XMLText, getValue, isFunction, isObject, isPlainObject,
    hasProp = {}.hasOwnProperty;

  ({isObject, isFunction, isPlainObject, getValue} = require('./Utility'));

  NodeType = require('./NodeType');

  XMLDocument = require('./XMLDocument');

  XMLElement = require('./XMLElement');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLRaw = require('./XMLRaw');

  XMLText = require('./XMLText');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDNotation = require('./XMLDTDNotation');

  XMLAttribute = require('./XMLAttribute');

  XMLStringifier = require('./XMLStringifier');

  XMLStringWriter = require('./XMLStringWriter');

  WriterState = require('./WriterState');

  // Represents an XML builder
  module.exports = XMLDocumentCB = class XMLDocumentCB {
    // Initializes a new instance of `XMLDocumentCB`

    // `options.keepNullNodes` whether nodes with null values will be kept
    //     or ignored: true or false
    // `options.keepNullAttributes` whether attributes with null values will be
    //     kept or ignored: true or false
    // `options.ignoreDecorators` whether decorator strings will be ignored when
    //     converting JS objects: true or false
    // `options.separateArrayItems` whether array items are created as separate
    //     nodes when passed as an object value: true or false
    // `options.noDoubleEncoding` whether existing html entities are encoded:
    //     true or false
    // `options.stringify` a set of functions to use for converting values to
    //     strings
    // `options.writer` the default XML writer to use for converting nodes to
    //     string. If the default writer is not set, the built-in XMLStringWriter
    //     will be used instead.

    // `onData` the function to be called when a new chunk of XML is output. The
    //          string containing the XML chunk is passed to `onData` as its first
    //          argument, and the current indentation level as its second argument.
    // `onEnd`  the function to be called when the XML document is completed with
    //          `end`. `onEnd` does not receive any arguments.
    constructor(options, onData, onEnd) {
      var writerOptions;
      this.name = "?xml";
      this.type = NodeType.Document;
      options || (options = {});
      writerOptions = {};
      if (!options.writer) {
        options.writer = new XMLStringWriter();
      } else if (isPlainObject(options.writer)) {
        writerOptions = options.writer;
        options.writer = new XMLStringWriter();
      }
      this.options = options;
      this.writer = options.writer;
      this.writerOptions = this.writer.filterOptions(writerOptions);
      this.stringify = new XMLStringifier(options);
      this.onDataCallback = onData || function() {};
      this.onEndCallback = onEnd || function() {};
      this.currentNode = null;
      this.currentLevel = -1;
      this.openTags = {};
      this.documentStarted = false;
      this.documentCompleted = false;
      this.root = null;
    }

    // Creates a child element node from the given XMLNode

    // `node` the child node
    createChildNode(node) {
      var att, attName, attributes, child, i, len, ref, ref1;
      switch (node.type) {
        case NodeType.CData:
          this.cdata(node.value);
          break;
        case NodeType.Comment:
          this.comment(node.value);
          break;
        case NodeType.Element:
          attributes = {};
          ref = node.attribs;
          for (attName in ref) {
            if (!hasProp.call(ref, attName)) continue;
            att = ref[attName];
            attributes[attName] = att.value;
          }
          this.node(node.name, attributes);
          break;
        case NodeType.Dummy:
          this.dummy();
          break;
        case NodeType.Raw:
          this.raw(node.value);
          break;
        case NodeType.Text:
          this.text(node.value);
          break;
        case NodeType.ProcessingInstruction:
          this.instruction(node.target, node.value);
          break;
        default:
          throw new Error("This XML node type is not supported in a JS object: " + node.constructor.name);
      }
      ref1 = node.children;
      // write child nodes recursively
      for (i = 0, len = ref1.length; i < len; i++) {
        child = ref1[i];
        this.createChildNode(child);
        if (child.type === NodeType.Element) {
          this.up();
        }
      }
      return this;
    }

    // Creates a dummy node

    dummy() {
      // no-op, just return this
      return this;
    }

    // Creates a node

    // `name` name of the node
    // `attributes` an object containing name/value pairs of attributes
    // `text` element text
    node(name, attributes, text) {
      if (name == null) {
        throw new Error("Missing node name.");
      }
      if (this.root && this.currentLevel === -1) {
        throw new Error("Document can only have one root node. " + this.debugInfo(name));
      }
      this.openCurrent();
      name = getValue(name);
      if (attributes == null) {
        attributes = {};
      }
      attributes = getValue(attributes);
      // swap argument order: text <-> attributes
      if (!isObject(attributes)) {
        [text, attributes] = [attributes, text];
      }
      this.currentNode = new XMLElement(this, name, attributes);
      this.currentNode.children = false;
      this.currentLevel++;
      this.openTags[this.currentLevel] = this.currentNode;
      if (text != null) {
        this.text(text);
      }
      return this;
    }

    // Creates a child element node or an element type declaration when called
    // inside the DTD

    // `name` name of the node
    // `attributes` an object containing name/value pairs of attributes
    // `text` element text
    element(name, attributes, text) {
      var child, i, len, oldValidationFlag, ref, root;
      if (this.currentNode && this.currentNode.type === NodeType.DocType) {
        this.dtdElement(...arguments);
      } else {
        if (Array.isArray(name) || isObject(name) || isFunction(name)) {
          oldValidationFlag = this.options.noValidation;
          this.options.noValidation = true;
          root = new XMLDocument(this.options).element('TEMP_ROOT');
          root.element(name);
          this.options.noValidation = oldValidationFlag;
          ref = root.children;
          for (i = 0, len = ref.length; i < len; i++) {
            child = ref[i];
            this.createChildNode(child);
            if (child.type === NodeType.Element) {
              this.up();
            }
          }
        } else {
          this.node(name, attributes, text);
        }
      }
      return this;
    }

    // Adds or modifies an attribute

    // `name` attribute name
    // `value` attribute value
    attribute(name, value) {
      var attName, attValue;
      if (!this.currentNode || this.currentNode.children) {
        throw new Error("att() can only be used immediately after an ele() call in callback mode. " + this.debugInfo(name));
      }
      if (name != null) {
        name = getValue(name);
      }
      if (isObject(name)) { // expand if object
        for (attName in name) {
          if (!hasProp.call(name, attName)) continue;
          attValue = name[attName];
          this.attribute(attName, attValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        if (this.options.keepNullAttributes && (value == null)) {
          this.currentNode.attribs[name] = new XMLAttribute(this, name, "");
        } else if (value != null) {
          this.currentNode.attribs[name] = new XMLAttribute(this, name, value);
        }
      }
      return this;
    }

    // Creates a text node

    // `value` element text
    text(value) {
      var node;
      this.openCurrent();
      node = new XMLText(this, value);
      this.onData(this.writer.text(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates a CDATA node

    // `value` element text without CDATA delimiters
    cdata(value) {
      var node;
      this.openCurrent();
      node = new XMLCData(this, value);
      this.onData(this.writer.cdata(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates a comment node

    // `value` comment text
    comment(value) {
      var node;
      this.openCurrent();
      node = new XMLComment(this, value);
      this.onData(this.writer.comment(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Adds unescaped raw text

    // `value` text
    raw(value) {
      var node;
      this.openCurrent();
      node = new XMLRaw(this, value);
      this.onData(this.writer.raw(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Adds a processing instruction

    // `target` instruction target
    // `value` instruction value
    instruction(target, value) {
      var i, insTarget, insValue, len, node;
      this.openCurrent();
      if (target != null) {
        target = getValue(target);
      }
      if (value != null) {
        value = getValue(value);
      }
      if (Array.isArray(target)) { // expand if array
        for (i = 0, len = target.length; i < len; i++) {
          insTarget = target[i];
          this.instruction(insTarget);
        }
      } else if (isObject(target)) { // expand if object
        for (insTarget in target) {
          if (!hasProp.call(target, insTarget)) continue;
          insValue = target[insTarget];
          this.instruction(insTarget, insValue);
        }
      } else {
        if (isFunction(value)) {
          value = value.apply();
        }
        node = new XMLProcessingInstruction(this, target, value);
        this.onData(this.writer.processingInstruction(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      }
      return this;
    }

    // Creates the xml declaration

    // `version` A version number string, e.g. 1.0
    // `encoding` Encoding declaration, e.g. UTF-8
    // `standalone` standalone document declaration: true or false
    declaration(version, encoding, standalone) {
      var node;
      this.openCurrent();
      if (this.documentStarted) {
        throw new Error("declaration() must be the first node.");
      }
      node = new XMLDeclaration(this, version, encoding, standalone);
      this.onData(this.writer.declaration(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates the document type declaration

    // `root`  the name of the root node
    // `pubID` the public identifier of the external subset
    // `sysID` the system identifier of the external subset
    doctype(root, pubID, sysID) {
      this.openCurrent();
      if (root == null) {
        throw new Error("Missing root node name.");
      }
      if (this.root) {
        throw new Error("dtd() must come before the root node.");
      }
      this.currentNode = new XMLDocType(this, pubID, sysID);
      this.currentNode.rootNodeName = root;
      this.currentNode.children = false;
      this.currentLevel++;
      this.openTags[this.currentLevel] = this.currentNode;
      return this;
    }

    // Creates an element type declaration

    // `name` element name
    // `value` element content (defaults to #PCDATA)
    dtdElement(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDElement(this, name, value);
      this.onData(this.writer.dtdElement(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates an attribute declaration

    // `elementName` the name of the element containing this attribute
    // `attributeName` attribute name
    // `attributeType` type of the attribute (defaults to CDATA)
    // `defaultValueType` default value type (either #REQUIRED, #IMPLIED, #FIXED or
    //                    #DEFAULT) (defaults to #IMPLIED)
    // `defaultValue` default value of the attribute
    //                (only used for #FIXED or #DEFAULT)
    attList(elementName, attributeName, attributeType, defaultValueType, defaultValue) {
      var node;
      this.openCurrent();
      node = new XMLDTDAttList(this, elementName, attributeName, attributeType, defaultValueType, defaultValue);
      this.onData(this.writer.dtdAttList(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates a general entity declaration

    // `name` the name of the entity
    // `value` internal entity value or an object with external entity details
    // `value.pubID` public identifier
    // `value.sysID` system identifier
    // `value.nData` notation declaration
    entity(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDEntity(this, false, name, value);
      this.onData(this.writer.dtdEntity(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates a parameter entity declaration

    // `name` the name of the entity
    // `value` internal entity value or an object with external entity details
    // `value.pubID` public identifier
    // `value.sysID` system identifier
    pEntity(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDEntity(this, true, name, value);
      this.onData(this.writer.dtdEntity(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Creates a NOTATION declaration

    // `name` the name of the notation
    // `value` an object with external entity details
    // `value.pubID` public identifier
    // `value.sysID` system identifier
    notation(name, value) {
      var node;
      this.openCurrent();
      node = new XMLDTDNotation(this, name, value);
      this.onData(this.writer.dtdNotation(node, this.writerOptions, this.currentLevel + 1), this.currentLevel + 1);
      return this;
    }

    // Gets the parent node
    up() {
      if (this.currentLevel < 0) {
        throw new Error("The document node has no parent.");
      }
      if (this.currentNode) {
        if (this.currentNode.children) {
          this.closeNode(this.currentNode);
        } else {
          this.openNode(this.currentNode);
        }
        this.currentNode = null;
      } else {
        this.closeNode(this.openTags[this.currentLevel]);
      }
      delete this.openTags[this.currentLevel];
      this.currentLevel--;
      return this;
    }

    // Ends the document
    end() {
      while (this.currentLevel >= 0) {
        this.up();
      }
      return this.onEnd();
    }

    // Opens the current parent node
    openCurrent() {
      if (this.currentNode) {
        this.currentNode.children = true;
        return this.openNode(this.currentNode);
      }
    }

    // Writes the opening tag of the current node or the entire node if it has
    // no child nodes
    openNode(node) {
      var att, chunk, name, ref;
      if (!node.isOpen) {
        if (!this.root && this.currentLevel === 0 && node.type === NodeType.Element) {
          this.root = node;
        }
        chunk = '';
        if (node.type === NodeType.Element) {
          this.writerOptions.state = WriterState.OpenTag;
          chunk = this.writer.indent(node, this.writerOptions, this.currentLevel) + '<' + node.name;
          ref = node.attribs;
          for (name in ref) {
            if (!hasProp.call(ref, name)) continue;
            att = ref[name];
            chunk += this.writer.attribute(att, this.writerOptions, this.currentLevel);
          }
          chunk += (node.children ? '>' : '/>') + this.writer.endline(node, this.writerOptions, this.currentLevel);
          this.writerOptions.state = WriterState.InsideTag; // if node.type is NodeType.DocType
        } else {
          this.writerOptions.state = WriterState.OpenTag;
          chunk = this.writer.indent(node, this.writerOptions, this.currentLevel) + '<!DOCTYPE ' + node.rootNodeName;
          
          // external identifier
          if (node.pubID && node.sysID) {
            chunk += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
          } else if (node.sysID) {
            chunk += ' SYSTEM "' + node.sysID + '"';
          }
          
          // internal subset
          if (node.children) {
            chunk += ' [';
            this.writerOptions.state = WriterState.InsideTag;
          } else {
            this.writerOptions.state = WriterState.CloseTag;
            chunk += '>';
          }
          chunk += this.writer.endline(node, this.writerOptions, this.currentLevel);
        }
        this.onData(chunk, this.currentLevel);
        return node.isOpen = true;
      }
    }

    // Writes the closing tag of the current node
    closeNode(node) {
      var chunk;
      if (!node.isClosed) {
        chunk = '';
        this.writerOptions.state = WriterState.CloseTag;
        if (node.type === NodeType.Element) {
          chunk = this.writer.indent(node, this.writerOptions, this.currentLevel) + '</' + node.name + '>' + this.writer.endline(node, this.writerOptions, this.currentLevel); // if node.type is NodeType.DocType
        } else {
          chunk = this.writer.indent(node, this.writerOptions, this.currentLevel) + ']>' + this.writer.endline(node, this.writerOptions, this.currentLevel);
        }
        this.writerOptions.state = WriterState.None;
        this.onData(chunk, this.currentLevel);
        return node.isClosed = true;
      }
    }

    // Called when a new chunk of XML is output

    // `chunk` a string containing the XML chunk
    // `level` current indentation level
    onData(chunk, level) {
      this.documentStarted = true;
      return this.onDataCallback(chunk, level + 1);
    }

    // Called when the XML document is completed
    onEnd() {
      this.documentCompleted = true;
      return this.onEndCallback();
    }

    // Returns debug string
    debugInfo(name) {
      if (name == null) {
        return "";
      } else {
        return "node: <" + name + ">";
      }
    }

    // Node aliases
    ele() {
      return this.element(...arguments);
    }

    nod(name, attributes, text) {
      return this.node(name, attributes, text);
    }

    txt(value) {
      return this.text(value);
    }

    dat(value) {
      return this.cdata(value);
    }

    com(value) {
      return this.comment(value);
    }

    ins(target, value) {
      return this.instruction(target, value);
    }

    dec(version, encoding, standalone) {
      return this.declaration(version, encoding, standalone);
    }

    dtd(root, pubID, sysID) {
      return this.doctype(root, pubID, sysID);
    }

    e(name, attributes, text) {
      return this.element(name, attributes, text);
    }

    n(name, attributes, text) {
      return this.node(name, attributes, text);
    }

    t(value) {
      return this.text(value);
    }

    d(value) {
      return this.cdata(value);
    }

    c(value) {
      return this.comment(value);
    }

    r(value) {
      return this.raw(value);
    }

    i(target, value) {
      return this.instruction(target, value);
    }

    // Attribute aliases
    att() {
      if (this.currentNode && this.currentNode.type === NodeType.DocType) {
        return this.attList(...arguments);
      } else {
        return this.attribute(...arguments);
      }
    }

    a() {
      if (this.currentNode && this.currentNode.type === NodeType.DocType) {
        return this.attList(...arguments);
      } else {
        return this.attribute(...arguments);
      }
    }

    // DTD aliases
    // att() and ele() are defined above
    ent(name, value) {
      return this.entity(name, value);
    }

    pent(name, value) {
      return this.pEntity(name, value);
    }

    not(name, value) {
      return this.notation(name, value);
    }

  };

}).call(this);

},{"./NodeType":13,"./Utility":14,"./WriterState":15,"./XMLAttribute":16,"./XMLCData":17,"./XMLComment":19,"./XMLDTDAttList":24,"./XMLDTDElement":25,"./XMLDTDEntity":26,"./XMLDTDNotation":27,"./XMLDeclaration":28,"./XMLDocType":29,"./XMLDocument":30,"./XMLElement":33,"./XMLProcessingInstruction":37,"./XMLRaw":38,"./XMLStringWriter":40,"./XMLStringifier":41,"./XMLText":42}],32:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLDummy, XMLNode;

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  // Represents a  raw node
  module.exports = XMLDummy = class XMLDummy extends XMLNode {
    // Initializes a new instance of `XMLDummy`

    // `XMLDummy` is a special node representing a node with 
    // a null value. Dummy nodes are created while recursively
    // building the XML tree. Simply skipping null values doesn't
    // work because that would break the recursive chain.
    constructor(parent) {
      super(parent);
      this.type = NodeType.Dummy;
    }

    // Creates and returns a deep clone of `this`
    clone() {
      return Object.create(this);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return '';
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],33:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLAttribute, XMLElement, XMLNamedNodeMap, XMLNode, getValue, isFunction, isObject,
    hasProp = {}.hasOwnProperty;

  ({isObject, isFunction, getValue} = require('./Utility'));

  XMLNode = require('./XMLNode');

  NodeType = require('./NodeType');

  XMLAttribute = require('./XMLAttribute');

  XMLNamedNodeMap = require('./XMLNamedNodeMap');

  // Represents an element of the XML document
  module.exports = XMLElement = (function() {
    class XMLElement extends XMLNode {
      // Initializes a new instance of `XMLElement`

      // `parent` the parent node
      // `name` element name
      // `attributes` an object containing name/value pairs of attributes
      constructor(parent, name, attributes) {
        var child, j, len, ref;
        super(parent);
        if (name == null) {
          throw new Error("Missing element name. " + this.debugInfo());
        }
        this.name = this.stringify.name(name);
        this.type = NodeType.Element;
        this.attribs = {};
        this.schemaTypeInfo = null;
        if (attributes != null) {
          this.attribute(attributes);
        }
        // set properties if this is the root node
        if (parent.type === NodeType.Document) {
          this.isRoot = true;
          this.documentObject = parent;
          parent.rootObject = this;
          // set dtd name
          if (parent.children) {
            ref = parent.children;
            for (j = 0, len = ref.length; j < len; j++) {
              child = ref[j];
              if (child.type === NodeType.DocType) {
                child.name = this.name;
                break;
              }
            }
          }
        }
      }

      // Creates and returns a deep clone of `this`

      clone() {
        var att, attName, clonedSelf, ref;
        clonedSelf = Object.create(this);
        // remove document element
        if (clonedSelf.isRoot) {
          clonedSelf.documentObject = null;
        }
        // clone attributes
        clonedSelf.attribs = {};
        ref = this.attribs;
        for (attName in ref) {
          if (!hasProp.call(ref, attName)) continue;
          att = ref[attName];
          clonedSelf.attribs[attName] = att.clone();
        }
        // clone child nodes
        clonedSelf.children = [];
        this.children.forEach(function(child) {
          var clonedChild;
          clonedChild = child.clone();
          clonedChild.parent = clonedSelf;
          return clonedSelf.children.push(clonedChild);
        });
        return clonedSelf;
      }

      // Adds or modifies an attribute

      // `name` attribute name
      // `value` attribute value
      attribute(name, value) {
        var attName, attValue;
        if (name != null) {
          name = getValue(name);
        }
        if (isObject(name)) { // expand if object
          for (attName in name) {
            if (!hasProp.call(name, attName)) continue;
            attValue = name[attName];
            this.attribute(attName, attValue);
          }
        } else {
          if (isFunction(value)) {
            value = value.apply();
          }
          if (this.options.keepNullAttributes && (value == null)) {
            this.attribs[name] = new XMLAttribute(this, name, "");
          } else if (value != null) {
            this.attribs[name] = new XMLAttribute(this, name, value);
          }
        }
        return this;
      }

      // Removes an attribute

      // `name` attribute name
      removeAttribute(name) {
        var attName, j, len;
        // Also defined in DOM level 1
        // removeAttribute(name) removes an attribute by name.
        if (name == null) {
          throw new Error("Missing attribute name. " + this.debugInfo());
        }
        name = getValue(name);
        if (Array.isArray(name)) { // expand if array
          for (j = 0, len = name.length; j < len; j++) {
            attName = name[j];
            delete this.attribs[attName];
          }
        } else {
          delete this.attribs[name];
        }
        return this;
      }

      // Converts the XML fragment to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      // `options.allowEmpty` do not self close empty element tags
      toString(options) {
        return this.options.writer.element(this, this.options.writer.filterOptions(options));
      }

      // Aliases
      att(name, value) {
        return this.attribute(name, value);
      }

      a(name, value) {
        return this.attribute(name, value);
      }

      // DOM Level 1
      getAttribute(name) {
        if (this.attribs.hasOwnProperty(name)) {
          return this.attribs[name].value;
        } else {
          return null;
        }
      }

      setAttribute(name, value) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getAttributeNode(name) {
        if (this.attribs.hasOwnProperty(name)) {
          return this.attribs[name];
        } else {
          return null;
        }
      }

      setAttributeNode(newAttr) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      removeAttributeNode(oldAttr) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByTagName(name) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM Level 2
      getAttributeNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      setAttributeNS(namespaceURI, qualifiedName, value) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      removeAttributeNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getAttributeNodeNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      setAttributeNodeNS(newAttr) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByTagNameNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      hasAttribute(name) {
        return this.attribs.hasOwnProperty(name);
      }

      hasAttributeNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM Level 3
      setIdAttribute(name, isId) {
        if (this.attribs.hasOwnProperty(name)) {
          return this.attribs[name].isId;
        } else {
          return isId;
        }
      }

      setIdAttributeNS(namespaceURI, localName, isId) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      setIdAttributeNode(idAttr, isId) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM Level 4
      getElementsByTagName(tagname) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByTagNameNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getElementsByClassName(classNames) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      isEqualNode(node) {
        var i, j, ref;
        if (!super.isEqualNode(node)) {
          return false;
        }
        if (node.namespaceURI !== this.namespaceURI) {
          return false;
        }
        if (node.prefix !== this.prefix) {
          return false;
        }
        if (node.localName !== this.localName) {
          return false;
        }
        if (node.attribs.length !== this.attribs.length) {
          return false;
        }
        for (i = j = 0, ref = this.attribs.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
          if (!this.attribs[i].isEqualNode(node.attribs[i])) {
            return false;
          }
        }
        return true;
      }

    };

    // DOM level 1
    Object.defineProperty(XMLElement.prototype, 'tagName', {
      get: function() {
        return this.name;
      }
    });

    // DOM level 4
    Object.defineProperty(XMLElement.prototype, 'namespaceURI', {
      get: function() {
        return '';
      }
    });

    Object.defineProperty(XMLElement.prototype, 'prefix', {
      get: function() {
        return '';
      }
    });

    Object.defineProperty(XMLElement.prototype, 'localName', {
      get: function() {
        return this.name;
      }
    });

    Object.defineProperty(XMLElement.prototype, 'id', {
      get: function() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    Object.defineProperty(XMLElement.prototype, 'className', {
      get: function() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    Object.defineProperty(XMLElement.prototype, 'classList', {
      get: function() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    Object.defineProperty(XMLElement.prototype, 'attributes', {
      get: function() {
        if (!this.attributeMap || !this.attributeMap.nodes) {
          this.attributeMap = new XMLNamedNodeMap(this.attribs);
        }
        return this.attributeMap;
      }
    });

    return XMLElement;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./Utility":14,"./XMLAttribute":16,"./XMLNamedNodeMap":34,"./XMLNode":35}],34:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Represents a map of nodes accessed by a string key
  var XMLNamedNodeMap;

  module.exports = XMLNamedNodeMap = (function() {
    class XMLNamedNodeMap {
      // Initializes a new instance of `XMLNamedNodeMap`
      // This is just a wrapper around an ordinary
      // JS object.

      // `nodes` the object containing nodes.
      constructor(nodes) {
        this.nodes = nodes;
      }

      // Creates and returns a deep clone of `this`

      clone() {
        // this class should not be cloned since it wraps
        // around a given object. The calling function should check
        // whether the wrapped object is null and supply a new object
        // (from the clone).
        return this.nodes = null;
      }

      // DOM Level 1
      getNamedItem(name) {
        return this.nodes[name];
      }

      setNamedItem(node) {
        var oldNode;
        oldNode = this.nodes[node.nodeName];
        this.nodes[node.nodeName] = node;
        return oldNode || null;
      }

      removeNamedItem(name) {
        var oldNode;
        oldNode = this.nodes[name];
        delete this.nodes[name];
        return oldNode || null;
      }

      item(index) {
        return this.nodes[Object.keys(this.nodes)[index]] || null;
      }

      // DOM level 2 functions to be implemented later
      getNamedItemNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented.");
      }

      setNamedItemNS(node) {
        throw new Error("This DOM method is not implemented.");
      }

      removeNamedItemNS(namespaceURI, localName) {
        throw new Error("This DOM method is not implemented.");
      }

    };

    
    // DOM level 1
    Object.defineProperty(XMLNamedNodeMap.prototype, 'length', {
      get: function() {
        return Object.keys(this.nodes).length || 0;
      }
    });

    return XMLNamedNodeMap;

  }).call(this);

}).call(this);

},{}],35:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var DocumentPosition, NodeType, XMLCData, XMLComment, XMLDeclaration, XMLDocType, XMLDummy, XMLElement, XMLNamedNodeMap, XMLNode, XMLNodeList, XMLProcessingInstruction, XMLRaw, XMLText, getValue, isEmpty, isFunction, isObject,
    hasProp = {}.hasOwnProperty,
    splice = [].splice;

  ({isObject, isFunction, isEmpty, getValue} = require('./Utility'));

  XMLElement = null;

  XMLCData = null;

  XMLComment = null;

  XMLDeclaration = null;

  XMLDocType = null;

  XMLRaw = null;

  XMLText = null;

  XMLProcessingInstruction = null;

  XMLDummy = null;

  NodeType = null;

  XMLNodeList = null;

  XMLNamedNodeMap = null;

  DocumentPosition = null;

  // Represents a generic XMl element
  module.exports = XMLNode = (function() {
    class XMLNode {
      // Initializes a new instance of `XMLNode`

      // `parent` the parent node
      constructor(parent1) {
        this.parent = parent1;
        if (this.parent) {
          this.options = this.parent.options;
          this.stringify = this.parent.stringify;
        }
        this.value = null;
        this.children = [];
        this.baseURI = null;
        // first execution, load dependencies that are otherwise
        // circular (so we can't load them at the top)
        if (!XMLElement) {
          XMLElement = require('./XMLElement');
          XMLCData = require('./XMLCData');
          XMLComment = require('./XMLComment');
          XMLDeclaration = require('./XMLDeclaration');
          XMLDocType = require('./XMLDocType');
          XMLRaw = require('./XMLRaw');
          XMLText = require('./XMLText');
          XMLProcessingInstruction = require('./XMLProcessingInstruction');
          XMLDummy = require('./XMLDummy');
          NodeType = require('./NodeType');
          XMLNodeList = require('./XMLNodeList');
          XMLNamedNodeMap = require('./XMLNamedNodeMap');
          DocumentPosition = require('./DocumentPosition');
        }
      }

      
      // Sets the parent node of this node and its children recursively

      // `parent` the parent node
      setParent(parent) {
        var child, j, len, ref1, results;
        this.parent = parent;
        if (parent) {
          this.options = parent.options;
          this.stringify = parent.stringify;
        }
        ref1 = this.children;
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          child = ref1[j];
          results.push(child.setParent(this));
        }
        return results;
      }

      // Creates a child element node

      // `name` node name or an object describing the XML tree
      // `attributes` an object containing name/value pairs of attributes
      // `text` element text
      element(name, attributes, text) {
        var childNode, item, j, k, key, lastChild, len, len1, val;
        lastChild = null;
        if (attributes === null && (text == null)) {
          [attributes, text] = [{}, null];
        }
        if (attributes == null) {
          attributes = {};
        }
        attributes = getValue(attributes);
        // swap argument order: text <-> attributes
        if (!isObject(attributes)) {
          [text, attributes] = [attributes, text];
        }
        if (name != null) {
          name = getValue(name);
        }
        // expand if array
        if (Array.isArray(name)) {
          for (j = 0, len = name.length; j < len; j++) {
            item = name[j];
            lastChild = this.element(item);
          }
        // evaluate if function
        } else if (isFunction(name)) {
          lastChild = this.element(name.apply());
        // expand if object
        } else if (isObject(name)) {
          for (key in name) {
            if (!hasProp.call(name, key)) continue;
            val = name[key];
            if (isFunction(val)) {
              // evaluate if function
              val = val.apply();
            }
            // assign attributes
            if (!this.options.ignoreDecorators && this.stringify.convertAttKey && key.indexOf(this.stringify.convertAttKey) === 0) {
              lastChild = this.attribute(key.substr(this.stringify.convertAttKey.length), val);
            // skip empty arrays
            } else if (!this.options.separateArrayItems && Array.isArray(val) && isEmpty(val)) {
              lastChild = this.dummy();
            // empty objects produce one node
            } else if (isObject(val) && isEmpty(val)) {
              lastChild = this.element(key);
            // skip null and undefined nodes
            } else if (!this.options.keepNullNodes && (val == null)) {
              lastChild = this.dummy();
            
            // expand list by creating child nodes
            } else if (!this.options.separateArrayItems && Array.isArray(val)) {
              for (k = 0, len1 = val.length; k < len1; k++) {
                item = val[k];
                childNode = {};
                childNode[key] = item;
                lastChild = this.element(childNode);
              }
            
            // expand child nodes under parent
            } else if (isObject(val)) {
              // if the key is #text expand child nodes under this node to support mixed content
              if (!this.options.ignoreDecorators && this.stringify.convertTextKey && key.indexOf(this.stringify.convertTextKey) === 0) {
                lastChild = this.element(val);
              } else {
                lastChild = this.element(key);
                lastChild.element(val);
              }
            } else {
              
              // text node
              lastChild = this.element(key, val);
            }
          }
        // skip null nodes
        } else if (!this.options.keepNullNodes && text === null) {
          lastChild = this.dummy();
        } else {
          // text node
          if (!this.options.ignoreDecorators && this.stringify.convertTextKey && name.indexOf(this.stringify.convertTextKey) === 0) {
            lastChild = this.text(text);
          // cdata node
          } else if (!this.options.ignoreDecorators && this.stringify.convertCDataKey && name.indexOf(this.stringify.convertCDataKey) === 0) {
            lastChild = this.cdata(text);
          // comment node
          } else if (!this.options.ignoreDecorators && this.stringify.convertCommentKey && name.indexOf(this.stringify.convertCommentKey) === 0) {
            lastChild = this.comment(text);
          // raw text node
          } else if (!this.options.ignoreDecorators && this.stringify.convertRawKey && name.indexOf(this.stringify.convertRawKey) === 0) {
            lastChild = this.raw(text);
          // processing instruction
          } else if (!this.options.ignoreDecorators && this.stringify.convertPIKey && name.indexOf(this.stringify.convertPIKey) === 0) {
            lastChild = this.instruction(name.substr(this.stringify.convertPIKey.length), text);
          } else {
            // element node
            lastChild = this.node(name, attributes, text);
          }
        }
        if (lastChild == null) {
          throw new Error("Could not create any elements with: " + name + ". " + this.debugInfo());
        }
        return lastChild;
      }

      // Creates a child element node before the current node

      // `name` node name or an object describing the XML tree
      // `attributes` an object containing name/value pairs of attributes
      // `text` element text
      insertBefore(name, attributes, text) {
        var child, i, newChild, refChild, removed;
        // DOM level 1
        // insertBefore(newChild, refChild) inserts the child node newChild before refChild
        if (name != null ? name.type : void 0) {
          newChild = name;
          refChild = attributes;
          newChild.setParent(this);
          if (refChild) {
            // temporarily remove children starting *with* refChild
            i = children.indexOf(refChild);
            removed = children.splice(i);
            
            // add the new child
            children.push(newChild);
            
            // add back removed children after new child
            Array.prototype.push.apply(children, removed);
          } else {
            children.push(newChild);
          }
          return newChild;
        } else {
          if (this.isRoot) {
            throw new Error("Cannot insert elements at root level. " + this.debugInfo(name));
          }
          
          // temporarily remove children starting *with* this
          i = this.parent.children.indexOf(this);
          removed = this.parent.children.splice(i);
          
          // add the new child
          child = this.parent.element(name, attributes, text);
          
          // add back removed children after new child
          Array.prototype.push.apply(this.parent.children, removed);
          return child;
        }
      }

      // Creates a child element node after the current node

      // `name` node name or an object describing the XML tree
      // `attributes` an object containing name/value pairs of attributes
      // `text` element text
      insertAfter(name, attributes, text) {
        var child, i, removed;
        if (this.isRoot) {
          throw new Error("Cannot insert elements at root level. " + this.debugInfo(name));
        }
        
        // temporarily remove children starting *after* this
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i + 1);
        
        // add the new child
        child = this.parent.element(name, attributes, text);
        
        // add back removed children after new child
        Array.prototype.push.apply(this.parent.children, removed);
        return child;
      }

      // Deletes a child element node

      remove() {
        var i, ref1;
        if (this.isRoot) {
          throw new Error("Cannot remove the root element. " + this.debugInfo());
        }
        i = this.parent.children.indexOf(this);
        splice.apply(this.parent.children, [i, i - i + 1].concat(ref1 = [])), ref1;
        return this.parent;
      }

      // Creates a node

      // `name` name of the node
      // `attributes` an object containing name/value pairs of attributes
      // `text` element text
      node(name, attributes, text) {
        var child;
        if (name != null) {
          name = getValue(name);
        }
        attributes || (attributes = {});
        attributes = getValue(attributes);
        // swap argument order: text <-> attributes
        if (!isObject(attributes)) {
          [text, attributes] = [attributes, text];
        }
        child = new XMLElement(this, name, attributes);
        if (text != null) {
          child.text(text);
        }
        this.children.push(child);
        return child;
      }

      // Creates a text node

      // `value` element text
      text(value) {
        var child;
        if (isObject(value)) {
          this.element(value);
        }
        child = new XMLText(this, value);
        this.children.push(child);
        return this;
      }

      // Creates a CDATA node

      // `value` element text without CDATA delimiters
      cdata(value) {
        var child;
        child = new XMLCData(this, value);
        this.children.push(child);
        return this;
      }

      // Creates a comment node

      // `value` comment text
      comment(value) {
        var child;
        child = new XMLComment(this, value);
        this.children.push(child);
        return this;
      }

      // Creates a comment node before the current node

      // `value` comment text
      commentBefore(value) {
        var child, i, removed;
        // temporarily remove children starting *with* this
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i);
        // add the new child
        child = this.parent.comment(value);
        // add back removed children after new child
        Array.prototype.push.apply(this.parent.children, removed);
        return this;
      }

      // Creates a comment node after the current node

      // `value` comment text
      commentAfter(value) {
        var child, i, removed;
        // temporarily remove children starting *after* this
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i + 1);
        // add the new child
        child = this.parent.comment(value);
        // add back removed children after new child
        Array.prototype.push.apply(this.parent.children, removed);
        return this;
      }

      // Adds unescaped raw text

      // `value` text
      raw(value) {
        var child;
        child = new XMLRaw(this, value);
        this.children.push(child);
        return this;
      }

      // Adds a dummy node
      dummy() {
        var child;
        child = new XMLDummy(this);
        // Normally when a new node is created it is added to the child node collection.
        // However, dummy nodes are never added to the XML tree. They are created while
        // converting JS objects to XML nodes in order not to break the recursive function
        // chain. They can be thought of as invisible nodes. They can be traversed through
        // by using prev(), next(), up(), etc. functions but they do not exists in the tree.

        // @children.push child
        return child;
      }

      // Adds a processing instruction

      // `target` instruction target
      // `value` instruction value
      instruction(target, value) {
        var insTarget, insValue, instruction, j, len;
        if (target != null) {
          target = getValue(target);
        }
        if (value != null) {
          value = getValue(value);
        }
        if (Array.isArray(target)) { // expand if array
          for (j = 0, len = target.length; j < len; j++) {
            insTarget = target[j];
            this.instruction(insTarget);
          }
        } else if (isObject(target)) { // expand if object
          for (insTarget in target) {
            if (!hasProp.call(target, insTarget)) continue;
            insValue = target[insTarget];
            this.instruction(insTarget, insValue);
          }
        } else {
          if (isFunction(value)) {
            value = value.apply();
          }
          instruction = new XMLProcessingInstruction(this, target, value);
          this.children.push(instruction);
        }
        return this;
      }

      // Creates a processing instruction node before the current node

      // `target` instruction target
      // `value` instruction value
      instructionBefore(target, value) {
        var child, i, removed;
        // temporarily remove children starting *with* this
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i);
        // add the new child
        child = this.parent.instruction(target, value);
        // add back removed children after new child
        Array.prototype.push.apply(this.parent.children, removed);
        return this;
      }

      // Creates a processing instruction node after the current node

      // `target` instruction target
      // `value` instruction value
      instructionAfter(target, value) {
        var child, i, removed;
        // temporarily remove children starting *after* this
        i = this.parent.children.indexOf(this);
        removed = this.parent.children.splice(i + 1);
        // add the new child
        child = this.parent.instruction(target, value);
        // add back removed children after new child
        Array.prototype.push.apply(this.parent.children, removed);
        return this;
      }

      // Creates the xml declaration

      // `version` A version number string, e.g. 1.0
      // `encoding` Encoding declaration, e.g. UTF-8
      // `standalone` standalone document declaration: true or false
      declaration(version, encoding, standalone) {
        var doc, xmldec;
        doc = this.document();
        xmldec = new XMLDeclaration(doc, version, encoding, standalone);
        // Replace XML declaration if exists, otherwise insert at top
        if (doc.children.length === 0) {
          doc.children.unshift(xmldec);
        } else if (doc.children[0].type === NodeType.Declaration) {
          doc.children[0] = xmldec;
        } else {
          doc.children.unshift(xmldec);
        }
        return doc.root() || doc;
      }

      // Creates the document type declaration

      // `pubID` the public identifier of the external subset
      // `sysID` the system identifier of the external subset
      dtd(pubID, sysID) {
        var child, doc, doctype, i, j, k, len, len1, ref1, ref2;
        doc = this.document();
        doctype = new XMLDocType(doc, pubID, sysID);
        ref1 = doc.children;
        // Replace DTD if exists
        for (i = j = 0, len = ref1.length; j < len; i = ++j) {
          child = ref1[i];
          if (child.type === NodeType.DocType) {
            doc.children[i] = doctype;
            return doctype;
          }
        }
        ref2 = doc.children;
        // insert before root node if the root node exists
        for (i = k = 0, len1 = ref2.length; k < len1; i = ++k) {
          child = ref2[i];
          if (child.isRoot) {
            doc.children.splice(i, 0, doctype);
            return doctype;
          }
        }
        // otherwise append to end
        doc.children.push(doctype);
        return doctype;
      }

      // Gets the parent node
      up() {
        if (this.isRoot) {
          throw new Error("The root node has no parent. Use doc() if you need to get the document object.");
        }
        return this.parent;
      }

      // Gets the root node
      root() {
        var node;
        node = this;
        while (node) {
          if (node.type === NodeType.Document) {
            return node.rootObject;
          } else if (node.isRoot) {
            return node;
          } else {
            node = node.parent;
          }
        }
      }

      // Gets the node representing the XML document
      document() {
        var node;
        node = this;
        while (node) {
          if (node.type === NodeType.Document) {
            return node;
          } else {
            node = node.parent;
          }
        }
      }

      // Ends the document and converts string
      end(options) {
        return this.document().end(options);
      }

      // Gets the previous node
      prev() {
        var i;
        i = this.parent.children.indexOf(this);
        if (i < 1) {
          throw new Error("Already at the first node. " + this.debugInfo());
        }
        return this.parent.children[i - 1];
      }

      // Gets the next node
      next() {
        var i;
        i = this.parent.children.indexOf(this);
        if (i === -1 || i === this.parent.children.length - 1) {
          throw new Error("Already at the last node. " + this.debugInfo());
        }
        return this.parent.children[i + 1];
      }

      // Imports cloned root from another XML document

      // `doc` the XML document to insert nodes from
      importDocument(doc) {
        var child, clonedRoot, j, len, ref1;
        clonedRoot = doc.root().clone();
        clonedRoot.parent = this;
        clonedRoot.isRoot = false;
        this.children.push(clonedRoot);
        // set properties if imported element becomes the root node
        if (this.type === NodeType.Document) {
          clonedRoot.isRoot = true;
          clonedRoot.documentObject = this;
          this.rootObject = clonedRoot;
          // set dtd name
          if (this.children) {
            ref1 = this.children;
            for (j = 0, len = ref1.length; j < len; j++) {
              child = ref1[j];
              if (child.type === NodeType.DocType) {
                child.name = clonedRoot.name;
                break;
              }
            }
          }
        }
        return this;
      }

      
      // Returns debug string for this node
      debugInfo(name) {
        var ref1, ref2;
        name = name || this.name;
        if ((name == null) && !((ref1 = this.parent) != null ? ref1.name : void 0)) {
          return "";
        } else if (name == null) {
          return "parent: <" + this.parent.name + ">";
        } else if (!((ref2 = this.parent) != null ? ref2.name : void 0)) {
          return "node: <" + name + ">";
        } else {
          return "node: <" + name + ">, parent: <" + this.parent.name + ">";
        }
      }

      // Aliases
      ele(name, attributes, text) {
        return this.element(name, attributes, text);
      }

      nod(name, attributes, text) {
        return this.node(name, attributes, text);
      }

      txt(value) {
        return this.text(value);
      }

      dat(value) {
        return this.cdata(value);
      }

      com(value) {
        return this.comment(value);
      }

      ins(target, value) {
        return this.instruction(target, value);
      }

      doc() {
        return this.document();
      }

      dec(version, encoding, standalone) {
        return this.declaration(version, encoding, standalone);
      }

      e(name, attributes, text) {
        return this.element(name, attributes, text);
      }

      n(name, attributes, text) {
        return this.node(name, attributes, text);
      }

      t(value) {
        return this.text(value);
      }

      d(value) {
        return this.cdata(value);
      }

      c(value) {
        return this.comment(value);
      }

      r(value) {
        return this.raw(value);
      }

      i(target, value) {
        return this.instruction(target, value);
      }

      u() {
        return this.up();
      }

      // can be deprecated in a future release
      importXMLBuilder(doc) {
        return this.importDocument(doc);
      }

      // Adds or modifies an attribute.

      // `name` attribute name
      // `value` attribute value
      attribute(name, value) {
        throw new Error("attribute() applies to element nodes only.");
      }

      att(name, value) {
        return this.attribute(name, value);
      }

      a(name, value) {
        return this.attribute(name, value);
      }

      // Removes an attribute

      // `name` attribute name
      removeAttribute(name) {
        throw new Error("attribute() applies to element nodes only.");
      }

      // DOM level 1 functions to be implemented later
      replaceChild(newChild, oldChild) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      removeChild(oldChild) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      appendChild(newChild) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      hasChildNodes() {
        return this.children.length !== 0;
      }

      cloneNode(deep) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      normalize() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM level 2
      isSupported(feature, version) {
        return true;
      }

      hasAttributes() {
        return this.attribs.length !== 0;
      }

      // DOM level 3 functions to be implemented later
      compareDocumentPosition(other) {
        var ref, res;
        ref = this;
        if (ref === other) {
          return 0;
        } else if (this.document() !== other.document()) {
          res = DocumentPosition.Disconnected | DocumentPosition.ImplementationSpecific;
          if (Math.random() < 0.5) {
            res |= DocumentPosition.Preceding;
          } else {
            res |= DocumentPosition.Following;
          }
          return res;
        } else if (ref.isAncestor(other)) {
          return DocumentPosition.Contains | DocumentPosition.Preceding;
        } else if (ref.isDescendant(other)) {
          return DocumentPosition.Contains | DocumentPosition.Following;
        } else if (ref.isPreceding(other)) {
          return DocumentPosition.Preceding;
        } else {
          return DocumentPosition.Following;
        }
      }

      isSameNode(other) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      lookupPrefix(namespaceURI) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      isDefaultNamespace(namespaceURI) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      lookupNamespaceURI(prefix) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      isEqualNode(node) {
        var i, j, ref1;
        if (node.nodeType !== this.nodeType) {
          return false;
        }
        if (node.children.length !== this.children.length) {
          return false;
        }
        for (i = j = 0, ref1 = this.children.length - 1; (0 <= ref1 ? j <= ref1 : j >= ref1); i = 0 <= ref1 ? ++j : --j) {
          if (!this.children[i].isEqualNode(node.children[i])) {
            return false;
          }
        }
        return true;
      }

      getFeature(feature, version) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      setUserData(key, data, handler) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      getUserData(key) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // Returns true if other is an inclusive descendant of node,
      // and false otherwise.
      contains(other) {
        if (!other) {
          return false;
        }
        return other === this || this.isDescendant(other);
      }

      // An object A is called a descendant of an object B, if either A is 
      // a child of B or A is a child of an object C that is a descendant of B.
      isDescendant(node) {
        var child, isDescendantChild, j, len, ref1;
        ref1 = this.children;
        for (j = 0, len = ref1.length; j < len; j++) {
          child = ref1[j];
          if (node === child) {
            return true;
          }
          isDescendantChild = child.isDescendant(node);
          if (isDescendantChild) {
            return true;
          }
        }
        return false;
      }

      // An object A is called an ancestor of an object B if and only if
      // B is a descendant of A.
      isAncestor(node) {
        return node.isDescendant(this);
      }

      // An object A is preceding an object B if A and B are in the 
      // same tree and A comes before B in tree order.
      isPreceding(node) {
        var nodePos, thisPos;
        nodePos = this.treePosition(node);
        thisPos = this.treePosition(this);
        if (nodePos === -1 || thisPos === -1) {
          return false;
        } else {
          return nodePos < thisPos;
        }
      }

      // An object A is folllowing an object B if A and B are in the 
      // same tree and A comes after B in tree order.
      isFollowing(node) {
        var nodePos, thisPos;
        nodePos = this.treePosition(node);
        thisPos = this.treePosition(this);
        if (nodePos === -1 || thisPos === -1) {
          return false;
        } else {
          return nodePos > thisPos;
        }
      }

      // Returns the preorder position of the given node in the tree, or -1
      // if the node is not in the tree.
      treePosition(node) {
        var found, pos;
        pos = 0;
        found = false;
        this.foreachTreeNode(this.document(), function(childNode) {
          pos++;
          if (!found && childNode === node) {
            return found = true;
          }
        });
        if (found) {
          return pos;
        } else {
          return -1;
        }
      }

      
      // Depth-first preorder traversal through the XML tree
      foreachTreeNode(node, func) {
        var child, j, len, ref1, res;
        node || (node = this.document());
        ref1 = node.children;
        for (j = 0, len = ref1.length; j < len; j++) {
          child = ref1[j];
          if (res = func(child)) {
            return res;
          } else {
            res = this.foreachTreeNode(child, func);
            if (res) {
              return res;
            }
          }
        }
      }

    };

    // DOM level 1
    Object.defineProperty(XMLNode.prototype, 'nodeName', {
      get: function() {
        return this.name;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'nodeType', {
      get: function() {
        return this.type;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'nodeValue', {
      get: function() {
        return this.value;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'parentNode', {
      get: function() {
        return this.parent;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'childNodes', {
      get: function() {
        if (!this.childNodeList || !this.childNodeList.nodes) {
          this.childNodeList = new XMLNodeList(this.children);
        }
        return this.childNodeList;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'firstChild', {
      get: function() {
        return this.children[0] || null;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'lastChild', {
      get: function() {
        return this.children[this.children.length - 1] || null;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'previousSibling', {
      get: function() {
        var i;
        i = this.parent.children.indexOf(this);
        return this.parent.children[i - 1] || null;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'nextSibling', {
      get: function() {
        var i;
        i = this.parent.children.indexOf(this);
        return this.parent.children[i + 1] || null;
      }
    });

    Object.defineProperty(XMLNode.prototype, 'ownerDocument', {
      get: function() {
        return this.document() || null;
      }
    });

    // DOM level 3
    Object.defineProperty(XMLNode.prototype, 'textContent', {
      get: function() {
        var child, j, len, ref1, str;
        if (this.nodeType === NodeType.Element || this.nodeType === NodeType.DocumentFragment) {
          str = '';
          ref1 = this.children;
          for (j = 0, len = ref1.length; j < len; j++) {
            child = ref1[j];
            if (child.textContent) {
              str += child.textContent;
            }
          }
          return str;
        } else {
          return null;
        }
      },
      set: function(value) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    return XMLNode;

  }).call(this);

}).call(this);

},{"./DocumentPosition":12,"./NodeType":13,"./Utility":14,"./XMLCData":17,"./XMLComment":19,"./XMLDeclaration":28,"./XMLDocType":29,"./XMLDummy":32,"./XMLElement":33,"./XMLNamedNodeMap":34,"./XMLNodeList":36,"./XMLProcessingInstruction":37,"./XMLRaw":38,"./XMLText":42}],36:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Represents a list of nodes
  var XMLNodeList;

  module.exports = XMLNodeList = (function() {
    class XMLNodeList {
      // Initializes a new instance of `XMLNodeList`
      // This is just a wrapper around an ordinary
      // JS array.

      // `nodes` the array containing nodes.
      constructor(nodes) {
        this.nodes = nodes;
      }

      // Creates and returns a deep clone of `this`

      clone() {
        // this class should not be cloned since it wraps
        // around a given array. The calling function should check
        // whether the wrapped array is null and supply a new array
        // (from the clone).
        return this.nodes = null;
      }

      // DOM Level 1
      item(index) {
        return this.nodes[index] || null;
      }

    };

    // DOM level 1
    Object.defineProperty(XMLNodeList.prototype, 'length', {
      get: function() {
        return this.nodes.length || 0;
      }
    });

    return XMLNodeList;

  }).call(this);

}).call(this);

},{}],37:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLCharacterData, XMLProcessingInstruction;

  NodeType = require('./NodeType');

  XMLCharacterData = require('./XMLCharacterData');

  // Represents a processing instruction
  module.exports = XMLProcessingInstruction = class XMLProcessingInstruction extends XMLCharacterData {
    // Initializes a new instance of `XMLProcessingInstruction`

    // `parent` the parent node
    // `target` instruction target
    // `value` instruction value
    constructor(parent, target, value) {
      super(parent);
      if (target == null) {
        throw new Error("Missing instruction target. " + this.debugInfo());
      }
      this.type = NodeType.ProcessingInstruction;
      this.target = this.stringify.insTarget(target);
      this.name = this.target;
      if (value) {
        this.value = this.stringify.insValue(value);
      }
    }

    // Creates and returns a deep clone of `this`
    clone() {
      return Object.create(this);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.processingInstruction(this, this.options.writer.filterOptions(options));
    }

    isEqualNode(node) {
      if (!super.isEqualNode(node)) {
        return false;
      }
      if (node.target !== this.target) {
        return false;
      }
      return true;
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLCharacterData":18}],38:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLNode, XMLRaw;

  NodeType = require('./NodeType');

  XMLNode = require('./XMLNode');

  // Represents a  raw node
  module.exports = XMLRaw = class XMLRaw extends XMLNode {
    // Initializes a new instance of `XMLRaw`

    // `text` raw text
    constructor(parent, text) {
      super(parent);
      if (text == null) {
        throw new Error("Missing raw text. " + this.debugInfo());
      }
      this.type = NodeType.Raw;
      this.value = this.stringify.raw(text);
    }

    // Creates and returns a deep clone of `this`
    clone() {
      return Object.create(this);
    }

    // Converts the XML fragment to string

    // `options.pretty` pretty prints the result
    // `options.indent` indentation for pretty print
    // `options.offset` how many indentations to add to every line for pretty print
    // `options.newline` newline sequence for pretty print
    toString(options) {
      return this.options.writer.raw(this, this.options.writer.filterOptions(options));
    }

  };

}).call(this);

},{"./NodeType":13,"./XMLNode":35}],39:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, WriterState, XMLStreamWriter, XMLWriterBase,
    hasProp = {}.hasOwnProperty;

  NodeType = require('./NodeType');

  XMLWriterBase = require('./XMLWriterBase');

  WriterState = require('./WriterState');

  // Prints XML nodes to a stream
  module.exports = XMLStreamWriter = class XMLStreamWriter extends XMLWriterBase {
    // Initializes a new instance of `XMLStreamWriter`

    // `stream` output stream
    // `options.pretty` pretty prints the result
    // `options.indent` indentation string
    // `options.newline` newline sequence
    // `options.offset` a fixed number of indentations to add to every line
    // `options.allowEmpty` do not self close empty element tags
    // 'options.dontPrettyTextNodes' if any text is present in node, don't indent or LF
    // `options.spaceBeforeSlash` add a space before the closing slash of empty elements
    constructor(stream, options) {
      super(options);
      this.stream = stream;
    }

    endline(node, options, level) {
      if (node.isLastRootNode && options.state === WriterState.CloseTag) {
        return '';
      } else {
        return super.endline(node, options, level);
      }
    }

    document(doc, options) {
      var child, i, j, k, len1, len2, ref, ref1, results;
      ref = doc.children;
      // set a flag so that we don't insert a newline after the last root level node 
      for (i = j = 0, len1 = ref.length; j < len1; i = ++j) {
        child = ref[i];
        child.isLastRootNode = i === doc.children.length - 1;
      }
      options = this.filterOptions(options);
      ref1 = doc.children;
      results = [];
      for (k = 0, len2 = ref1.length; k < len2; k++) {
        child = ref1[k];
        results.push(this.writeChildNode(child, options, 0));
      }
      return results;
    }

    cdata(node, options, level) {
      return this.stream.write(super.cdata(node, options, level));
    }

    comment(node, options, level) {
      return this.stream.write(super.comment(node, options, level));
    }

    declaration(node, options, level) {
      return this.stream.write(super.declaration(node, options, level));
    }

    docType(node, options, level) {
      var child, j, len1, ref;
      level || (level = 0);
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      this.stream.write(this.indent(node, options, level));
      this.stream.write('<!DOCTYPE ' + node.root().name);
      // external identifier
      if (node.pubID && node.sysID) {
        this.stream.write(' PUBLIC "' + node.pubID + '" "' + node.sysID + '"');
      } else if (node.sysID) {
        this.stream.write(' SYSTEM "' + node.sysID + '"');
      }
      // internal subset
      if (node.children.length > 0) {
        this.stream.write(' [');
        this.stream.write(this.endline(node, options, level));
        options.state = WriterState.InsideTag;
        ref = node.children;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          child = ref[j];
          this.writeChildNode(child, options, level + 1);
        }
        options.state = WriterState.CloseTag;
        this.stream.write(']');
      }
      // close tag
      options.state = WriterState.CloseTag;
      this.stream.write(options.spaceBeforeSlash + '>');
      this.stream.write(this.endline(node, options, level));
      options.state = WriterState.None;
      return this.closeNode(node, options, level);
    }

    element(node, options, level) {
      var att, attLen, child, childNodeCount, firstChildNode, j, len, len1, name, prettySuppressed, r, ratt, ref, ref1, ref2, rline;
      level || (level = 0);
      // open tag
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<' + node.name;
      // attributes
      if (options.pretty && options.width > 0) {
        len = r.length;
        ref = node.attribs;
        for (name in ref) {
          if (!hasProp.call(ref, name)) continue;
          att = ref[name];
          ratt = this.attribute(att, options, level);
          attLen = ratt.length;
          if (len + attLen > options.width) {
            rline = this.indent(node, options, level + 1) + ratt;
            r += this.endline(node, options, level) + rline;
            len = rline.length;
          } else {
            rline = ' ' + ratt;
            r += rline;
            len += rline.length;
          }
        }
      } else {
        ref1 = node.attribs;
        for (name in ref1) {
          if (!hasProp.call(ref1, name)) continue;
          att = ref1[name];
          r += this.attribute(att, options, level);
        }
      }
      this.stream.write(r);
      childNodeCount = node.children.length;
      firstChildNode = childNodeCount === 0 ? null : node.children[0];
      if (childNodeCount === 0 || node.children.every(function(e) {
        return (e.type === NodeType.Text || e.type === NodeType.Raw || e.type === NodeType.CData) && e.value === '';
      })) {
        // empty element
        if (options.allowEmpty) {
          this.stream.write('>');
          options.state = WriterState.CloseTag;
          this.stream.write('</' + node.name + '>');
        } else {
          options.state = WriterState.CloseTag;
          this.stream.write(options.spaceBeforeSlash + '/>');
        }
      } else if (options.pretty && childNodeCount === 1 && (firstChildNode.type === NodeType.Text || firstChildNode.type === NodeType.Raw || firstChildNode.type === NodeType.CData) && (firstChildNode.value != null)) {
        // do not indent text-only nodes
        this.stream.write('>');
        options.state = WriterState.InsideTag;
        options.suppressPrettyCount++;
        prettySuppressed = true;
        this.writeChildNode(firstChildNode, options, level + 1);
        options.suppressPrettyCount--;
        prettySuppressed = false;
        options.state = WriterState.CloseTag;
        this.stream.write('</' + node.name + '>');
      } else {
        this.stream.write('>' + this.endline(node, options, level));
        options.state = WriterState.InsideTag;
        ref2 = node.children;
        // inner tags
        for (j = 0, len1 = ref2.length; j < len1; j++) {
          child = ref2[j];
          this.writeChildNode(child, options, level + 1);
        }
        // close tag
        options.state = WriterState.CloseTag;
        this.stream.write(this.indent(node, options, level) + '</' + node.name + '>');
      }
      this.stream.write(this.endline(node, options, level));
      options.state = WriterState.None;
      return this.closeNode(node, options, level);
    }

    processingInstruction(node, options, level) {
      return this.stream.write(super.processingInstruction(node, options, level));
    }

    raw(node, options, level) {
      return this.stream.write(super.raw(node, options, level));
    }

    text(node, options, level) {
      return this.stream.write(super.text(node, options, level));
    }

    dtdAttList(node, options, level) {
      return this.stream.write(super.dtdAttList(node, options, level));
    }

    dtdElement(node, options, level) {
      return this.stream.write(super.dtdElement(node, options, level));
    }

    dtdEntity(node, options, level) {
      return this.stream.write(super.dtdEntity(node, options, level));
    }

    dtdNotation(node, options, level) {
      return this.stream.write(super.dtdNotation(node, options, level));
    }

  };

}).call(this);

},{"./NodeType":13,"./WriterState":15,"./XMLWriterBase":43}],40:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var XMLStringWriter, XMLWriterBase;

  XMLWriterBase = require('./XMLWriterBase');

  // Prints XML nodes as plain text
  module.exports = XMLStringWriter = class XMLStringWriter extends XMLWriterBase {
    // Initializes a new instance of `XMLStringWriter`

    // `options.pretty` pretty prints the result
    // `options.indent` indentation string
    // `options.newline` newline sequence
    // `options.offset` a fixed number of indentations to add to every line
    // `options.allowEmpty` do not self close empty element tags
    // 'options.dontPrettyTextNodes' if any text is present in node, don't indent or LF
    // `options.spaceBeforeSlash` add a space before the closing slash of empty elements
    constructor(options) {
      super(options);
    }

    document(doc, options) {
      var child, i, len, r, ref;
      options = this.filterOptions(options);
      r = '';
      ref = doc.children;
      for (i = 0, len = ref.length; i < len; i++) {
        child = ref[i];
        r += this.writeChildNode(child, options, 0);
      }
      // remove trailing newline
      if (options.pretty && r.slice(-options.newline.length) === options.newline) {
        r = r.slice(0, -options.newline.length);
      }
      return r;
    }

  };

}).call(this);

},{"./XMLWriterBase":43}],41:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  // Converts values to strings
  var XMLStringifier,
    hasProp = {}.hasOwnProperty;

  module.exports = XMLStringifier = (function() {
    class XMLStringifier {
      // Initializes a new instance of `XMLStringifier`

      // `options.version` The version number string of the XML spec to validate against, e.g. 1.0
      // `options.noDoubleEncoding` whether existing html entities are encoded: true or false
      // `options.stringify` a set of functions to use for converting values to strings
      // `options.noValidation` whether values will be validated and escaped or returned as is
      // `options.invalidCharReplacement` a character to replace invalid characters and disable character validation
      constructor(options) {
        var key, ref, value;
        // Checks whether the given string contains legal characters
        // Fails with an exception on error

        // `str` the string to check
        this.assertLegalChar = this.assertLegalChar.bind(this);
        // Checks whether the given string contains legal characters for a name
        // Fails with an exception on error

        // `str` the string to check
        this.assertLegalName = this.assertLegalName.bind(this);
        options || (options = {});
        this.options = options;
        if (!this.options.version) {
          this.options.version = '1.0';
        }
        ref = options.stringify || {};
        for (key in ref) {
          if (!hasProp.call(ref, key)) continue;
          value = ref[key];
          this[key] = value;
        }
      }

      // Defaults
      name(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalName('' + val || '');
      }

      text(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar(this.textEscape('' + val || ''));
      }

      cdata(val) {
        if (this.options.noValidation) {
          return val;
        }
        val = '' + val || '';
        val = val.replace(']]>', ']]]]><![CDATA[>');
        return this.assertLegalChar(val);
      }

      comment(val) {
        if (this.options.noValidation) {
          return val;
        }
        val = '' + val || '';
        if (val.match(/--/)) {
          throw new Error("Comment text cannot contain double-hypen: " + val);
        }
        return this.assertLegalChar(val);
      }

      raw(val) {
        if (this.options.noValidation) {
          return val;
        }
        return '' + val || '';
      }

      attValue(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar(this.attEscape(val = '' + val || ''));
      }

      insTarget(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      insValue(val) {
        if (this.options.noValidation) {
          return val;
        }
        val = '' + val || '';
        if (val.match(/\?>/)) {
          throw new Error("Invalid processing instruction value: " + val);
        }
        return this.assertLegalChar(val);
      }

      xmlVersion(val) {
        if (this.options.noValidation) {
          return val;
        }
        val = '' + val || '';
        if (!val.match(/1\.[0-9]+/)) {
          throw new Error("Invalid version number: " + val);
        }
        return val;
      }

      xmlEncoding(val) {
        if (this.options.noValidation) {
          return val;
        }
        val = '' + val || '';
        if (!val.match(/^[A-Za-z](?:[A-Za-z0-9._-])*$/)) {
          throw new Error("Invalid encoding: " + val);
        }
        return this.assertLegalChar(val);
      }

      xmlStandalone(val) {
        if (this.options.noValidation) {
          return val;
        }
        if (val) {
          return "yes";
        } else {
          return "no";
        }
      }

      dtdPubID(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdSysID(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdElementValue(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdAttType(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdAttDefault(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdEntityValue(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      dtdNData(val) {
        if (this.options.noValidation) {
          return val;
        }
        return this.assertLegalChar('' + val || '');
      }

      assertLegalChar(str) {
        var regex, res;
        if (this.options.noValidation) {
          return str;
        }
        if (this.options.version === '1.0') {
          // Valid characters from https://www.w3.org/TR/xml/#charsets
          // any Unicode character, excluding the surrogate blocks, FFFE, and FFFF.
          // #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
          // This ES5 compatible Regexp has been generated using the "regenerate" NPM module:
          //   let xml_10_InvalidChars = regenerate()
          //     .addRange(0x0000, 0x0008)
          //     .add(0x000B, 0x000C)
          //     .addRange(0x000E, 0x001F)
          //     .addRange(0xD800, 0xDFFF)
          //     .addRange(0xFFFE, 0xFFFF)
          regex = /[\0-\x08\x0B\f\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;
          if (this.options.invalidCharReplacement !== void 0) {
            str = str.replace(regex, this.options.invalidCharReplacement);
          } else if (res = str.match(regex)) {
            throw new Error(`Invalid character in string: ${str} at index ${res.index}`);
          }
        } else if (this.options.version === '1.1') {
          // Valid characters from https://www.w3.org/TR/xml11/#charsets
          // any Unicode character, excluding the surrogate blocks, FFFE, and FFFF.
          // [#x1-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
          // This ES5 compatible Regexp has been generated using the "regenerate" NPM module:
          //   let xml_11_InvalidChars = regenerate()
          //     .add(0x0000)
          //     .addRange(0xD800, 0xDFFF)
          //     .addRange(0xFFFE, 0xFFFF)
          regex = /[\0\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;
          if (this.options.invalidCharReplacement !== void 0) {
            str = str.replace(regex, this.options.invalidCharReplacement);
          } else if (res = str.match(regex)) {
            throw new Error(`Invalid character in string: ${str} at index ${res.index}`);
          }
        }
        return str;
      }

      assertLegalName(str) {
        var regex;
        if (this.options.noValidation) {
          return str;
        }
        str = this.assertLegalChar(str);
        regex = /^([:A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])([\x2D\.0-:A-Z_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*$/;
        if (!str.match(regex)) {
          throw new Error(`Invalid character in name: ${str}`);
        }
        return str;
      }

      // Escapes special characters in text

      // See http://www.w3.org/TR/2000/WD-xml-c14n-20000119.html#charescaping

      // `str` the string to escape
      textEscape(str) {
        var ampregex;
        if (this.options.noValidation) {
          return str;
        }
        ampregex = this.options.noDoubleEncoding ? /(?!&(lt|gt|amp|apos|quot);)&/g : /&/g;
        return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
      }

      // Escapes special characters in attribute values

      // See http://www.w3.org/TR/2000/WD-xml-c14n-20000119.html#charescaping

      // `str` the string to escape
      attEscape(str) {
        var ampregex;
        if (this.options.noValidation) {
          return str;
        }
        ampregex = this.options.noDoubleEncoding ? /(?!&(lt|gt|amp|apos|quot);)&/g : /&/g;
        return str.replace(ampregex, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');
      }

    };

    // strings to match while converting from JS objects
    XMLStringifier.prototype.convertAttKey = '@';

    XMLStringifier.prototype.convertPIKey = '?';

    XMLStringifier.prototype.convertTextKey = '#text';

    XMLStringifier.prototype.convertCDataKey = '#cdata';

    XMLStringifier.prototype.convertCommentKey = '#comment';

    XMLStringifier.prototype.convertRawKey = '#raw';

    return XMLStringifier;

  }).call(this);

}).call(this);

},{}],42:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, XMLCharacterData, XMLText;

  NodeType = require('./NodeType');

  XMLCharacterData = require('./XMLCharacterData');

  // Represents a text node
  module.exports = XMLText = (function() {
    class XMLText extends XMLCharacterData {
      // Initializes a new instance of `XMLText`

      // `text` element text
      constructor(parent, text) {
        super(parent);
        if (text == null) {
          throw new Error("Missing element text. " + this.debugInfo());
        }
        this.name = "#text";
        this.type = NodeType.Text;
        this.value = this.stringify.text(text);
      }

      // Creates and returns a deep clone of `this`
      clone() {
        return Object.create(this);
      }

      // Converts the XML fragment to string

      // `options.pretty` pretty prints the result
      // `options.indent` indentation for pretty print
      // `options.offset` how many indentations to add to every line for pretty print
      // `options.newline` newline sequence for pretty print
      toString(options) {
        return this.options.writer.text(this, this.options.writer.filterOptions(options));
      }

      // DOM level 1 functions to be implemented later
      splitText(offset) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

      // DOM level 3 functions to be implemented later
      replaceWholeText(content) {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }

    };

    // DOM level 3
    Object.defineProperty(XMLText.prototype, 'isElementContentWhitespace', {
      get: function() {
        throw new Error("This DOM method is not implemented." + this.debugInfo());
      }
    });

    Object.defineProperty(XMLText.prototype, 'wholeText', {
      get: function() {
        var next, prev, str;
        str = '';
        prev = this.previousSibling;
        while (prev) {
          str = prev.data + str;
          prev = prev.previousSibling;
        }
        str += this.data;
        next = this.nextSibling;
        while (next) {
          str = str + next.data;
          next = next.nextSibling;
        }
        return str;
      }
    });

    return XMLText;

  }).call(this);

}).call(this);

},{"./NodeType":13,"./XMLCharacterData":18}],43:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, WriterState, XMLCData, XMLComment, XMLDTDAttList, XMLDTDElement, XMLDTDEntity, XMLDTDNotation, XMLDeclaration, XMLDocType, XMLDummy, XMLElement, XMLProcessingInstruction, XMLRaw, XMLText, XMLWriterBase, assign,
    hasProp = {}.hasOwnProperty;

  ({assign} = require('./Utility'));

  NodeType = require('./NodeType');

  XMLDeclaration = require('./XMLDeclaration');

  XMLDocType = require('./XMLDocType');

  XMLCData = require('./XMLCData');

  XMLComment = require('./XMLComment');

  XMLElement = require('./XMLElement');

  XMLRaw = require('./XMLRaw');

  XMLText = require('./XMLText');

  XMLProcessingInstruction = require('./XMLProcessingInstruction');

  XMLDummy = require('./XMLDummy');

  XMLDTDAttList = require('./XMLDTDAttList');

  XMLDTDElement = require('./XMLDTDElement');

  XMLDTDEntity = require('./XMLDTDEntity');

  XMLDTDNotation = require('./XMLDTDNotation');

  WriterState = require('./WriterState');

  // Base class for XML writers
  module.exports = XMLWriterBase = class XMLWriterBase {
    // Initializes a new instance of `XMLWriterBase`

    // `options.pretty` pretty prints the result
    // `options.indent` indentation string
    // `options.newline` newline sequence
    // `options.offset` a fixed number of indentations to add to every line
    // `options.width` maximum column width
    // `options.allowEmpty` do not self close empty element tags
    // 'options.dontPrettyTextNodes' if any text is present in node, don't indent or LF
    // `options.spaceBeforeSlash` add a space before the closing slash of empty elements
    constructor(options) {
      var key, ref, value;
      options || (options = {});
      this.options = options;
      ref = options.writer || {};
      for (key in ref) {
        if (!hasProp.call(ref, key)) continue;
        value = ref[key];
        this["_" + key] = this[key];
        this[key] = value;
      }
    }

    // Filters writer options and provides defaults

    // `options` writer options
    filterOptions(options) {
      var filteredOptions, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7;
      options || (options = {});
      options = assign({}, this.options, options);
      filteredOptions = {
        writer: this
      };
      filteredOptions.pretty = options.pretty || false;
      filteredOptions.allowEmpty = options.allowEmpty || false;
      filteredOptions.indent = (ref = options.indent) != null ? ref : '  ';
      filteredOptions.newline = (ref1 = options.newline) != null ? ref1 : '\n';
      filteredOptions.offset = (ref2 = options.offset) != null ? ref2 : 0;
      filteredOptions.width = (ref3 = options.width) != null ? ref3 : 0;
      filteredOptions.dontPrettyTextNodes = (ref4 = (ref5 = options.dontPrettyTextNodes) != null ? ref5 : options.dontprettytextnodes) != null ? ref4 : 0;
      filteredOptions.spaceBeforeSlash = (ref6 = (ref7 = options.spaceBeforeSlash) != null ? ref7 : options.spacebeforeslash) != null ? ref6 : '';
      if (filteredOptions.spaceBeforeSlash === true) {
        filteredOptions.spaceBeforeSlash = ' ';
      }
      filteredOptions.suppressPrettyCount = 0;
      filteredOptions.user = {};
      filteredOptions.state = WriterState.None;
      return filteredOptions;
    }

    // Returns the indentation string for the current level

    // `node` current node
    // `options` writer options
    // `level` current indentation level
    indent(node, options, level) {
      var indentLevel;
      if (!options.pretty || options.suppressPrettyCount) {
        return '';
      } else if (options.pretty) {
        indentLevel = (level || 0) + options.offset + 1;
        if (indentLevel > 0) {
          return new Array(indentLevel).join(options.indent);
        }
      }
      return '';
    }

    // Returns the newline string

    // `node` current node
    // `options` writer options
    // `level` current indentation level
    endline(node, options, level) {
      if (!options.pretty || options.suppressPrettyCount) {
        return '';
      } else {
        return options.newline;
      }
    }

    attribute(att, options, level) {
      var r;
      this.openAttribute(att, options, level);
      if (options.pretty && options.width > 0) {
        r = att.name + '="' + att.value + '"';
      } else {
        r = ' ' + att.name + '="' + att.value + '"';
      }
      this.closeAttribute(att, options, level);
      return r;
    }

    cdata(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<![CDATA[';
      options.state = WriterState.InsideTag;
      r += node.value;
      options.state = WriterState.CloseTag;
      r += ']]>' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    comment(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<!-- ';
      options.state = WriterState.InsideTag;
      r += node.value;
      options.state = WriterState.CloseTag;
      r += ' -->' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    declaration(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<?xml';
      options.state = WriterState.InsideTag;
      r += ' version="' + node.version + '"';
      if (node.encoding != null) {
        r += ' encoding="' + node.encoding + '"';
      }
      if (node.standalone != null) {
        r += ' standalone="' + node.standalone + '"';
      }
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '?>';
      r += this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    docType(node, options, level) {
      var child, i, len1, r, ref;
      level || (level = 0);
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level);
      r += '<!DOCTYPE ' + node.root().name;
      // external identifier
      if (node.pubID && node.sysID) {
        r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
      } else if (node.sysID) {
        r += ' SYSTEM "' + node.sysID + '"';
      }
      // internal subset
      if (node.children.length > 0) {
        r += ' [';
        r += this.endline(node, options, level);
        options.state = WriterState.InsideTag;
        ref = node.children;
        for (i = 0, len1 = ref.length; i < len1; i++) {
          child = ref[i];
          r += this.writeChildNode(child, options, level + 1);
        }
        options.state = WriterState.CloseTag;
        r += ']';
      }
      // close tag
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '>';
      r += this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    element(node, options, level) {
      var att, attLen, child, childNodeCount, firstChildNode, i, j, len, len1, len2, name, prettySuppressed, r, ratt, ref, ref1, ref2, ref3, rline;
      level || (level = 0);
      prettySuppressed = false;
      // open tag
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<' + node.name;
      // attributes
      if (options.pretty && options.width > 0) {
        len = r.length;
        ref = node.attribs;
        for (name in ref) {
          if (!hasProp.call(ref, name)) continue;
          att = ref[name];
          ratt = this.attribute(att, options, level);
          attLen = ratt.length;
          if (len + attLen > options.width) {
            rline = this.indent(node, options, level + 1) + ratt;
            r += this.endline(node, options, level) + rline;
            len = rline.length;
          } else {
            rline = ' ' + ratt;
            r += rline;
            len += rline.length;
          }
        }
      } else {
        ref1 = node.attribs;
        for (name in ref1) {
          if (!hasProp.call(ref1, name)) continue;
          att = ref1[name];
          r += this.attribute(att, options, level);
        }
      }
      childNodeCount = node.children.length;
      firstChildNode = childNodeCount === 0 ? null : node.children[0];
      if (childNodeCount === 0 || node.children.every(function(e) {
        return (e.type === NodeType.Text || e.type === NodeType.Raw || e.type === NodeType.CData) && e.value === '';
      })) {
        // empty element
        if (options.allowEmpty) {
          r += '>';
          options.state = WriterState.CloseTag;
          r += '</' + node.name + '>' + this.endline(node, options, level);
        } else {
          options.state = WriterState.CloseTag;
          r += options.spaceBeforeSlash + '/>' + this.endline(node, options, level);
        }
      } else if (options.pretty && childNodeCount === 1 && (firstChildNode.type === NodeType.Text || firstChildNode.type === NodeType.Raw || firstChildNode.type === NodeType.CData) && (firstChildNode.value != null)) {
        // do not indent text-only nodes
        r += '>';
        options.state = WriterState.InsideTag;
        options.suppressPrettyCount++;
        prettySuppressed = true;
        r += this.writeChildNode(firstChildNode, options, level + 1);
        options.suppressPrettyCount--;
        prettySuppressed = false;
        options.state = WriterState.CloseTag;
        r += '</' + node.name + '>' + this.endline(node, options, level);
      } else {
        // if ANY are a text node, then suppress pretty now
        if (options.dontPrettyTextNodes) {
          ref2 = node.children;
          for (i = 0, len1 = ref2.length; i < len1; i++) {
            child = ref2[i];
            if ((child.type === NodeType.Text || child.type === NodeType.Raw || child.type === NodeType.CData) && (child.value != null)) {
              options.suppressPrettyCount++;
              prettySuppressed = true;
              break;
            }
          }
        }
        // close the opening tag, after dealing with newline
        r += '>' + this.endline(node, options, level);
        options.state = WriterState.InsideTag;
        ref3 = node.children;
        // inner tags
        for (j = 0, len2 = ref3.length; j < len2; j++) {
          child = ref3[j];
          r += this.writeChildNode(child, options, level + 1);
        }
        // close tag
        options.state = WriterState.CloseTag;
        r += this.indent(node, options, level) + '</' + node.name + '>';
        if (prettySuppressed) {
          options.suppressPrettyCount--;
        }
        r += this.endline(node, options, level);
        options.state = WriterState.None;
      }
      this.closeNode(node, options, level);
      return r;
    }

    writeChildNode(node, options, level) {
      switch (node.type) {
        case NodeType.CData:
          return this.cdata(node, options, level);
        case NodeType.Comment:
          return this.comment(node, options, level);
        case NodeType.Element:
          return this.element(node, options, level);
        case NodeType.Raw:
          return this.raw(node, options, level);
        case NodeType.Text:
          return this.text(node, options, level);
        case NodeType.ProcessingInstruction:
          return this.processingInstruction(node, options, level);
        case NodeType.Dummy:
          return '';
        case NodeType.Declaration:
          return this.declaration(node, options, level);
        case NodeType.DocType:
          return this.docType(node, options, level);
        case NodeType.AttributeDeclaration:
          return this.dtdAttList(node, options, level);
        case NodeType.ElementDeclaration:
          return this.dtdElement(node, options, level);
        case NodeType.EntityDeclaration:
          return this.dtdEntity(node, options, level);
        case NodeType.NotationDeclaration:
          return this.dtdNotation(node, options, level);
        default:
          throw new Error("Unknown XML node type: " + node.constructor.name);
      }
    }

    processingInstruction(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<?';
      options.state = WriterState.InsideTag;
      r += node.target;
      if (node.value) {
        r += ' ' + node.value;
      }
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '?>';
      r += this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    raw(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level);
      options.state = WriterState.InsideTag;
      r += node.value;
      options.state = WriterState.CloseTag;
      r += this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    text(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level);
      options.state = WriterState.InsideTag;
      r += node.value;
      options.state = WriterState.CloseTag;
      r += this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    dtdAttList(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<!ATTLIST';
      options.state = WriterState.InsideTag;
      r += ' ' + node.elementName + ' ' + node.attributeName + ' ' + node.attributeType;
      if (node.defaultValueType !== '#DEFAULT') {
        r += ' ' + node.defaultValueType;
      }
      if (node.defaultValue) {
        r += ' "' + node.defaultValue + '"';
      }
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '>' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    dtdElement(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<!ELEMENT';
      options.state = WriterState.InsideTag;
      r += ' ' + node.name + ' ' + node.value;
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '>' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    dtdEntity(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<!ENTITY';
      options.state = WriterState.InsideTag;
      if (node.pe) {
        r += ' %';
      }
      r += ' ' + node.name;
      if (node.value) {
        r += ' "' + node.value + '"';
      } else {
        if (node.pubID && node.sysID) {
          r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
        } else if (node.sysID) {
          r += ' SYSTEM "' + node.sysID + '"';
        }
        if (node.nData) {
          r += ' NDATA ' + node.nData;
        }
      }
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '>' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    dtdNotation(node, options, level) {
      var r;
      this.openNode(node, options, level);
      options.state = WriterState.OpenTag;
      r = this.indent(node, options, level) + '<!NOTATION';
      options.state = WriterState.InsideTag;
      r += ' ' + node.name;
      if (node.pubID && node.sysID) {
        r += ' PUBLIC "' + node.pubID + '" "' + node.sysID + '"';
      } else if (node.pubID) {
        r += ' PUBLIC "' + node.pubID + '"';
      } else if (node.sysID) {
        r += ' SYSTEM "' + node.sysID + '"';
      }
      options.state = WriterState.CloseTag;
      r += options.spaceBeforeSlash + '>' + this.endline(node, options, level);
      options.state = WriterState.None;
      this.closeNode(node, options, level);
      return r;
    }

    openNode(node, options, level) {}

    closeNode(node, options, level) {}

    openAttribute(att, options, level) {}

    closeAttribute(att, options, level) {}

  };

}).call(this);

},{"./NodeType":13,"./Utility":14,"./WriterState":15,"./XMLCData":17,"./XMLComment":19,"./XMLDTDAttList":24,"./XMLDTDElement":25,"./XMLDTDEntity":26,"./XMLDTDNotation":27,"./XMLDeclaration":28,"./XMLDocType":29,"./XMLDummy":32,"./XMLElement":33,"./XMLProcessingInstruction":37,"./XMLRaw":38,"./XMLText":42}],44:[function(require,module,exports){
// Generated by CoffeeScript 2.4.1
(function() {
  var NodeType, WriterState, XMLDOMImplementation, XMLDocument, XMLDocumentCB, XMLStreamWriter, XMLStringWriter, assign, isFunction;

  ({assign, isFunction} = require('./Utility'));

  XMLDOMImplementation = require('./XMLDOMImplementation');

  XMLDocument = require('./XMLDocument');

  XMLDocumentCB = require('./XMLDocumentCB');

  XMLStringWriter = require('./XMLStringWriter');

  XMLStreamWriter = require('./XMLStreamWriter');

  NodeType = require('./NodeType');

  WriterState = require('./WriterState');

  // Creates a new document and returns the root node for
  // chain-building the document tree

  // `name` name of the root element

  // `xmldec.version` A version number string, e.g. 1.0
  // `xmldec.encoding` Encoding declaration, e.g. UTF-8
  // `xmldec.standalone` standalone document declaration: true or false

  // `doctype.pubID` public identifier of the external subset
  // `doctype.sysID` system identifier of the external subset

  // `options.headless` whether XML declaration and doctype will be included:
  //     true or false
  // `options.keepNullNodes` whether nodes with null values will be kept
  //     or ignored: true or false
  // `options.keepNullAttributes` whether attributes with null values will be
  //     kept or ignored: true or false
  // `options.ignoreDecorators` whether decorator strings will be ignored when
  //     converting JS objects: true or false
  // `options.separateArrayItems` whether array items are created as separate
  //     nodes when passed as an object value: true or false
  // `options.noDoubleEncoding` whether existing html entities are encoded:
  //     true or false
  // `options.stringify` a set of functions to use for converting values to
  //     strings
  // `options.writer` the default XML writer to use for converting nodes to
  //     string. If the default writer is not set, the built-in XMLStringWriter
  //     will be used instead.
  module.exports.create = function(name, xmldec, doctype, options) {
    var doc, root;
    if (name == null) {
      throw new Error("Root element needs a name.");
    }
    options = assign({}, xmldec, doctype, options);
    // create the document node
    doc = new XMLDocument(options);
    // add the root node
    root = doc.element(name);
    // prolog
    if (!options.headless) {
      doc.declaration(options);
      if ((options.pubID != null) || (options.sysID != null)) {
        doc.dtd(options);
      }
    }
    return root;
  };

  // Creates a new document and returns the document node for
  // chain-building the document tree

  // `options.keepNullNodes` whether nodes with null values will be kept
  //     or ignored: true or false
  // `options.keepNullAttributes` whether attributes with null values will be
  //     kept or ignored: true or false
  // `options.ignoreDecorators` whether decorator strings will be ignored when
  //     converting JS objects: true or false
  // `options.separateArrayItems` whether array items are created as separate
  //     nodes when passed as an object value: true or false
  // `options.noDoubleEncoding` whether existing html entities are encoded:
  //     true or false
  // `options.stringify` a set of functions to use for converting values to
  //     strings
  // `options.writer` the default XML writer to use for converting nodes to
  //     string. If the default writer is not set, the built-in XMLStringWriter
  //     will be used instead.

  // `onData` the function to be called when a new chunk of XML is output. The
  //          string containing the XML chunk is passed to `onData` as its single
  //          argument.
  // `onEnd`  the function to be called when the XML document is completed with
  //          `end`. `onEnd` does not receive any arguments.
  module.exports.begin = function(options, onData, onEnd) {
    if (isFunction(options)) {
      [onData, onEnd] = [options, onData];
      options = {};
    }
    if (onData) {
      return new XMLDocumentCB(options, onData, onEnd);
    } else {
      return new XMLDocument(options);
    }
  };

  module.exports.stringWriter = function(options) {
    return new XMLStringWriter(options);
  };

  module.exports.streamWriter = function(stream, options) {
    return new XMLStreamWriter(stream, options);
  };

  module.exports.implementation = new XMLDOMImplementation();

  module.exports.nodeType = NodeType;

  module.exports.writerState = WriterState;

}).call(this);

},{"./NodeType":13,"./Utility":14,"./WriterState":15,"./XMLDOMImplementation":22,"./XMLDocument":30,"./XMLDocumentCB":31,"./XMLStreamWriter":39,"./XMLStringWriter":40}]},{},[1])(1)
});
