import { Document } from "./model";
export declare class Registry {
    private readonly documents;
    get(docPath: string): Document;
}
export declare const registry: Registry;
