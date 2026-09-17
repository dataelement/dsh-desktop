const PullStream = require('../PullStream');
const unzip = require('./unzip');
const BufferStream = require('../BufferStream');
const parseExtraField = require('../parseExtraField');
const path = require('path');
const fs = require('fs-extra');
const parseDateTime = require('../parseDateTime');
const parseBuffer = require('../parseBuffer');
const Bluebird = require('bluebird');

const signature = Buffer.alloc(4);
signature.writeUInt32LE(0x06054b50, 0);

function getCrxHeader(source) {
  const sourceStream = source.stream(0).pipe(PullStream());

  return sourceStream.pull(4).then(function(data) {
    const signature = data.readUInt32LE(0);
    if (signature === 0x34327243) {
      let crxHeader;
      return sourceStream.pull(12).then(function(data) {
        crxHeader = parseBuffer.parse(data, [
          ['version', 4],
          ['pubKeyLength', 4],
          ['signatureLength', 4],
        ]);
      }).then(function() {
        return sourceStream.pull(crxHeader.pubKeyLength +crxHeader.signatureLength);
      }).then(function(data) {
        crxHeader.publicKey = data.slice(0, crxHeader.pubKeyLength);
        crxHeader.signature = data.slice(crxHeader.pubKeyLength);
        crxHeader.size = 16 + crxHeader.pubKeyLength +crxHeader.signatureLength;
        return crxHeader;
      });
    }
  });
}

// Zip64 File Format Notes: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
function getZip64CentralDirectory(source, zip64CDL) {
  const d64loc = parseBuffer.parse(zip64CDL, [
    ['signature', 4],
    ['diskNumber', 4],
    ['offsetToStartOfCentralDirectory', 8],
    ['numberOfDisks', 4],
  ]);

  if (d64loc.signature != 0x07064b50) {
    throw new Error('invalid zip64 end of central dir locator signature (0x07064b50): 0x' + d64loc.signature.toString(16));
  }

  const dir64 = PullStream();
  source.stream(d64loc.offsetToStartOfCentralDirectory).pipe(dir64);

  return dir64.pull(56);
}

// Zip64 File Format Notes: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
function parseZip64DirRecord (dir64record) {
  const vars = parseBuffer.parse(dir64record, [
    ['signature', 4],
    ['sizeOfCentralDirectory', 8],
    ['version', 2],
    ['versionsNeededToExtract', 2],
    ['diskNumber', 4],
    ['diskStart', 4],
    ['numberOfRecordsOnDisk', 8],
    ['numberOfRecords', 8],
    ['sizeOfCentralDirectory', 8],
    ['offsetToStartOfCentralDirectory', 8],
  ]);

  if (vars.signature != 0x06064b50) {
    throw new Error('invalid zip64 end of central dir locator signature (0x06064b50): 0x0' + vars.signature.toString(16));
  }

  return vars;
}

