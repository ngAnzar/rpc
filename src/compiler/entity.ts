import {
    Entity, EntityField,
    Type, Type_List, Type_Mapping, Type_Native, Type_Polymorph, Type_Ref, Type_Tuple
} from "../schema"
import { Compiler, RenderedBlock } from "./compiler"


/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */


export function createEntityCode(comp: Compiler, ent: Entity): RenderedBlock {
    let rendered = comp.newBlock(Entity.qname(ent))

    let res = `export class ${Entity.qname(ent).name} extends Entity__ {\n`

    const fields = ent.fields
    for (const f in fields) {
        res += createFieldCode(comp, ent, fields[f]) + "\n"
    }

    res += `    public static readonly CLASS = new InjectionToken("${Entity.qname(ent).name}Class")\n`
    res += `    public static readonly PROVIDER: FactoryProvider = { provide: ${Entity.qname(ent).name}.CLASS, useFactory: ${Entity.qname(ent).name}.factory, deps: [HTTPClient__] }\n`

    let staticData = Entity.data(ent)
    if (staticData) {
        res += `    public static readonly DATA: StaticSource__<${Entity.qname(ent).name}>\n`
    }

    res += `}\n`

    if (staticData) {
        res += `(${Entity.qname(ent).name} as any).DATA = new StaticSource__(${Entity.qname(ent).name}, ${JSON.stringify(staticData.items)} as any)\n`
    }

    rendered.content = res
    return rendered
}


function createFieldCode(comp: Compiler, ent: Entity, field: EntityField, type?: Type): string {
    type = type || field.type

    if (type instanceof Type_Ref) {
        if (type.referenced instanceof Type) {
            return createFieldCode(comp, ent, field, type.referenced)
        }
    }

    let tsType = comp.typeAsTs(type)
    let ents = getEntitiesFromType(type).map(v => comp.getEntityName(v))
    let tArray = ents.length ? `[${ents.join(", ")}]` : null
    let map = comp.typeAsFactory(type)
    let opts: string[] = []

    if (tArray && map) {
        opts.push(`map: ${map}`)
        opts.push(`type: ${tArray}`)
    } else if (tArray) {
        opts.push(`type: ${tArray}`)
    } else if (map) {
        opts.push(`map: ${map}`)
    }

    if (ent.primaryKey.indexOf(field.name) !== -1) {
        opts.push(`primary: true`)
    }

    return `    @Field__({ ${opts.join(', ')} }) public ${field.name}: ${tsType}`
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
