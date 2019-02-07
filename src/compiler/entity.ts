import {
    Entity, EntityField,
    Type, Type_List, Type_Mapping, Type_Native, Type_Polymorphic, Type_Ref, Type_Tuple
} from "../schema"
import { Compiler } from "./compiler"


/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */


export function createEntityCode(comp: Compiler, ent: Entity): string {
    let res = `class ${ent.name.name} extends Entity {\n`
    for (const f in ent.fields) {
        res += createFieldCode(comp, ent.fields[f]) + "\n"
    }
    res += `}`
    return res
}


function createFieldCode(comp: Compiler, field: EntityField, type?: Type): string {
    type = type || field.type
    let tsType = comp.typeAsTs(type)
    // let tsFactory = comp.typeAsFactory(type)
    let res

    if (type instanceof Type_List) {
        res = `@Field({ listOf: ${comp.typeAsFactory(type.itemType)} }) public ${field.name}: ${tsType}`
    } else if (type instanceof Type_Mapping) {
        res = `@Field({ mapOf: ${comp.typeAsFactory(type.itemType)} }) public ${field.name}: ${tsType}`
    } else if (type instanceof Type_Native) {
        res = `@Field() public ${field.name}: ${tsType}`
    } else if (type instanceof Type_Polymorphic) {
        res = `@Field({ map: ${comp.typeAsFactory(type)} }) public ${field.name}: ${tsType}`
    } else if (type instanceof Type_Ref) {
        if (type.referenced instanceof Entity) {
            res = `@Field() public ${field.name}: ${tsType}`
        } else {
            return createFieldCode(comp, field, type.referenced)
        }
    } else if (type instanceof Type_Tuple) {
        res = `@Field({ map: ${comp.typeAsFactory(type)} }) public ${field.name}: ${tsType}`
    }

    return `    ${res}`
}
