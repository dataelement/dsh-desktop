const parseBuffer = require('./parseBuffer');

module.exports = function(extraField, vars) {
  let extra;
  // Find the ZIP64 header, if present.
  while(!extra && extraField && extraField.length) {
    const candidateExtra = parseBuffer.parse(extraField, [
      ['signature', 2],
      ['partSize', 2],
    ]);

    if(candidateExtra.signature === 0x0001) {
      // parse buffer based on data in ZIP64 central directory; order is important!
      const fieldsToExpect = [];
      if (vars.uncompressedSize === 0xffffffff) fieldsToExpect.push(['uncompressedSize', 8]);
      if (vars.compressedSize === 0xffffffff) fieldsToExpect.push(['compressedSize', 8]);
      if (vars.offsetToLocalFileHeader === 0xffffffff) fieldsToExpect.push(['offsetToLocalFileHeader', 8]);

      // slice off the 4 bytes for signature and partSize
      extra = parseBuffer.parse(extraField.slice(4), fieldsToExpect);
    } else {
      // Advance the buffer to the next part.
      // The total size of this part is the 4 byte header + partsize.
      extraField = extraField.slice(candidateExtra.partSize + 4);
    }
  }

  extra = extra || {};

  if (vars.compressedSize === 0xffffffff)
    vars.compressedSize = extra.compressedSize;

  if (vars.uncompressedSize === 0xffffffff)
    vars.uncompressedSize= extra.uncompressedSize;

  if (vars.offsetToLocalFileHeader === 0xffffffff)
    vars.offsetToLocalFileHeader = extra.offsetToLocalFileHeader;

  return extra;
};
