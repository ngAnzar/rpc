"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeFactory = void 0;
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
            + this._renderFactories(this._factories)
            + "\n\n\n"
            + "// XXX: Avoid recursive imports\n"
            + this._renderImports(filePath);
        fs.writeFileSync(filePath, content);
    }
    renderBody() {
        return Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + this._renderFactories(this._factories)
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
                case "string": return this._nativeFactory(comp, "String");
                case "integer": return this._nativeFactory(comp, "Number");
                case "number": return this._nativeFactory(comp, "Number");
                case "boolean": return this._nativeFactory(comp, "Boolean");
                case "any": return this._anyFactory(comp);
                case "null": return this._anyFactory(comp);
                case "date": return this._nativeFactory(comp, "parseDate");
                case "datetime": return this._nativeFactory(comp, "parseDate");
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
    _nativeFactory(comp, callable) {
        const name = `${this.name}${callable} `;
        if (!this._helpers[name]) {
            this._helpers[name] = `const ${name} = ${callable}`;
        }
        return name;
    }
    _anyFactory(comp) {
        const name = `${this.name}any`;
        if (!this._helpers[name]) {
            this._helpers[name] = [
                `function ${name}(value: any): any {`,
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
        this._factories[facName] = `__newEntity(${name}, obj)`;
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
        this._factories[facName] = `__newList(${itemFactory}, obj)`;
        return facName;
    }
    _mapFactory(comp, itemType) {
        if (itemType instanceof schema_1.Type_Native && itemType.name === "any") {
            return this._anyFactory(comp);
        }
        if (!this._helpers["__newMapping"]) {
            this._helpers["__newMapping"] = [
                `function __newMapping<T>(factory: (obj: any) => T, obj: any): { [key: string]: T } {`,
                `    const result: { [key: string]: T } = {}`,
                `    for (const k in obj) {`,
                `        if (obj.hasOwnProperty(k)) {`,
                `            result[k] = factory(obj[k])`,
                `        }`,
                `    }`,
                `    return result`,
                `}`
            ].join("\n");
        }
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `__newMapping(${itemFactory}, obj)`;
        return facName;
    }
    _tupleFactory(comp, itemTypes) {
        if (!this._helpers["__newTuple"]) {
            this._helpers["__newTuple"] = [
                `type __tupleReturn<T extends any[]> = { [P in keyof T]: T[P] extends (...args: any) => any ? ReturnType<T[P]> : T[P] }`,
                `function __newTuple<T extends any[]>(obj: any[], ...factories: T): __tupleReturn<T> {`,
                `    if (!Array.isArray(obj)) { throw new Error('Tuple value must be array') }`,
                `    const length = factories.length`,
                `    const result = new Array(length)`,
                `    for (let i = 0; i < length; i++) {`,
                `        result[i] = factories[i](obj[i])`,
                `    }`,
                `    return result as any`,
                `}`
            ].join("\n");
        }
        let factories = itemTypes.map(v => this.get(comp, v));
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `__newTuple(obj, ${factories.join(", ")})`;
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
        let facName = this.name + (Object.values(this._factories).length + 1);
        let mapName = `${facName}_map`;
        if (useSingleField) {
            const fb = `obj[${JSON.stringify(useSingleField)}]`;
            this._factories[facName] = [
                `const ${mapName} = {\n    ${factoryMap.join(",\n    ")}\n}`,
                `${mapName}[(${fb}.value || ${fb}) as keyof typeof ${mapName}](obj)`
            ];
            return facName;
        }
        else {
            throw new Error("TODO: multi field polymorphic mapping");
        }
    }
    _optionalFactory(comp, itemType) {
        let itemFactory = this.get(comp, itemType);
        let facName = this.name + (Object.values(this._factories).length + 1);
        this._factories[facName] = `obj == null ? null : ${itemFactory}(obj)`;
        return facName;
    }
    _renderFactories(factories) {
        return Object.keys(factories)
            .map(key => {
            let fac = factories[key];
            if (Array.isArray(fac)) {
                let result = fac.slice();
                let fn = `function ${key}(obj: any) { return ${result.pop()} }`;
                result.push(fn);
                return result.join("\n");
            }
            else {
                return `function ${key}(obj: any) { return ${fac} }`;
            }
        })
            .join("\n");
    }
}
exports.TypeFactory = new _TypeFactory();
//# sourceMappingURL=type-factory.js.map