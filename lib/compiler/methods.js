"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../schema");
function createMethods(comp) {
    const groupByNs = groupMethods(comp.doc.methods);
    let res = [];
    for (const k in groupByNs) {
        let isExtension = false;
        for (const ent of Object.values(comp.doc.entities)) {
            const qname = schema_1.Entity.qname(ent);
            if (isExtension = (qname.tln === k)) {
                break;
            }
        }
        if (isExtension) {
            res.push(createExtension(comp, k, groupByNs[k]));
        }
        else if (k) {
            res.push(createMethodsCls(comp, k, groupByNs[k]));
        }
        else {
        }
    }
    return res;
}
exports.createMethods = createMethods;
function groupMethods(methods) {
    let group = {};
    for (const met of Object.values(methods)) {
        const ns = met.name.ns ? met.name.ns : "";
        if (!group[ns]) {
            group[ns] = {};
        }
        group[ns][met.name.name] = met;
    }
    let res = {};
    for (const k of Object.keys(group).sort((a, b) => a.localeCompare(b))) {
        res[k] = Object.values(group[k]);
    }
    return res;
}
exports.groupMethods = groupMethods;
function createMethodsCls(comp, name, methods) {
    let rendered = comp.newBlock(new schema_1.QName(comp.doc.path, "/methods/", name));
    let dataSource = createDataSource(comp, name, methods);
    let requirements = [];
    let res = `export class ${name} extends HTTPClient__ {\n`;
    // if (dataSource) {
    //     res += `    public static readonly SOURCE = new InjectionToken<RpcDataSource__<any, ${name}>>("${name}.SOURCE")\n\n`
    // }
    for (const met of methods) {
        let map = comp.typeAsFactory(met.returns.type);
        let options = "";
        if (map) {
            options = `, { map: ${map} }`;
        }
        res += [
            `    @Method__(${JSON.stringify(met.name.fullName)}${options})`,
            `    public readonly ${met.name.name}: ${getMethodAsType(comp, requirements, met)}`
        ].join("\n") + "\n";
    }
    if (requirements.length) {
        res = requirements.join("\n") + "\n\n" + res;
    }
    rendered.content = res + "}" + (dataSource ? `\n\n${dataSource}` : "");
    return rendered;
}
const SOURCE_METHODS = ["search", "get", "save", "remove", "position"];
function hasDataSource(methods) {
    let found;
    for (const req of SOURCE_METHODS) {
        found = false;
        for (const met of methods) {
            if (met.name.name === req) {
                found = true;
                break;
            }
        }
        if (!found) {
            return false;
        }
    }
    return true;
}
exports.hasDataSource = hasDataSource;
function createDataSource(comp, name, methods) {
    if (hasDataSource(methods)) {
        return [
            `export class ${name}Source extends RpcDataSource__<any, ${name}> {`,
            `    public constructor(@Inject(${name}) backend: ${name}) {`,
            `        super(backend)`,
            `    }`,
            `}`
        ].join("\n");
        return `export const ${name}_SOURCE_FACTORY: FactoryProvider = `
            + `{ provide: ${name}.SOURCE, useFactory: (backend: ${name}) => new RpcDataSource__(backend), deps: [${name}] }`;
    }
    else {
        return null;
    }
}
function createExtension(comp, name, methods) {
    let rendered = comp.newBlock(new schema_1.QName(comp.doc.path, "/methods/", name));
    let requirements = [];
    let res = `export namespace ${name} {\n`;
    for (const met of methods) {
        res += [
            `    export function ${met.name.name}${getMethodAsType(comp, requirements, met, ":")} {`,
            `        return this[RPC_CLIENT].call(${JSON.stringify(met.name.fullName)}, ...arguments) as any`,
            `    }`
        ].join("\n") + "\n";
    }
    if (requirements.length) {
        res = requirements.join("\n") + "\n\n" + res;
    }
    res += `}`;
    rendered.content = res;
    return rendered;
}
function getMethodAsType(comp, requirements, met, rs = " =>") {
    let params = [];
    for (const name in met.params) {
        const param = met.params[name];
        if (param.type instanceof schema_1.Type_Optional) {
            params.push(`${name}?: ${comp.typeAsTs(param.type.itemType)}`);
        }
        else {
            params.push(`${name}: ${comp.typeAsTs(param.type)}`);
        }
    }
    if (params.length) {
        let safeName = met.name.fullName.replace(/\./, "_");
        requirements.push([
            `export interface ${safeName}_Params {`,
            `\t` + params.join("\n\t"),
            `}`
        ].join("\n"));
        return `(params: ${safeName}_Params)${rs} Observable<${comp.typeAsTs(met.returns.type)}>`;
    }
    else {
        return `()${rs} Observable<${comp.typeAsTs(met.returns.type)}>`;
    }
}
//# sourceMappingURL=methods.js.map