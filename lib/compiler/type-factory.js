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
        let content = this._renderImports(filePath)
            + "\n\n\n"
            + Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + Object.values(this._factories).join("\n");
        fs.writeFileSync(filePath, content);
    }
    _create(comp, type) {
        if (type instanceof schema_1.Type_List) {
            return this._listFactory(comp, type.itemType);
            // let itemFactory = this.get(comp, type.itemType)
            // return this._addFactory(comp, type,
            //     `    if (obj == null) return null`,
            //     `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
            //     `    return obj.map(${itemFactory})`)
        }
        else if (type instanceof schema_1.Type_Mapping) {
            return this._mapFactory(comp, type.itemType);
            // let itemFactory = this.get(comp, type.itemType)
            // return this._addFactory(comp, type,
            //     `    if (obj == null) return null`,
            //     `    let result = {} as any`,
            //     `    for (const k in obj) {`,
            //     `        if (obj.hasOwnProperty(k)) {`,
            //     `            result[k] = ${itemFactory}(obj[k])`,
            //     `        }`,
            //     `    }`,
            //     `    return result`)
        }
        else if (type instanceof schema_1.Type_Native) {
            switch (type.name) {
                case "string": return "String";
                case "integer": return "Number";
                case "number": return "Number";
                case "boolean": return "Boolean";
                case "date":
                case "datetime":
                    if (this._dateFactory) {
                        return this._dateFactory;
                    }
                    else {
                        return this._dateFactory = this._entityFactory(comp, "Date");
                    }
            }
            throw new Error("Unhandled native type");
        }
        else if (type instanceof schema_1.Type_Ref) {
            if (type.referenced instanceof schema_1.Entity) {
                this._references[schema_1.Entity.qname(type.referenced).uid] = type.referenced;
                const qname = schema_1.Entity.qname(type.referenced);
                return this._entityFactory(comp, qname.name);
            }
            else {
                return this.get(comp, type.referenced);
            }
        }
        else if (type instanceof schema_1.Type_Tuple) {
            return this._tupleFactory(comp, type.items);
            // let factories = type.items.map((v, i) => `${this.get(comp, v)}(obj[${i}])`)
            // return this._addFactory(comp, type,
            //     `    if (obj == null) return null`,
            //     `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
            //     `    return [${factories.join(", ")}]`)
        }
        else if (type instanceof schema_1.Type_Polymorphic) {
            return this._polymorphicFactory(comp, type.mapping);
            /*
            let code = [
                `    if (obj == null) return null`,
            ]

            let switchField = type.mapping[0].id.fields.length === 1 ? type.mapping[0].id.fields[0] : null
            if (switchField) {
                for (const m of type.mapping) {
                    for (const i of m.id.fields) {
                        if (switchField !== i) {
                            switchField = null
                            break
                        }
                    }
                    if (!switchField) {
                        break
                    }
                }
            }

            if (switchField) {
                code.push(`    switch (obj[${JSON.stringify(switchField)}]) {`)
                for (const m of type.mapping) {
                    code.push(`        case ${JSON.stringify(m.id.values[0])}: return ${this.get(comp, m.type)}(obj)`)
                }
                code.push(`    }`)
            } else {
                for (const m of type.mapping) {
                    let cond = m.id.fields.map((v, i) => `obj[${JSON.stringify(v)}] === ${JSON.stringify(m.id.values[i])}`)
                    code.push(`    if (${cond.join(" && ")}) {`)
                    code.push(`        return ${this.get(comp, m.type)}(obj)`)
                    code.push(`    }`)
                }
            }

            return this._addFactory(comp, type, ...code)
            */
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
        return Object.values(this._references).map(ent => {
            let pth = path.relative(path.dirname(selfPath), schema_1.Entity.qname(ent).document.outPath)
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/");
            if (!pth.startsWith(".")) {
                pth = "./" + pth;
            }
            return `import { ${schema_1.Entity.qname(ent).name} } from "${pth}"`;
        }).join("\n");
    }
    _entityFactory(comp, name) {
        if (!this._helpers["__newEntity"]) {
            this._helpers["__newEntity"] = [
                `function __newEntity<T>(entity: { new(data: any): T }, obj: any): T {`,
                `   return obj == null ? null : obj instanceof entity ? obj : new entity(obj)`,
                `}`
            ].join("\n");
        }
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `export const ${facName} = (obj: any) => __newEntity(${name}, obj)`;
        return facName;
    }
    _listFactory(comp, itemType) {
        if (!this._helpers["__newList"]) {
            this._helpers["__newList"] = [
                `function __newList<T>(factory: (obj: any) => T, obj: any): T[] {`,
                `    if (obj == null) return null`,
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
        this._factories[facName] = `export const ${facName} = (obj: any) => __newList(${itemFactory}, obj)`;
        return facName;
    }
    _mapFactory(comp, itemType) {
        if (!this._helpers["__newMapping"]) {
            this._helpers["__newMapping"] = [
                `function __newMapping<T>(factory: (obj: any) => T, obj: any): { [key: string]: T } {`,
                `    if (obj == null) return null`,
                `    return new function() {`,
                `        for (const k in obj) {`,
                `            if (obj.hasOwnProperty(k)) {`,
                `                this[k] = factory(obj[k])`,
                `            }`,
                `        }`,
                `    }`,
                `}`
            ].join("\n");
        }
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `export const ${facName} = (obj: any) => __newMapping(${itemFactory}, obj)`;
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
        this._factories[facName] = `export const ${facName} = (obj: any) => __newTuple(${factories.join(", ")}, obj)`;
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
            this._factories[facName] = `export const ${facName} = (obj: any) => obj == null ? null : ${mapName}[obj[${JSON.stringify(useSingleField)}]](obj)`;
            return facName;
        }
        else {
            throw new Error("TODO: multi field polymorphic mapping");
        }
    }
}
exports.TypeFactory = new _TypeFactory();
//# sourceMappingURL=type-factory.js.map