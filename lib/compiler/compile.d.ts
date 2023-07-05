export interface CompileOptions {
    outPath: string;
    helperPath?: string;
}
export declare class CompileSession {
    readonly options: CompileOptions;
    readonly outPath: string;
    readonly helperPath: string;
    constructor(options: CompileOptions);
}
export declare function compile(files: string[], options: CompileOptions): void;
