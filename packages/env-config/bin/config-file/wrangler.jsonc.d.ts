import type { RecordEntry } from "../shared-helper.js";
export type WranglerObject = {
    name: string;
    vars: {
        [key: string]: string;
    };
    env: {
        [key: string]: object;
    };
} | {
    [key: string]: RecordEntry;
};
declare function exists(): boolean;
declare function read(): WranglerObject;
declare function patch(original: string, values: Partial<WranglerObject>): string;
declare function modify(values: Partial<WranglerObject>): void;
declare function generate(values: WranglerObject): void;
export declare const testExport: {
    patch: typeof patch;
};
export declare const wranglerJsonc: {
    exists: typeof exists;
    read: typeof read;
    modify: typeof modify;
    generate: typeof generate;
};
export {};
//# sourceMappingURL=wrangler.jsonc.d.ts.map