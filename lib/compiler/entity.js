"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../schema");
/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */
function createEntityCode(comp, ent) {
    let rendered = comp.newBlock(schema_1.Entity.qname(ent));
    let res = `export class ${schema_1.Entity.qname(ent).name} extends Entity__ {\n`;
    res += `    public static readonly CLASS = new InjectionToken("${schema_1.Entity.qname(ent).name}Class")\n`;
    res += `    public static readonly PROVIDER: FactoryProvider = { provide: ${schema_1.Entity.qname(ent).name}.CLASS, useFactory: ${schema_1.Entity.qname(ent).name}.factory, deps: [HTTPClient__] }\n`;
    let staticData = schema_1.Entity.data(ent);
    if (staticData) {
        res += `    public static readonly DATA: StaticSource__<${schema_1.Entity.qname(ent).name}> = new StaticSource__(${schema_1.Entity.qname(ent).name}, ${JSON.stringify(staticData.items)} as any)\n`;
    }
    const fields = ent.fields;
    for (const f in fields) {
        res += createFieldCode(comp, fields[f]) + "\n";
    }
    res += `}\n`;
    rendered.content = res;
    return rendered;
}
exports.createEntityCode = createEntityCode;
function createFieldCode(comp, field, type) {
    type = type || field.type;
    if (type instanceof schema_1.Type_Ref) {
        if (type.referenced instanceof schema_1.Type) {
            return createFieldCode(comp, field, type.referenced);
        }
    }
    let tsType = comp.typeAsTs(type);
    // let tsFactory = comp.typeAsFactory(type)
    let res = "    ";
    let ents = getEntitiesFromType(type).map(v => comp.getEntityName(v));
    let tArray = ents.length ? `[${ents.join(", ")}]` : null;
    let map = comp.typeAsFactory(type);
    res += `@Field__({`;
    if (tArray && map) {
        res += ` map: ${map}, type: ${tArray} `;
    }
    else if (tArray) {
        res += ` type: ${tArray} `;
    }
    else if (map) {
        res += ` map: ${map} `;
    }
    return res + `}) public ${field.name}: ${tsType}`;
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
    return `    ${res} `;
}
function getEntitiesFromType(type, ents = []) {
    if (type instanceof schema_1.Type_List) {
        return getEntitiesFromType(type.itemType, ents);
    }
    else if (type instanceof schema_1.Type_Mapping) {
        return getEntitiesFromType(type.itemType, ents);
    }
    else if (type instanceof schema_1.Type_Native) {
        return ents;
    }
    else if (type instanceof schema_1.Type_Polymorph) {
        for (const map of type.mapping) {
            getEntitiesFromType(map.type, ents);
        }
        return ents;
    }
    else if (type instanceof schema_1.Type_Ref) {
        if (type.referenced instanceof schema_1.Entity) {
            if (type.referenced.polymorph) {
                return getEntitiesFromType(type.referenced.polymorph, ents);
            }
            else {
                ents.push(type.referenced);
            }
        }
        else {
            return getEntitiesFromType(type.referenced, ents);
        }
    }
    else if (type instanceof schema_1.Type_Tuple) {
        for (const item of type.items) {
            getEntitiesFromType(item, ents);
        }
    }
    return ents;
}
//# sourceMappingURL=entity.js.map