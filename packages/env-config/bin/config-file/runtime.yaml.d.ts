export type EnvironmentVariableOptions = {
    local: {
        [key: string]: string;
    };
    release: {
        [key: string]: string;
    };
    staging: {
        [key: string]: string;
    };
};
export type RuntimeVariablesConfigration = {
    globals: EnvironmentVariableOptions;
    apps: {
        [key: string]: EnvironmentVariableOptions;
    };
};
export type RuntimeVariables = {
    globals: EnvironmentVariableOptions;
    apps: EnvironmentVariableOptions;
};
declare function exists(): boolean;
declare function read(): RuntimeVariables;
export declare const runtimeConfig: {
    exists: typeof exists;
    read: typeof read;
};
export {};
//# sourceMappingURL=runtime.yaml.d.ts.map