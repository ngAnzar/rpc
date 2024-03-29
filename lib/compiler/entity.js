"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityCode = void 0;
const schema_1 = require("../schema");
/**
 * class User extends Entity {
 *      @Field({}) public fieldName: type
 * }
 */
function createEntityCode(comp, ent) {
    let rendered = comp.newBlock(schema_1.Entity.qname(ent));
    let res = `export class ${schema_1.Entity.qname(ent).name} extends Entity__ {\n`;
    const fields = ent.fields;
    const decorators = [];
    for (const f in fields) {
        const [property, decorator] = createFieldCode(comp, ent, fields[f]);
        decorators.push("    " + decorator);
        res += `    ${property}\n`;
    }
    // res += `    public static readonly CLASS = new InjectionToken("${Entity.qname(ent).name}Class")\n`
    // res += `    public static readonly PROVIDER: FactoryProvider = { provide: ${Entity.qname(ent).name}.CLASS, useFactory: ${Entity.qname(ent).name}.factory, deps: [HTTPClient__] }\n`
    if (ent.polymorphId) {
        res += `    public static readonly POLYMORPH_ID = ${JSON.stringify(ent.polymorphId)}\n`;
    }
    let staticData = schema_1.Entity.data(ent);
    if (staticData) {
        res += `    public static readonly DATA: StaticSource__<${schema_1.Entity.qname(ent).name}>\n`;
    }
    res += `}\n`;
    res += `initEntity__(${schema_1.Entity.qname(ent).name}, {\n`;
    res += decorators.join(",\n");
    res += `\n});\n`;
    if (staticData) {
        res += `(${schema_1.Entity.qname(ent).name} as any).DATA = new StaticSource__(${schema_1.Entity.qname(ent).name}, ${JSON.stringify(staticData.items)} as any)\n`;
    }
    rendered.content = res;
    return rendered;
}
exports.createEntityCode = createEntityCode;
function createFieldCode(comp, ent, field, type) {
    type = type || field.type;
    if (type instanceof schema_1.Type_Ref) {
        if (type.referenced instanceof schema_1.Type) {
            return createFieldCode(comp, ent, field, type.referenced);
        }
    }
    let tsType = comp.typeAsTs(type);
    let map = comp.typeAsFactory(type);
    let opts = [];
    if (map) {
        opts.push(`map: ${map}`);
    }
    if (ent.primaryKey && ent.primaryKey.indexOf(field.name) !== -1) {
        opts.push(`primary: true`);
    }
    return [
        `public ${field.name}: ${tsType}`,
        `"${field.name}": { ${opts.join(', ')} }`
    ];
}
function __createFieldCode(comp, ent, field, type) {
    type = type || field.type;
    if (type instanceof schema_1.Type_Ref) {
        if (type.referenced instanceof schema_1.Type) {
            return __createFieldCode(comp, ent, field, type.referenced);
        }
    }
    let tsType = comp.typeAsTs(type);
    let ents = getEntitiesFromType(type).map(v => comp.getEntityName(v));
    let tArray = ents.length ? `[${ents.join(", ")}]` : null;
    let map = comp.typeAsFactory(type);
    let opts = [];
    // if (tArray && map) {
    //     opts.push(`map: ${map}`)
    //     opts.push(`type: ${tArray}`)
    // } else if (tArray) {
    //     opts.push(`type: ${tArray}`)
    // } else if (map) {
    //     opts.push(`map: ${map}`)
    // }
    if (map) {
        opts.push(`map: ${map}`);
    }
    if (ent.primaryKey.indexOf(field.name) !== -1) {
        opts.push(`primary: true`);
    }
    return `    @Field__({ ${opts.join(', ')} }) public ${field.name}: ${tsType}`;
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