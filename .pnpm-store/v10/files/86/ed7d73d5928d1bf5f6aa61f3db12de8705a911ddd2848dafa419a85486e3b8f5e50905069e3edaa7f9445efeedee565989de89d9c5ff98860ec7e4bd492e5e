import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { d } from './debug';
export const sha = async (filePath) => {
    d('hashing', filePath);
    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');
    await pipeline(fs.createReadStream(filePath), hash);
    return hash.read();
};
//# sourceMappingURL=sha.js.map