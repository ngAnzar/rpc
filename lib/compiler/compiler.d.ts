import { Document, Entity, Type, QName } from "../schema";
export declare class Compiler {
    readonly doc: Document;
    protected imports: {
        [key: string]: {
            qname: QName;
            alias: string;
        };
    };
    protected _factories: string[];
    protected _deps: string[];
    protected _currentBlock: RenderedBlock;
    constructor(doc: Document);
    get deps(): string[];
    importType(type: Type): void;
    protected _getUniqueImportName(qname: QName): string;
    typeAsTs(type: Type): string;
    typeAsFactory(type: Type): string;
    getEntityName(ent: Entity): string;
    protected _getQNameLocalName(qname: QName): string;
    protected _tempVarIdx: number;
    protected _tempVar(): string;
    renderEntities(): RenderedBlock[];
    renderMethods(): RenderedBlock[];
    newBlock(qname: QName): RenderedBlock;
    protected renderImports(selfPath: string, factoryPath: string): string;
}
export declare function renderBlockComment(text: string): string;
export declare class RenderedBlock {
    readonly deps: string[];
    readonly qname: string;
    content: string;
    constructor(qname: QName);
    addDep(qname: QName): void;
}
