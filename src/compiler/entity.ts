import {
    Entity, EntityField,
    Type, Type_List, Type_Mapping, Type_Native, Type_Polymorph, Type_Ref, Type_Tuple
} from "../schema"
import { Compiler } from "./compiler"


/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */


export function createEntityCode(comp: Compiler, ent: Entity): string {
    let res = `export class ${Entity.qname(ent).name} extends Entity__ {\n`
    res += `    public static readonly CLASS = new InjectionToken("${Entity.qname(ent).name}Class")\n`
    res += `    public static readonly PROVIDER: FactoryProvider = { provide: ${Entity.qname(ent).name}.CLASS, useFactory: ${Entity.qname(ent).name}.factory, deps: [HTTPClient__] }\n`

    let staticData = Entity.data(ent)
    if (staticData) {
        res += `    public static readonly DATA: StaticSource__<${Entity.qname(ent).name}> = new StaticSource__(${Entity.qname(ent).name}, ${JSON.stringify(staticData.items)} as any)\n`
    }

    const fields = ent.fields
    for (const f in fields) {
        res += createFieldCode(comp, fields[f]) + "\n"
    }
    res += `}\n`
    return res
}


function createFieldCode(comp: Compiler, field: EntityField, type?: Type): string {
    type = type || field.type

    if (type instanceof Type_Ref) {
        if (type.referenced instanceof Type) {
            return createFieldCode(comp, field, type.referenced)
        }
    }

    let tsType = comp.typeAsTs(type)
    // let tsFactory = comp.typeAsFactory(type)
    let res = "    "
    let ents = getEntitiesFromType(type).map(v => comp.getEntityName(v))
    let tArray = ents.length ? `[${ents.join(", ")}]` : null
    let map = comp.typeAsFactory(type)

    res += `@Field__({`
    if (tArray && map) {
        res += ` map: ${map}, type: ${tArray} `
    } else if (tArray) {
        res += ` type: ${tArray} `
    } else if (map) {
        res += ` map: ${map} `
    }
    return res + `}) public ${field.name}: ${tsType}`

    /*
    if (type instanceof Type_List) {
        res = `@Field({ map: ${ comp.typeAsFactory(type) }, type: [${ ents.join(", ") }] }) public ${ field.name }: ${ tsType } `
    } else if (type instanceof Type_Mapping) {
        res = `@Field({ map: ${ comp.typeAsFactory(type) }, type: [${ ents.join(", ") }] }) public ${ field.name }: ${ tsType } `
    } else if (type instanceof Type_Native) {
        res = `@Field({ map: ${ comp.typeAsFactory(type) }}) public ${ field.name }: ${ tsType } `
    } else if (type instanceof Type_Polymorph) {
        res = `@Field({ map: ${ comp.typeAsFactory(type) }, type: [${ ents.join(", ") }] }) public ${ field.name }: ${ tsType } `
    } else if (type instanceof Type_Ref) {
        if (type.referenced instanceof Entity) {
            res = `@Field({ map: ${ comp.typeAsFactory(type) }, type: [${ ents.join(", ") }] }) public ${ field.name }: ${ tsType } `
        } else {
            return createFieldCode(comp, field, type.referenced)
        }
    } else if (type instanceof Type_Tuple) {
        res = `@Field({ map: ${ comp.typeAsFactory(type) }, type: [${ ents.join(", ") }] }) public ${ field.name }: ${ tsType } `
    }
    */

    return `    ${res} `
}


function getEntitiesFromType(type: Type, ents: Entity[] = []): Entity[] {
    if (type instanceof Type_List) {
        return getEntitiesFromType(type.itemType, ents)
    } else if (type instanceof Type_Mapping) {
        return getEntitiesFromType(type.itemType, ents)
    } else if (type instanceof Type_Native) {
        return ents
    } else if (type instanceof Type_Polymorph) {
        for (const map of type.mapping) {
            getEntitiesFromType(map.type, ents)
        }
        return ents
    } else if (type instanceof Type_Ref) {
        if (type.referenced instanceof Entity) {
            if (type.referenced.polymorph) {
                return getEntitiesFromType(type.referenced.polymorph, ents)
            } else {
                ents.push(type.referenced)
            }
        } else {
            return getEntitiesFromType(type.referenced, ents)
        }
    } else if (type instanceof Type_Tuple) {
        for (const item of type.items) {
            getEntitiesFromType(item, ents)
        }
    }

    return ents
}
