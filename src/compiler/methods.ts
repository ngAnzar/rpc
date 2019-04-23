import { Compiler } from "./compiler"
import { Entity, Method } from "../schema"



export function createMethods(comp: Compiler) {
    let groupByNs = {}
    let res: string[] = []
    for (const met of Object.values(comp.doc.methods)) {
        const ns = met.name.ns ? met.name.ns : ""

        if (!groupByNs[met.name.ns]) {
            groupByNs[met.name.ns] = {}
        }

        groupByNs[met.name.ns][met.name.name] = met
    }

    for (const k of Object.keys(groupByNs).sort((a, b) => a.localeCompare(b))) {
        let isExtension = false
        for (const ent of Object.values(comp.doc.entities)) {
            const qname = Entity.qname(ent)
            if (isExtension = (qname.tln === k)) {
                break
            }
        }

        if (isExtension) {
            res.push(createExtension(comp, k, Object.values(groupByNs[k])))
        } else if (k) {
            res.push(createMethodsCls(comp, k, Object.values(groupByNs[k])))
        } else {

        }
    }

    return res.join("\n\n\n")
}


function createMethodsCls(comp: Compiler, name: string, methods: Method[]): string {
    let requirements: string[] = []
    let res = `export class ${name} extends HTTPClient__ {\n`

    //res += `    public constructor(@Inject(HTTPTransport) public readonly transport: Transport) { super() } \n\n`

    for (const met of methods) {
        res += [
            `    @Method__(${JSON.stringify(met.name.fullName)})`,
            `    public readonly ${met.name.name}: ${getMethodAsType(comp, requirements, met)}`
        ].join("\n") + "\n"
    }

    if (requirements.length) {
        res = requirements.join("\n") + "\n\n" + res
    }

    return res + "}"
}


function createExtension(comp: Compiler, name: string, methods: Method[]): string {
    let requirements: string[] = []
    let res = `export namespace ${name} {\n`

    for (const met of methods) {
        res += [
            `    export function ${met.name.name}${getMethodAsType(comp, requirements, met, ":")} {`,
            `        return this[RPC_CLIENT].call(${JSON.stringify(met.name.fullName)}, ...arguments) as any`,
            `    }`
        ].join("\n") + "\n"
    }

    if (requirements.length) {
        res = requirements.join("\n") + "\n\n" + res
    }

    return res + `}`
}


function getMethodAsType(comp: Compiler, requirements: string[], met: Method, rs: string = " =>"): string {
    let params: string[] = []

    for (const name in met.params) {
        const param = met.params[name]
        const optional = param.optional ? "?" : ""
        params.push(`${name}${optional}: ${comp.typeAsTs(param.type)}`)
    }

    if (params.length) {
        let safeName = met.name.fullName.replace(/\./, "_")
        requirements.push([
            `export interface ${safeName}_Params {`,
            `\t` + params.join("\n\t"),
            `}`
        ].join("\n"))

        return `(params: ${safeName}_Params)${rs} Observable<${comp.typeAsTs(met.returns.type)}>`
    } else {
        return `()${rs} Observable<${comp.typeAsTs(met.returns.type)}>`
    }
}
