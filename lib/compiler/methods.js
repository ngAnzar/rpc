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
    let res = `export class ${name} extends Client__ {\n`;
    res += `    public constructor(@Inject(HTTPTransport) public readonly transport: Transport) { super() } \n\n`;
    for (const met of methods) {
        res += [
            `    @Method__(${JSON.stringify(met.name.fullName)})`,
            `    public readonly ${met.name.name}: ${getMethodAsType(comp, met)}`
        ].join("\n") + "\n";
    }
    return res + "}";
}
function createExtension(comp, name, methods) {
    let res = `export namespace ${name} {\n`;
    for (const met of methods) {
        res += [
            `    export function ${met.name.name}${getMethodAsType(comp, met, ":")} {`,
            `        return this[RPC_CLIENT].call(${JSON.stringify(met.name.fullName)}, ...arguments) as any`,
            `    }`
        ].join("\n") + "\n";
    }
    return res + `}`;
}
function getMethodAsType(comp, met, rs = " =>") {
    let callType = [];
    for (const p of met.params) {
        callType.push(`${p.name}: ${comp.typeAsTs(p.type)}`);
    }
    return `(${callType.join(", ")})${rs} Observable<${comp.typeAsTs(met.returns.type)}>`;
}
function createMethodFunction() {
}
//# sourceMappingURL=methods.js.map