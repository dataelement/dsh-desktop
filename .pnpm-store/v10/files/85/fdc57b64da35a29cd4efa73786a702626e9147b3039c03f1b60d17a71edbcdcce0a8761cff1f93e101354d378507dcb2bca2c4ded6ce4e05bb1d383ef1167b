type PlistValue = string | number | boolean | Date | PlistObject | PlistValue[];
interface PlistObject {
    [key: string]: PlistValue;
}
export declare function savePlistFile(path: string, data: PlistValue): Promise<void>;
export declare function parsePlistFile<T>(file: string): Promise<T>;
export type { PlistValue, PlistObject };
