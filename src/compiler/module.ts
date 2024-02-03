import fs = require("fs")
import path = require("path")
import { Entity, Document } from "../schema"
import { groupMethods, hasDataSource } from "./methods"





export function createModule(outPath: string, documents: Document[], deps: string[], generatedModule: string) {
    const code = createModuleCode(outPath, documents, deps, generatedModule)
    if (code) {
        fs.writeFileSync(outPath, code)
    }
}


function createModuleCode(outPath: string, documents: Document[], deps: string[], generatedModule: string): string | null {
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

    let generatedImportPth = path.relative(path.dirname(outPath), generatedModule)
        .replace(/\.[tj]s$/, "")
        .replace(/[\\\/]+/g, "/")
    if (!generatedImportPth.startsWith(".")) {
        generatedImportPth = "./" + generatedImportPth
    }

    for (const doc of documents) {
        let e = getDocumentExports(doc)
        let methods = groupMethods(doc.methods)

        for (const k in methods) {
            if (hasDataSource(methods[k])) {
                provides.push(`${k}Source`)
                // imports.push(`import { ${k}Source } from "${generatedImportPth}"`)
                e.push(`${k}Source`)
            }
        }

        imports.push(`import { ${e.join(", ")} } from "${generatedImportPth}"`)
        exports_ = exports_.concat(e)

        let pEnt = Object.values(doc.entities).map(v => Entity.qname(v).tln)
        provides = provides
            // .concat(Object.values(doc.entities).map(v => `${Entity.qname(v).fullName}.PROVIDER`))
            .concat(Object.keys(methods).filter(v => pEnt.indexOf(v) === -1))
    }

    exports_ = exports_.filter((v, i, a) => a.indexOf(v) === i)
    provides = provides.filter((v, i, a) => a.indexOf(v) === i)

    if (provides.length === 0 && exports_.length === 0) {
        return null
    }

    let moduleName = getModuleName(outPath)
    let lItemSep = "\n        "
    let mImports = refdModules.length ? `    imports: [${lItemSep}${refdModules.join(`,${lItemSep}`)}\n    ],\n` : ""
    let mProvides = provides.length > 0
        ? `    providers: [${lItemSep}${provides.join(`,${lItemSep}`)}\n    ],\n`
        : ""
    let module = [
        `@NgModule({\n${mImports}${mProvides}})`,
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
    const parts = path.basename(outPath).split(".")
    parts.pop()
    return parts.map(v => `${v.charAt(0).toUpperCase()}${v.slice(1)}`).join('')
}
