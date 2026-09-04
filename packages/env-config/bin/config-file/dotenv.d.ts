export type DotenvVariables = {
    [key: string]: string;
};
declare function exists(): boolean;
declare function read(): DotenvVariables;
declare function patch(original: string, values: Partial<DotenvVariables>): string;
declare function modify(values: Partial<DotenvVariables>): void;
declare function generate(values: DotenvVariables): void;
declare function prefix(values: DotenvVariables): DotenvVariables;
export declare const testExport: {
    patch: typeof patch;
};
export declare const dotenv: {
    exists: typeof exists;
    read: typeof read;
    modify: typeof modify;
    generate: typeof generate;
    prefix: typeof prefix;
};
export {};
//# sourceMappingURL=dotenv.d.ts.map