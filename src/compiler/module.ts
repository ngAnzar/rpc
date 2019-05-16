import fs = require("fs")
import path = require("path")
import { Entity, Document } from "../schema";
import { groupMethods, hasDataSource } from "./methods"





export function createModule(outPath: string, documents: Document[], deps: string[]) {
    fs.writeFileSync(outPath, createModuleCode(outPath, documents, deps))
}


function createModuleCode(outPath: string, documents: Document[], deps: string[]): string {
    let imports = [
        `import { NgModule } from "@angular/core"`
    ]
    let exports_: string[] = []
    let provides: string[] = []
    let refdModules: string[] = []

    imports = imports.concat(deps.map(v => {
        let pth = path.relative(path.dirname(outPath), path.dirname(v))
            .replace(/\.[tj]s$/, "")
            .replace(/[\\\/]+/g, "/")
        if (!pth.startsWith(".")) {
            pth = "./" + pth
        }

        let name = getModuleName(v)
        refdModules.push(name)
        return `import { ${name} } from "${pth}"  // dependency`
    }))

    for (const doc of documents) {
        let e = getDocumentExports(doc)
        let methods = groupMethods(doc.methods)

        for (const k in methods) {
            if (hasDataSource(methods[k])) {
                provides.push(`${k}_SOURCE_FACTORY`)
                imports.push(`import { ${k}_SOURCE_FACTORY } from "./${doc.module.name}"  // relative`)
            }
        }

        imports.push(`import { ${e.join(", ")} } from "./${doc.module.name}"  // relative`)
        exports_ = exports_.concat(e)

        let pEnt = Object.values(doc.entities).map(v => Entity.qname(v).tln)
        provides = provides
            .concat(Object.values(doc.entities).map(v => `${Entity.qname(v).fullName}.PROVIDER`))
            .concat(Object.keys(methods).filter(v => pEnt.indexOf(v) === -1))
    }

    exports_ = exports_.filter((v, i, a) => a.indexOf(v) === i)
    provides = provides.filter((v, i, a) => a.indexOf(v) === i)

    let moduleName = getModuleName(outPath)
    let lItemSep = "\n        "
    let mImports = refdModules.length ? `    imports: [${lItemSep}${refdModules.join(`,${lItemSep}`)}\n    ],\n` : ""
    let module = [
        `@NgModule({\n${mImports}    providers: [${lItemSep}${provides.join(`,${lItemSep}`)}\n    ]\n})`,
        `export class ${moduleName} {}`
    ]

    return imports.join("\n")
        + "\n\n"
        + `export { ${exports_.join(", ")} }`
        + "\n\n\n"
        + module.join("\n")
}


function getDocumentExports(doc: Document): string[] {
    return Object.values(doc.entities).map(v => Entity.qname(v).tln)
        .concat(Object.values(doc.methods).map(v => v.name.tln))
        .filter((v, i, a) => a.indexOf(v) === i)
}


function getModuleName(outPath: string): string {
    let name = path.basename(path.dirname(outPath))
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}Module`
}
