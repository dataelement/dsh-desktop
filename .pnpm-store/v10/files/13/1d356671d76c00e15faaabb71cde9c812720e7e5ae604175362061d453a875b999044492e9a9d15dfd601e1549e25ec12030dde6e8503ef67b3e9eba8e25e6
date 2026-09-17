function normalizeTrailingSlashes(path) {
  let i = path.length;
  if (i === 0) {
    return "/";
  }
  while (i > 0) {
    if (path.charCodeAt(--i) !== 47) {
      break;
    }
  }
  if (i === -1) {
    return "/";
  }
  return path.slice(0, i + 1);
}
export {
  normalizeTrailingSlashes
};
