"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../schema");
function createMethods(comp) {
    let groupByNs = {};
    let res = [];
    for (const met of Object.values(comp.doc.methods)) {
        const ns = met.name.ns ? met.name.ns : "";
        if (!groupByNs[met.name.ns]) {
            groupByNs[met.name.ns] = {};
        }
        groupByNs[met.name.ns][met.name.name] = met;
    }
    for (const k of Object.keys(groupByNs).sort((a, b) => a.localeCompare(b))) {
        let isExtension = false;
        for (const ent of Object.values(comp.doc.entities)) {
            const qname = schema_1.Entity.qname(ent);
            if (isExtension = (qname.tln === k)) {
                break;
            }
        }
        if (isExtension) {
            res.push(createExtension(comp, k, Object.values(groupByNs[k])));
        }
        else if (k) {
            res.push(createMethodsCls(comp, k, Object.values(groupByNs[k])));
        }
        else {
        }
    }
    return res.join("\n\n\n");
}
exports.createMethods = createMethods;
function createMethodsCls(comp, name, methods) {
    let requirements = [];
    let res = `export class ${name} extends HTTPClient__ {\n`;
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
    return res + "}";
}
function createExtension(comp, name, methods) {
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
    return res + `}`;
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