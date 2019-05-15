import { Type, Entity, Type_PolymorphMap } from "../schema";
import { Compiler } from "./compiler";
declare class _TypeFactory {
    readonly name: string;
    protected _factories: {
        [key: string]: string;
    };
    protected _references: {
        [key: string]: Entity;
    };
    protected _helpers: {
        [key: string]: string;
    };
    protected _dateFactory: string;
    get(comp: Compiler, type: Type): string;
    emit(filePath: string): void;
    protected _create(comp: Compiler, type: Type): string;
    protected _addFactory(comp: Compiler, type: Type, ...content: string[]): string;
    protected _asFunction(comp: Compiler, type: Type, content: string[]): {
        name: string;
        code: string;
    };
    protected _renderImports(selfPath: string): string;
    protected _anyFactory(comp: Compiler): string;
    protected _entityFactory(comp: Compiler, name: string): string;
    protected _listFactory(comp: Compiler, itemType: Type): string;
    protected _mapFactory(comp: Compiler, itemType: Type): string;
    protected _tupleFactory(comp: Compiler, itemTypes: Type[]): string;
    protected _polymorphicFactory(comp: Compiler, map: Type_PolymorphMap[]): string;
    protected _optionalFactory(comp: Compiler, itemType: Type): string;
}
export declare const TypeFactory: _TypeFactory;
export {};
