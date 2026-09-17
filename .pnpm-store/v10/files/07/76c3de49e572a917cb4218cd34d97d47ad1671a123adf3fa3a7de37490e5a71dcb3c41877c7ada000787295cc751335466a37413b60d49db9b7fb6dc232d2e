function concatUint8Array(data) {
  if (data.length === 0) {
    return new Uint8Array(0);
  }
  let totalLength = 0;
  for (let i = 0; i < data.length; i++) {
    totalLength += data[i].length;
  }
  if (totalLength === 0) {
    return new Uint8Array(0);
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < data.length; i++) {
    result.set(data[i], offset);
    offset += data[i].length;
  }
  return result;
}
export {
  concatUint8Array
};
