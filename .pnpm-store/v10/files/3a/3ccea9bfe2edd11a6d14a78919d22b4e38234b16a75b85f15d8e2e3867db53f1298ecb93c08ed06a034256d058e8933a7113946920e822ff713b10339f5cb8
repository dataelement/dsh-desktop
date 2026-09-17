/// <reference types="node" />
import { Stats } from 'fs';
declare function createMode(stat?: number | createMode.StatsMode): createMode.Mode;
declare namespace createMode {
    type StatsMode = Pick<Stats, 'mode'>;
    function isStatsMode(v: any): v is StatsMode;
    class RWX {
        protected static r: number;
        protected static w: number;
        protected static x: number;
        private stat;
        constructor(stat: StatsMode);
        get read(): boolean;
        set read(v: boolean);
        get write(): boolean;
        set write(v: boolean);
        get execute(): boolean;
        set execute(v: boolean);
    }
    class Owner extends RWX {
        protected static r: number;
        protected static w: number;
        protected static x: number;
    }
    class Group extends RWX {
        protected static r: number;
        protected static w: number;
        protected static x: number;
    }
    class Others extends RWX {
        protected static r: number;
        protected static w: number;
        protected static x: number;
    }
    class Mode {
        owner: Owner;
        group: Group;
        others: Others;
        private stat;
        constructor(stat?: number | StatsMode);
        private checkModeProperty;
        isDirectory(v?: boolean): boolean;
        isFile(v?: boolean): boolean;
        isBlockDevice(v?: boolean): boolean;
        isCharacterDevice(v?: boolean): boolean;
        isSymbolicLink(v?: boolean): boolean;
        isFIFO(v?: boolean): boolean;
        isSocket(v?: boolean): boolean;
        /**
         * Returns an octal representation of the `mode`, eg. "0754".
         *
         * http://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation
         *
         * @return {String}
         * @api public
         */
        toOctal(): string;
        /**
         * Returns a String representation of the `mode`.
         * The output resembles something similar to what `ls -l` would output.
         *
         * http://en.wikipedia.org/wiki/Unix_file_types
         *
         * @return {String}
         * @api public
         */
        toString(): string;
        valueOf(): number;
        get setuid(): boolean;
        set setuid(v: boolean);
        get setgid(): boolean;
        set setgid(v: boolean);
        get sticky(): boolean;
        set sticky(v: boolean);
    }
}
export = createMode;
