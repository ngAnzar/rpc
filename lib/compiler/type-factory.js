"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const schema_1 = require("../schema");
const CACHE = {};
class _TypeFactory {
    constructor() {
        this.name = "anzar_rpc_factory_";
        this._factories = {};
        this._references = {};
        this._helpers = {};
    }
    get(comp, type) {
        let factory = CACHE[type.uid];
        if (!factory) {
            factory = this._create(comp, type);
            CACHE[type.uid] = factory;
        }
        return factory;
    }
    emit(filePath) {
        fs.mkdirpSync(path.dirname(filePath));
        let content = Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + Object.values(this._factories).join("\n")
            + "\n\n\n"
            + "// XXX: Avoid recursive imports\n"
            + this._renderImports(filePath);
        fs.writeFileSync(filePath, content);
    }
    renderBody() {
        return Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + Object.values(this._factories).join("\n")
            + "\n\n\n";
    }
    _create(comp, type) {
        if (type instanceof schema_1.Type_List) {
            return this._listFactory(comp, type.itemType);
        }
        else if (type instanceof schema_1.Type_Mapping) {
            return this._mapFactory(comp, type.itemType);
        }
        else if (type instanceof schema_1.Type_Native) {
            switch (type.name) {
                case "string": return "String";
                case "integer": return "Number";
                case "number": return "Number";
                case "boolean": return "Boolean";
                case "any": return this._anyFactory(comp);
                case "null": return this._anyFactory(comp);
                case "date":
                case "datetime":
                    if (this._dateFactory) {
                        return this._dateFactory;
                    }
                    else {
                        return this._dateFactory = this._entityFactory(comp, "Date");
                    }
                case "time":
                    if (this._timeFactory) {
                        return this._timeFactory;
                    }
                    else {
                        return this._timeFactory = this._entityFactory(comp, "Time");
                    }
            }
            throw new Error("Unhandled native type: " + type.name);
        }
        else if (type instanceof schema_1.Type_Ref) {
            if (type.referenced instanceof schema_1.Entity) {
                if (type.referenced.polymorph) {
                    return this._polymorphicFactory(comp, type.referenced.polymorph.mapping);
                }
                else {
                    this._references[schema_1.Entity.qname(type.referenced).uid] = type.referenced;
                    const qname = schema_1.Entity.qname(type.referenced);
                    return this._entityFactory(comp, qname.name);
                }
            }
            else {
                return this.get(comp, type.referenced);
            }
        }
        else if (type instanceof schema_1.Type_Tuple) {
            return this._tupleFactory(comp, type.items);
        }
        else if (type instanceof schema_1.Type_Polymorph) {
            return this._polymorphicFactory(comp, type.mapping);
        }
        else if (type instanceof schema_1.Type_Optional) {
            return this._optionalFactory(comp, type.itemType);
        }
        console.log(type);
        throw new Error("Unhandled type");
    }
    _addFactory(comp, type, ...content) {
        let fn = this._asFunction(comp, type, content);
        this._factories[fn.name] = fn.code;
        return fn.name;
    }
    _asFunction(comp, type, content) {
        let tsType = comp.typeAsTs(type);
        let name = this.name + (Object.values(this._factories).length + 1);
        return {
            name,
            code: `export function ${name}(obj: any): ${tsType} {\n${content.join("\n")}\n}`
        };
    }
    _renderImports(selfPath) {
        let idx = 0;
        let groups = {};
        let res = "";
        Object.values(this._references).map(ent => {
            let pth = path.relative(path.dirname(selfPath), schema_1.Entity.qname(ent).document.outPath)
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/");
            if (!pth.startsWith(".")) {
                pth = "./" + pth;
            }
            if (pth in groups) {
                groups[pth].names.push(schema_1.Entity.qname(ent).name);
            }
            else {
                groups[pth] = {
                    names: [schema_1.Entity.qname(ent).name],
                    alias: `__dep${++idx}`
                };
            }
        });
        for (const pth in groups) {
            res += `import { ${groups[pth].names.join(', ')} } from "${pth}"\n`;
        }
        return res;
    }
    _anyFactory(comp) {
        const name = `${this.name}any`;
        if (!this._helpers[name]) {
            this._helpers[name] = [
                `export function ${name}(value: any): any {`,
                `    return value`,
                `}`
            ].join("\n");
        }
        return name;
        // let facName = this.name + (Object.values(this._factories).length + 1)
        // this._factories[facName] = `export const ${facName} = __any`
        // return facName
    }
    _entityFactory(comp, name) {
        if (!this._helpers["__newEntity"]) {
            this._helpers["__newEntity"] = [
                `function __newEntity<T>(entity: { new(data: any): T }, obj: any): T {`,
                `    return obj instanceof entity ? obj : new entity(obj)`,
                `}`
            ].join("\n");
        }
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `const ${facName} = (obj: any) => __newEntity(${name}, obj)`;
        return facName;
    }
    _listFactory(comp, itemType) {
        if (!this._helpers["__newList"]) {
            this._helpers["__newList"] = [
                `function __newList<T>(factory: (obj: any) => T, obj: any): T[] {`,
                `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
                `    const length = obj.length`,
                `    const result = new Array(length)`,
                `    let i = 0`,
                `    while (i < length) {`,
                `        result[i] = factory(obj[i++])`,
                `    }`,
                `    return result`,
                `}`
            ].join("\n");
        }
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `const ${facName} = (obj: any) => __newList(${itemFactory}, obj)`;
        return facName;
    }
    _mapFactory(comp, itemType) {
        if (itemType instanceof schema_1.Type_Native && itemType.name === "any") {
            return this._anyFactory(comp);
        }
        if (!this._helpers["__newMapping"]) {
            this._helpers["__newMapping"] = [
                `function __newMapping<T>(factory: (obj: any) => T, obj: any): { [key: string]: T } {`,
                `    return new function() {`,
                `        for (const k in obj) {`,
                `            if (obj.hasOwnProperty(k)) {`,
                `                this[k] = factory(obj[k])`,
                `            }`,
                `        }`,
                `    } as any`,
                `}`
            ].join("\n");
        }
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `const ${facName} = (obj: any) => __newMapping(${itemFactory}, obj)`;
        return facName;
    }
    _tupleFactory(comp, itemTypes) {
        if (!this._helpers["__newTuple"]) {
            this._helpers["__newTuple"] = [
                `function __newTuple(...factories: any[]): any[] {`,
                `    const length = arguments.length - 1`,
                `    const obj = arguments[length]`,
                `    if (obj == null) return null`,
                `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
                `    const result = new Array(length)`,
                `    let i = 0`,
                `    while (i < length) {`,
                `        result[i] = arguments[i](obj[i++])`,
                `    }`,
                `    return result`,
                `}`
            ].join("\n");
        }
        let factories = itemTypes.map(v => this.get(comp, v));
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `const ${facName} = (obj: any) => __newTuple(${factories.join(", ")}, obj)`;
        return facName;
    }
    _polymorphicFactory(comp, map) {
        let useSingleField = map[0].id.fields.length === 1 ? map[0].id.fields[0] : null;
        let factoryMap = [];
        for (const pmap of map) {
            if (!useSingleField || pmap.id.fields[0] !== useSingleField) {
                useSingleField = null;
            }
            factoryMap.push(`${JSON.stringify(String(pmap.id.values.join("@")))}: ${this.get(comp, pmap.type)}`);
        }
        let mapName = this.name + (Object.values(this._factories).length + 1);
        this._factories[mapName] = `const ${mapName} = {\n    ` + factoryMap.join(",\n    ") + "\n}";
        if (useSingleField) {
            let facName = this.name + (Object.values(this._factories).length + 1);
            this._factories[facName] = `const ${facName} = (obj: any) => (${mapName} as any)[obj[${JSON.stringify(useSingleField)}]](obj)`;
            return facName;
        }
        else {
            throw new Error("TODO: multi field polymorphic mapping");
        }
    }
    _optionalFactory(comp, itemType) {
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `const ${facName} = (obj: any) => obj == null ? null : ${itemFactory}(obj)`;
        return facName;
    }
}
exports.TypeFactory = new _TypeFactory();
//# sourceMappingURL=type-factory.js.map