import * as fs from "fs-extra"
import * as path from "path"

import { Type, Type_List, Type_Mapping, Type_Native, Type_Polymorph, Type_Ref, Type_Tuple, Entity, Type_PolymorphMap, Type_Optional } from "../schema"
import { Compiler } from "./compiler"


const CACHE: { [key: string]: string } = {}


class _TypeFactory {
    public readonly name: string = "anzar_rpc_factory_"

    protected _factories: { [key: string]: string } = {}
    protected _references: { [key: string]: Entity } = {}
    protected _helpers: { [key: string]: string } = {}
    protected _dateFactory: string
    protected _timeFactory: string

    public get(comp: Compiler, type: Type): string {
        let factory = CACHE[type.uid]
        if (!factory) {
            factory = this._create(comp, type)
            CACHE[type.uid] = factory
        }
        return factory
    }

    public emit(filePath: string) {
        fs.mkdirpSync(path.dirname(filePath))

        let content =
            Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + Object.values(this._factories).join("\n")
            + "\n\n\n"
            + "// XXX: Avoid recursive imports\n"
            + this._renderImports(filePath)

        fs.writeFileSync(filePath, content)
    }

    public renderBody() {
        return Object.values(this._helpers).join("\n")
            + "\n\n\n"
            + Object.values(this._factories).join("\n")
            + "\n\n\n"
    }

    protected _create(comp: Compiler, type: Type): string {
        if (type instanceof Type_List) {
            return this._listFactory(comp, type.itemType)
        } else if (type instanceof Type_Mapping) {
            return this._mapFactory(comp, type.itemType)
        } else if (type instanceof Type_Native) {
            switch (type.name) {
                case "string": return "String"
                case "integer": return "Number"
                case "number": return "Number"
                case "boolean": return "Boolean"
                case "any": return this._anyFactory(comp)
                case "null": return this._anyFactory(comp)
                case "date":
                case "datetime":
                    if (this._dateFactory) {
                        return this._dateFactory
                    } else {
                        return this._dateFactory = this._entityFactory(comp, "Date")
                    }
                case "time":
                    if (this._timeFactory) {
                        return this._timeFactory
                    } else {
                        return this._timeFactory = this._entityFactory(comp, "Time")
                    }
            }
            throw new Error("Unhandled native type: " + type.name)
        } else if (type instanceof Type_Ref) {
            if (type.referenced instanceof Entity) {
                if (type.referenced.polymorph) {
                    return this._polymorphicFactory(comp, type.referenced.polymorph.mapping)
                } else {
                    this._references[Entity.qname(type.referenced).uid] = type.referenced
                    const qname = Entity.qname(type.referenced)
                    return this._entityFactory(comp, qname.name)
                }
            } else {
                return this.get(comp, type.referenced)
            }
        } else if (type instanceof Type_Tuple) {
            return this._tupleFactory(comp, type.items)
        } else if (type instanceof Type_Polymorph) {
            return this._polymorphicFactory(comp, type.mapping)
        } else if (type instanceof Type_Optional) {
            return this._optionalFactory(comp, type.itemType)
        }
        console.log(type)
        throw new Error("Unhandled type")
    }

    protected _addFactory(comp: Compiler, type: Type, ...content: string[]): string {
        let fn = this._asFunction(comp, type, content)
        this._factories[fn.name] = fn.code
        return fn.name
    }

    protected _asFunction(comp: Compiler, type: Type, content: string[]): { name: string, code: string } {
        let tsType = comp.typeAsTs(type)
        let name = this.name + (Object.values(this._factories).length + 1)
        return {
            name,
            code: `export function ${name}(obj: any): ${tsType} {\n${content.join("\n")}\n}`
        }
    }