module.exports = function centralDirectory(source, options) {
  const endDir = PullStream();
  const records = PullStream();
  const tailSize = (options && options.tailSize) || 80;
  let sourceSize,
    crxHeader,
    startOffset,
    vars;

  if (options && options.crx)
    crxHeader = getCrxHeader(source);

  return source.size()
    .then(function(size) {
      sourceSize = size;

      source.stream(Math.max(0, size-tailSize))
        .on('error', function (error) { endDir.emit('error', error); })
        .pipe(endDir);

      return endDir.pull(signature);
    })
    .then(function() {
      return Bluebird.props({directory: endDir.pull(22), crxHeader: crxHeader});
    })
    .then(function(d) {
      const data = d.directory;
      startOffset = d.crxHeader && d.crxHeader.size || 0;

      vars = parseBuffer.parse(data, [
        ['signature', 4],
        ['diskNumber', 2],
        ['diskStart', 2],
        ['numberOfRecordsOnDisk', 2],
        ['numberOfRecords', 2],
        ['sizeOfCentralDirectory', 4],
        ['offsetToStartOfCentralDirectory', 4],
        ['commentLength', 2],
      ]);

      // Is this zip file using zip64 format? Use same check as Go:
      // https://github.com/golang/go/blob/master/src/archive/zip/reader.go#L503
      // For zip64 files, need to find zip64 central directory locator header to extract
      // relative offset for zip64 central directory record.
      if (vars.diskNumber == 0xffff || vars.numberOfRecords == 0xffff ||
        vars.offsetToStartOfCentralDirectory == 0xffffffff) {

        // Offset to zip64 CDL is 20 bytes before normal CDR
        const zip64CDLSize = 20;
        const zip64CDLOffset = sourceSize - (tailSize - endDir.match + zip64CDLSize);
        const zip64CDLStream = PullStream();

        source.stream(zip64CDLOffset).pipe(zip64CDLStream);

        return zip64CDLStream.pull(zip64CDLSize)
          .then(function (d) { return getZip64CentralDirectory(source, d); })
          .then(function (dir64record) {
            vars = parseZip64DirRecord(dir64record);
          });
      } else {
        vars.offsetToStartOfCentralDirectory += startOffset;
      }
    })
    .then(function() {
      if (vars.commentLength) return endDir.pull(vars.commentLength).then(function(comment) {
        vars.comment = comment.toString('utf8');
      });
    })
    .then(function() {
      source.stream(vars.offsetToStartOfCentralDirectory).pipe(records);

      vars.extract = function(opts) {
        if (!opts || !opts.path) throw new Error('PATH_MISSING');
        // make sure path is normalized before using it
        opts.path = path.resolve(path.normalize(opts.path));
        return vars.files.then(function(files) {
          return Bluebird.map(files, async function(entry) {
            // to avoid zip slip (writing outside of the destination), we resolve
            // the target path, and make sure it's nested in the intended
            // destination, or not extract it otherwise.
            const extractPath = path.join(opts.path, entry.path.replace(/\\/g, '/'));
            const rel = path.relative(opts.path, extractPath);
            if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
              return;
            }

            if (entry.type == 'Directory') {
              await fs.ensureDir(extractPath);
              return;
            }

            await fs.ensureDir(path.dirname(extractPath));

            const writer = opts.getWriter ? opts.getWriter({path: extractPath}) : fs.createWriteStream(extractPath);

            return new Promise(function(resolve, reject) {
              entry.stream(opts.password)
                .on('error', reject)
                .pipe(writer)
                .on('close', resolve)
                .on('error', reject);
            });
          }, { concurrency: opts.concurrency > 1 ? opts.concurrency : 1 });
        });
      };

      vars.files = Bluebird.mapSeries(Array(vars.numberOfRecords), function() {
        return records.pull(46).then(function(data) {
          const vars = parseBuffer.parse(data, [
            ['signature', 4],
            ['versionMadeBy', 2],
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
            ['fileCommentLength', 2],
            ['diskNumber', 2],
            ['internalFileAttributes', 2],
            ['externalFileAttributes', 4],
            ['offsetToLocalFileHeader', 4],
          ]);

          vars.offsetToLocalFileHeader += startOffset;
          vars.lastModifiedDateTime = parseDateTime(vars.lastModifiedDate, vars.lastModifiedTime);

          return records.pull(vars.fileNameLength).then(function(fileNameBuffer) {
            vars.pathBuffer = fileNameBuffer;
            vars.path = fileNameBuffer.toString('utf8');
            vars.isUnicode = (vars.flags & 0x800) != 0;
            return records.pull(vars.extraFieldLength);
          })
            .then(function(extraField) {
              vars.extra = parseExtraField(extraField, vars);
              return records.pull(vars.fileCommentLength);
            })
            .then(function(comment) {
              vars.comment = comment;
              vars.type = (vars.uncompressedSize === 0 && /[/\\]$/.test(vars.path)) ? 'Directory' : 'File';
              const padding = options && options.padding || 1000;
              vars.stream = function(_password) {
                const totalSize = 30
              + padding // add an extra buffer
              + (vars.extraFieldLength || 0)
              + (vars.fileNameLength || 0)
              + vars.compressedSize;

                return unzip(source, vars.offsetToLocalFileHeader, _password, vars, totalSize);
              };
              vars.buffer = function(_password) {
                return BufferStream(vars.stream(_password));
              };
              return vars;
            });
        });
      });

      return Bluebird.props(vars);
    });
};
