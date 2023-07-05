import { Compiler, RenderedBlock } from "./compiler";
import { Method, Methods } from "../schema";
export declare function createMethods(comp: Compiler): RenderedBlock[];
export declare function groupMethods(methods: Methods): {
    [key: string]: Method[];
};
export declare function hasDataSource(methods: Method[]): boolean;
