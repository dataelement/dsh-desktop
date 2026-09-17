"use strict";
/**
 * Constants (defined in `stat.h`).
 */
const S_IFMT = 61440; /* 0170000 type of file */
const S_IFIFO = 4096; /* 0010000 named pipe (fifo) */
const S_IFCHR = 8192; /* 0020000 character special */
const S_IFDIR = 16384; /* 0040000 directory */
const S_IFBLK = 24576; /* 0060000 block special */
const S_IFREG = 32768; /* 0100000 regular */
const S_IFLNK = 40960; /* 0120000 symbolic link */
const S_IFSOCK = 49152; /* 0140000 socket */
const S_IFWHT = 57344; /* 0160000 whiteout */
const S_ISUID = 2048; /* 0004000 set user id on execution */
const S_ISGID = 1024; /* 0002000 set group id on execution */
const S_ISVTX = 512; /* 0001000 save swapped text even after use */
const S_IRUSR = 256; /* 0000400 read permission, owner */
const S_IWUSR = 128; /* 0000200 write permission, owner */
const S_IXUSR = 64; /* 0000100 execute/search permission, owner */
const S_IRGRP = 32; /* 0000040 read permission, group */
const S_IWGRP = 16; /* 0000020 write permission, group */
const S_IXGRP = 8; /* 0000010 execute/search permission, group */
const S_IROTH = 4; /* 0000004 read permission, others */
const S_IWOTH = 2; /* 0000002 write permission, others */
const S_IXOTH = 1; /* 0000001 execute/search permission, others */
function createMode(stat) {
    return new createMode.Mode(stat);
}
(function (createMode) {
    function isStatsMode(v) {
        return v && typeof v.mode === 'number';
    }
    createMode.isStatsMode = isStatsMode;
    class RWX {
        constructor(stat) {
            this.stat = stat;
        }
        get read() {
            return Boolean(this.stat.mode & this.constructor.r);
        }
        set read(v) {
            if (v) {
                this.stat.mode |= this.constructor.r;
            }
            else {
                this.stat.mode &= ~this.constructor.r;
            }
        }
        get write() {
            return Boolean(this.stat.mode & this.constructor.w);
        }
        set write(v) {
            if (v) {
                this.stat.mode |= this.constructor.w;
            }
            else {
                this.stat.mode &= ~this.constructor.w;
            }
        }
        get execute() {
            return Boolean(this.stat.mode & this.constructor.x);
        }
        set execute(v) {
            if (v) {
                this.stat.mode |= this.constructor.x;
            }
            else {
                this.stat.mode &= ~this.constructor.x;
            }
        }
    }
    createMode.RWX = RWX;
    class Owner extends RWX {
    }
    Owner.r = S_IRUSR;
    Owner.w = S_IWUSR;
    Owner.x = S_IXUSR;
    createMode.Owner = Owner;
    class Group extends RWX {
    }
    Group.r = S_IRGRP;
    Group.w = S_IWGRP;
    Group.x = S_IXGRP;
    createMode.Group = Group;
    class Others extends RWX {
    }
    Others.r = S_IROTH;
    Others.w = S_IWOTH;
    Others.x = S_IXOTH;
    createMode.Others = Others;
    class Mode {
        constructor(stat) {
            if (typeof stat === 'number') {
                this.stat = { mode: stat };
            }
            else if (isStatsMode(stat)) {
                this.stat = stat;
            }
            else {
                this.stat = { mode: 0 };
            }
            this.owner = new Owner(this.stat);
            this.group = new Group(this.stat);
            this.others = new Others(this.stat);
        }
        checkModeProperty(property, set) {
            const { mode } = this.stat;
            if (set) {
                this.stat.mode = ((mode | S_IFMT) & property) | (mode & ~S_IFMT);
            }
            return (mode & S_IFMT) === property;
        }
        isDirectory(v) {
            return this.checkModeProperty(S_IFDIR, v);
        }
        isFile(v) {
            return this.checkModeProperty(S_IFREG, v);
        }
        isBlockDevice(v) {
            return this.checkModeProperty(S_IFBLK, v);
        }
        isCharacterDevice(v) {
            return this.checkModeProperty(S_IFCHR, v);
        }
        isSymbolicLink(v) {
            return this.checkModeProperty(S_IFLNK, v);
        }
        isFIFO(v) {
            return this.checkModeProperty(S_IFIFO, v);
        }
        isSocket(v) {
            return this.checkModeProperty(S_IFSOCK, v);
        }
        /**
         * Returns an octal representation of the `mode`, eg. "0754".
         *
         * http://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation
         *
         * @return {String}
         * @api public
         */
        toOctal() {
            const octal = this.stat.mode & 4095 /* 07777 */;
            return `0000${octal.toString(8)}`.slice(-4);
        }
        /**
         * Returns a String representation of the `mode`.
         * The output resembles something similar to what `ls -l` would output.
         *
         * http://en.wikipedia.org/wiki/Unix_file_types
         *
         * @return {String}
         * @api public
         */
        toString() {
            const str = [];
            // file type
            if (this.isDirectory()) {
                str.push('d');
            }
            else if (this.isFile()) {
                str.push('-');
            }
            else if (this.isBlockDevice()) {
                str.push('b');
            }
            else if (this.isCharacterDevice()) {
                str.push('c');
            }
            else if (this.isSymbolicLink()) {
                str.push('l');
            }
            else if (this.isFIFO()) {
                str.push('p');
            }
            else if (this.isSocket()) {
                str.push('s');
            }
            else {
                const mode = this.valueOf();
                const err = new TypeError(`Unexpected "file type": mode=${mode}`);
                //err.stat = this.stat;
                //err.mode = mode;
                throw err;
            }
            // owner read, write, execute
            str.push(this.owner.read ? 'r' : '-');
            str.push(this.owner.write ? 'w' : '-');
            if (this.setuid) {
                str.push(this.owner.execute ? 's' : 'S');
            }
            else {
                str.push(this.owner.execute ? 'x' : '-');
            }
            // group read, write, execute
            str.push(this.group.read ? 'r' : '-');
            str.push(this.group.write ? 'w' : '-');
            if (this.setgid) {
                str.push(this.group.execute ? 's' : 'S');
            }
            else {
                str.push(this.group.execute ? 'x' : '-');
            }
            // others read, write, execute
            str.push(this.others.read ? 'r' : '-');
            str.push(this.others.write ? 'w' : '-');
            if (this.sticky) {
                str.push(this.others.execute ? 't' : 'T');
            }
            else {
                str.push(this.others.execute ? 'x' : '-');
            }
            return str.join('');
        }
        valueOf() {
            return this.stat.mode;
        }
        get setuid() {
            return Boolean(this.stat.mode & S_ISUID);
        }
        set setuid(v) {
            if (v) {
                this.stat.mode |= S_ISUID;
            }
            else {
                this.stat.mode &= ~S_ISUID;
            }
        }
        get setgid() {
            return Boolean(this.stat.mode & S_ISGID);
        }
        set setgid(v) {
            if (v) {
                this.stat.mode |= S_ISGID;
            }
            else {
                this.stat.mode &= ~S_ISGID;
            }
        }
        get sticky() {
            return Boolean(this.stat.mode & S_ISVTX);
        }
        set sticky(v) {
            if (v) {
                this.stat.mode |= S_ISVTX;
            }
            else {
                this.stat.mode &= ~S_ISVTX;
            }
        }
    }
    createMode.Mode = Mode;
    // So that `instanceof` checks work as expected
    createMode.prototype = Mode.prototype;
})(createMode || (createMode = {}));
module.exports = createMode;
//# sourceMappingURL=index.js.map