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
    constructor(doc: Document);
    readonly deps: string[];
    emit(filePath: string, factoryPath: string): void;
    importType(type: Type): void;
    protected _getUniqueImportName(qname: QName): string;
    typeAsTs(type: Type): string;
    typeAsFactory(type: Type): string;
    getEntityName(ent: Entity): string;
    protected _getQNameLocalName(qname: QName): string;
    protected _tempVarIdx: number;
    protected _tempVar(): string;
    protected renderEntities(): string;
    protected renderMethods(): string;
    protected renderImports(selfPath: string, factoryPath: string): string;
}
