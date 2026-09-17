import { pathToFileURL } from 'node:url';
process.argv.splice(1, 1);
// This tricks prebuild-install into not validating on the
// 1.8.x and 8.x ABI collision
Object.defineProperty(process.versions, 'modules', { value: '-1', writable: false });
void import(pathToFileURL(process.argv[1]).toString());
//# sourceMappingURL=prebuild-shim.js.map