    protected _renderImports(selfPath: string) {
        let idx = 0
        let groups: { [key: string]: { names: string[], alias: string } } = {}
        let res = ""


        Object.values(this._references).map(ent => {
            let pth = path.relative(path.dirname(selfPath), Entity.qname(ent).document.outPath)
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/")
            if (!pth.startsWith(".")) {
                pth = "./" + pth
            }

            if (pth in groups) {
                groups[pth].names.push(Entity.qname(ent).name)
            } else {
                groups[pth] = {
                    names: [Entity.qname(ent).name],
                    alias: `__dep${++idx}`
                }
            }
        })

        for (const pth in groups) {
            res += `import { ${groups[pth].names.join(', ')} } from "${pth}"\n`
        }

        return res
    }


    protected _anyFactory(comp: Compiler): string {
        const name = `${this.name}any`
        if (!this._helpers[name]) {
            this._helpers[name] = [
                `export function ${name}(value: any): any {`,
                `    return value`,
                `}`
            ].join("\n")
        }

        return name

        // let facName = this.name + (Object.values(this._factories).length + 1)
        // this._factories[facName] = `export const ${facName} = __any`
        // return facName
    }

    protected _entityFactory(comp: Compiler, name: string): string {
        if (!this._helpers["__newEntity"]) {
            this._helpers["__newEntity"] = [
                `function __newEntity<T>(entity: { new(data: any): T }, obj: any): T {`,
                `    return obj instanceof entity ? obj : new entity(obj)`,
                `}`
            ].join("\n")
        }

        let facName = this.name + (Object.values(this._factories).length + 1)
        this._factories[facName] = `const ${facName} = (obj: any) => __newEntity(${name}, obj)`
        return facName
    }


    protected _listFactory(comp: Compiler, itemType: Type): string {
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
            ].join("\n")
        }

        let itemFactory = this.get(comp, itemType)
        let facName = this.name + (Object.values(this._factories).length + 1)
        this._factories[facName] = `const ${facName} = (obj: any) => __newList(${itemFactory}, obj)`
        return facName
    }


    protected _mapFactory(comp: Compiler, itemType: Type): string {
        if (itemType instanceof Type_Native && itemType.name === "any") {
            return this._anyFactory(comp)
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
            ].join("\n")
        }

        let itemFactory = this.get(comp, itemType)
        let facName = this.name + (Object.values(this._factories).length + 1)
        this._factories[facName] = `const ${facName} = (obj: any) => __newMapping(${itemFactory}, obj)`
        return facName
    }


    protected _tupleFactory(comp: Compiler, itemTypes: Type[]): string {
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
            ].join("\n")
        }

        let factories = itemTypes.map(v => this.get(comp, v))
        let facName = this.name + (Object.values(this._factories).length + 1)
        this._factories[facName] = `const ${facName} = (obj: any) => __newTuple(${factories.join(", ")}, obj)`
        return facName
    }


    protected _polymorphicFactory(comp: Compiler, map: Type_PolymorphMap[]) {
        let useSingleField: string | null = map[0].id.fields.length === 1 ? map[0].id.fields[0] : null
        let factoryMap: string[] = []
        for (const pmap of map) {
            if (!useSingleField || pmap.id.fields[0] !== useSingleField) {
                useSingleField = null
            }
            factoryMap.push(`${JSON.stringify(String(pmap.id.values.join("@")))}: ${this.get(comp, pmap.type)}`)
        }

        let mapName = this.name + (Object.values(this._factories).length + 1)
        this._factories[mapName] = `const ${mapName} = {\n    ` + factoryMap.join(",\n    ") + "\n}"

        if (useSingleField) {
            let facName = this.name + (Object.values(this._factories).length + 1)
            this._factories[facName] = `const ${facName} = (obj: any) => (${mapName} as any)[obj[${JSON.stringify(useSingleField)}]](obj)`
            return facName
        } else {
            throw new Error("TODO: multi field polymorphic mapping")
        }
    }

    protected _optionalFactory(comp: Compiler, itemType: Type): string {
        let itemFactory = this.get(comp, itemType)
        let facName = this.name + (Object.values(this._factories).length + 1)
        this._factories[facName] = `const ${facName} = (obj: any) => obj == null ? null : ${itemFactory}(obj)`
        return facName
    }
}


export const TypeFactory = new _TypeFactory()
