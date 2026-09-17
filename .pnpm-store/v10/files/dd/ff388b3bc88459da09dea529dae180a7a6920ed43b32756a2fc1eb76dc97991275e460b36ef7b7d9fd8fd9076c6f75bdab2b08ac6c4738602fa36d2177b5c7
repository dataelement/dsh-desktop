const Decrypt = require('../Decrypt');
const PullStream = require('../PullStream');
const Stream = require('stream');
const zlib = require('zlib');
const parseExtraField = require('../parseExtraField');
const parseDateTime = require('../parseDateTime');
const parseBuffer = require('../parseBuffer');

module.exports = function unzip(source, offset, _password, directoryVars, length) {
  const file = PullStream(),
    entry = Stream.PassThrough();

  const req = source.stream(offset, length);
  req.pipe(file).on('error', function(e) {
    entry.emit('error', e);
  });

  entry.vars = file.pull(30)
    .then(function(data) {
      let vars = parseBuffer.parse(data, [
        ['signature', 4],
        ['versionsNeededToExtract', 2],
        ['flags', 2],
        ['compressionMethod', 2],
        ['lastModifiedTime', 2],
        ['lastModifiedDate', 2],
        ['crc32', 4],
        ['compressedSize', 4],
        ['uncompressedSize', 4],
        ['fileNameLength', 2],
        ['extraFieldLength', 2],
      ]);

      vars.lastModifiedDateTime = parseDateTime(vars.lastModifiedDate, vars.lastModifiedTime);

      return file.pull(vars.fileNameLength)
        .then(function(fileName) {
          vars.fileName = fileName.toString('utf8');
          return file.pull(vars.extraFieldLength);
        })
        .then(function(extraField) {
          let checkEncryption;
          vars.extra = parseExtraField(extraField, vars);
          // Ignore logal file header vars if the directory vars are available
          if (directoryVars && directoryVars.compressedSize) vars = directoryVars;

          if (vars.flags & 0x01) checkEncryption = file.pull(12)
            .then(function(header) {
              if (!_password)
                throw new Error('MISSING_PASSWORD');

              const decrypt = Decrypt();

              String(_password).split('').forEach(function(d) {
                decrypt.update(d);
              });

              for (let i=0; i < header.length; i++)
                header[i] = decrypt.decryptByte(header[i]);

              vars.decrypt = decrypt;
              vars.compressedSize -= 12;

              const check = (vars.flags & 0x8) ? (vars.lastModifiedTime >> 8) & 0xff : (vars.crc32 >> 24) & 0xff;
              if (header[11] !== check)
                throw new Error('BAD_PASSWORD');

              return vars;
            });

          return Promise.resolve(checkEncryption)
            .then(function() {
              entry.emit('vars', vars);
              return vars;
            });
        });
    });

  entry.vars.then(function(vars) {
    const fileSizeKnown = !(vars.flags & 0x08) || vars.compressedSize > 0;
    let eof;

    const inflater = vars.compressionMethod ? zlib.createInflateRaw() : Stream.PassThrough();

    if (fileSizeKnown) {
      entry.size = vars.uncompressedSize;
      eof = vars.compressedSize;
    } else {
      eof = Buffer.alloc(4);
      eof.writeUInt32LE(0x08074b50, 0);
    }

    let stream = file.stream(eof);

    if (vars.decrypt)
      stream = stream.pipe(vars.decrypt.stream());

    stream
      .pipe(inflater)
      .on('error', function(err) { entry.emit('error', err);})
      .pipe(entry)
      .on('finish', function() {
        if(req.destroy)
          req.destroy();
        else if (req.abort)
          req.abort();
        else if (req.close)
          req.close();
        else if (req.push)
          req.push();
        else
          console.log('warning - unable to close stream');
      });
  })
    .catch(function(e) {
      entry.emit('error', e);
    });

  return entry;
};
