import { Registry } from "./registry";
export declare abstract class Type {
    get uid(): string;
    private _uid?;
    resolve(): void;
    protected abstract _resolve(): void;
    protected abstract _createUid(): string;
}
export declare class Type_Ref extends Type {
    private readonly reg;
    private readonly ref;
    private readonly docPath;
    readonly referenced: Type | Entity;
    constructor(reg: Registry, ref: string, docPath: string);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_Native extends Type {
    readonly name: string;
    constructor(name: string);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_Mapping extends Type {
    readonly itemType: Type;
    constructor(itemType: Type);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_List extends Type {
    readonly itemType: Type;
    constructor(itemType: Type);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_Tuple extends Type {
    readonly items: Type[];
    constructor(items: Type[]);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_Optional extends Type {
    readonly itemType: Type;
    constructor(itemType: Type);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_Polymorph extends Type {
    readonly mapping: Type_PolymorphMap[];
    constructor(mapping: Type_PolymorphMap[]);
    protected _resolve(): void;
    protected _createUid(): string;
}
export declare class Type_PolymorphId {
    readonly fields: string[];
    readonly values: Array<string | number>;
    constructor(fields: string[], values: Array<string | number>);
    get uid(): string;
}
export declare class Type_PolymorphMap {
    readonly id: Type_PolymorphId;
    readonly type: Type_Ref;
    constructor(id: Type_PolymorphId, type: Type_Ref);
    get uid(): string;
}
export declare class QName {
    readonly file: string;
    readonly path: string;
    readonly tln: string;
    readonly ns: string;
    readonly name: string;
    constructor(file: string, path: string, name: string);
    get fullName(): string;
    get uid(): string;
    get document(): Document;
}
declare const ENT_NAME: unique symbol;
declare const ENT_DATA: unique symbol;
export declare class Entity {
    readonly fields: EntityFields;
    readonly polymorph: Type_Polymorph;
    readonly primaryKey: string[];
    readonly polymorphId?: string | undefined;
    static qname(ent: Entity): QName;
    static data(ent: Entity): StaticData | null;
    protected [ENT_NAME]: QName;
    protected [ENT_DATA]: StaticData;
    constructor(name: QName, fields: EntityFields, polymorph: Type_Polymorph, primaryKey: string[], polymorphId?: string | undefined);
}
export declare class EntityField {
    name: string;
    type: Type;
    summary: string;
    description: string;
    constructor(name: string, type: Type, summary: string, description: string);
}
export declare type Entities = {
    [key: string]: Entity;
};
export declare type EntityFields = {
    [key: string]: EntityField;
};
export declare class Method {
    name: QName;
    params: MethodParams;
    returns: MethodReturns;
    throws: MethodThrows;
    constructor(name: QName, params: MethodParams, returns: MethodReturns, throws: MethodThrows);
}
export declare class MethodParam {
    name: string;
    type: Type;
    summary: string;
    description: string;
    constructor(name: string, type: Type, summary: string, description: string);
}
export declare class MethodReturns {
    type: Type;
    summary: string;
    description: string;
    constructor(type: Type, summary: string, description: string);
}
export declare class MethodThrow {
    code: number | null;
    message: string;
    data: any;
    summary: string;
    description: string;
    constructor(code: number | null, message: string, data: any, summary: string, description: string);
}
export declare type Methods = {
    [key: string]: Method;
};
export declare type MethodParams = {
    [key: string]: MethodParam;
};
export declare type MethodThrows = MethodThrow[];
export declare class Module {
    parent: string;
    name: string;
    constructor(parent: string, name: string);
}
export declare class StaticData {
    readonly items: Array<{
        [key: string]: any;
    }>;
    constructor(items: Array<{
        [key: string]: any;
    }>);
}
export declare class Document {
    private readonly reg;
    readonly module: Module;
    readonly entities: Entities;
    readonly methods: Methods;
    readonly path: string;
    outPath: string;
    constructor(reg: Registry, json: any, _path: string);
    protected _convertEntities(ents: {
        [key: string]: any;
    }): void;
    protected _convertMethods(mets: {
        [key: string]: any;
    }): void;
    protected _convertData(data: {
        [key: string]: any[];
    }): void;
    protected _type(t: any): Type;
    protected _resolveType(): void;
}
export {};
