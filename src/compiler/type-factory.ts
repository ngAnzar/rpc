import { Type, Type_List, Type_Mapping, Type_Native, Type_Polymorphic, Type_Ref, Type_Tuple, Entity } from "../schema"
import { Compiler } from "./compiler"


const CACHE: { [key: string]: string } = {}


class _TypeFactory {
    public readonly name: string = "_entity_factories"

    protected _factories: { [key: string]: string } = {}
    protected _references: Entity[] = []

    public get(comp: Compiler, type: Type): string {
        let factory = CACHE[type.uid]
        if (!factory) {
            factory = this._create(comp, type)
            CACHE[type.uid] = factory
        }
        return factory
    }

    public emit(filePath: string) {

    }

    protected _create(comp: Compiler, type: Type): string {
        if (type instanceof Type_List) {
            let itemFactory = this.get(comp, type.itemType)
            return this._addFactory(comp, type,
                `    if (obj == null) return null`,
                `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
                `    return obj.map(${itemFactory})`)
        } else if (type instanceof Type_Mapping) {
            let itemFactory = this.get(comp, type.itemType)
            return this._addFactory(comp, type,
                `    if (obj == null) return null`,
                `    let result = {} as any`,
                `    for (const k in obj) {`,
                `        result[k] = ${itemFactory}(obj[k])`,
                `    }`,
                `    return result`)
        } else if (type instanceof Type_Native) {
            switch (type.name) {
                case "string": return "String"
                case "integer": return "Number"
                case "number": return "Number"
                case "boolean": return "Boolean"
                case "date": return this._addFactory(comp, type, `return obj == null ? null : obj instanceof Date ? obj : new Date(obj as string)`)
                case "datetime": return this._addFactory(comp, type, `return obj == null ? null : obj instanceof Date ? obj : new Date(obj as string)`)
            }
            throw new Error("Unhandled native type")
        } else if (type instanceof Type_Ref) {
            if (type.referenced instanceof Entity) {
                this._references.push(type.referenced)
                return this._addFactory(comp, type, `return obj == null ? null : obj instanceof ${type.referenced.name.name} ? obj : new ${type.referenced.name.name}(obj)`)
                // return type.referenced.name.name
            } else {
                return this.get(comp, type.referenced)
            }
        } else if (type instanceof Type_Tuple) {
            let factories = type.items.map((v, i) => `${this.get(comp, v)}(obj[${i}])`)
            return this._addFactory(comp, type,
                `    if (obj == null) return null`,
                `    if (!Array.isArray(obj)) { throw new Error('Value must be array') }`,
                `    return [${factories.join(", ")}]`)
        } else if (type instanceof Type_Polymorphic) {
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
                /**
                 * TODO: alternatív megoldás:
                 *
                 * mapping = {
                 *  "id.values[0]-id.values[1]...": factory_fn_name
                 * }
                 * const f = mapping[obj.idfield]
                 */
                for (const m of type.mapping) {
                    let cond = m.id.fields.map((v, i) => `obj[${JSON.stringify(v)}] === ${JSON.stringify(m.id.values[i])}`)
                    code.push(`    if (${cond.join(" && ")}) {`)
                    code.push(`        return ${this.get(comp, m.type)}(obj)`)
                    code.push(`    }`)
                }
            }

            return this._addFactory(comp, type, ...code)
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
        let name = "anzar_rpc_factory_" + (Object.values(this._factories).length + 1)
        return {
            name,
            code: `export function ${name}(obj: any): ${tsType} {\n${content.join("\n")}\n}`
        }
    }
}


export const TypeFactory = new _TypeFactory()
