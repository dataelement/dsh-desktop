const Stream = require('stream');
const Parse = require('./parse');
const duplexer2 = require('duplexer2');
const BufferStream = require('./BufferStream');

function parseOne(match, opts) {
  const inStream = Stream.PassThrough({objectMode:true});
  const outStream = Stream.PassThrough();
  const transform = Stream.Transform({objectMode:true});
  const re = match instanceof RegExp ? match : (match && new RegExp(match));
  let found;

  transform._transform = function(entry, e, cb) {
    if (found || (re && !re.exec(entry.path))) {
      entry.autodrain();
      return cb();
    } else {
      found = true;
      out.emit('entry', entry);
      entry.on('error', function(e) {
        outStream.emit('error', e);
      });
      entry.pipe(outStream)
        .on('error', function(err) {
          cb(err);
        })
        .on('finish', function(d) {
          cb(null, d);
        });
    }
  };

  inStream.pipe(Parse(opts))
    .on('error', function(err) {
      outStream.emit('error', err);
    })
    .pipe(transform)
    .on('error', Object) // Silence error as its already addressed in transform
    .on('finish', function() {
      if (!found)
        outStream.emit('error', new Error('PATTERN_NOT_FOUND'));
      else
        outStream.end();
    });

  const out = duplexer2(inStream, outStream);
  out.buffer = function() {
    return BufferStream(outStream);
  };

  return out;
}

module.exports = parseOne;
