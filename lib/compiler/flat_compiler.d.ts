import { Compiler, RenderedBlock } from "./compiler";
export declare class FlatCompiler {
    protected compilers: Compiler[];
    protected blocks: {
        [key: string]: RenderedBlock;
    };
    protected commonImports: string;
    constructor();
    addCompiler(compiler: Compiler): void;
    emit(outPath: string): void;
    protected orderedBlocks(): RenderedBlock[];
    protected addToDeps(block: RenderedBlock, res: string[], circular?: any[]): void;
}
