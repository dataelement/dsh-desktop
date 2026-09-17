type AsarFS = typeof import('fs') & {
    mkdirp(dir: string): Promise<void>;
    mkdirpSync(dir: string): void;
    lstat: (typeof import('fs'))['promises']['lstat'];
    mkdtemp: (typeof import('fs'))['promises']['mkdtemp'];
    readFile: (typeof import('fs'))['promises']['readFile'];
    stat: (typeof import('fs'))['promises']['stat'];
    writeFile: (typeof import('fs'))['promises']['writeFile'];
    symlink: (typeof import('fs'))['promises']['symlink'];
    readlink: (typeof import('fs'))['promises']['readlink'];
};
declare const promisified: AsarFS;
export default promisified;
