import fs = require("fs")
import path = require("path")
import { Entity, Document } from "../schema";





export function createModule(outPath: string, documents: Document[], deps: string[]) {
    fs.writeFileSync(outPath, createModuleCode(outPath, documents, deps))


    // let tls = Object.values(doc.entities).map(v => Entity.qname(v).tln)
    //     .concat(Object.values(comp.doc.methods).map(v => v.name.tln))
    //     .filter((v, i, a) => a.indexOf(v) === i)

    // let provieds = Object.values(comp.doc.entities).map(v => `${Entity.qname(v).tln}.PROVIDE`)

    // let res = [
    //     `import { Module } from "@angular/core"`,
    //     //`import { CommonModule } from "@angular/common"`,
    //     `import { HttpClientModule } from "@angular/common/http"\n`,
    //     `import { ${tls.join(", ")} } from "./${comp.doc.module.name}"`,
    //     `export { ${tls.join(", ")} }\n\n`,
    //     `@Module({ imports: [HttpClientModule], providers: [${provieds.join(", ")}] })`,
    //     `export class ${comp.doc.module.name}Module {}`
    // ]

    // return res.join("\n")
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
        imports.push(`import { ${e.join(", ")} } from "./${doc.module.name}"  // relative`)
        exports_ = exports_.concat(e)

        let pEnt = Object.values(doc.entities).map(v => Entity.qname(v).tln)
        provides = provides
            .concat(Object.values(doc.entities).map(v => `${Entity.qname(v).fullName}.PROVIDER`))
            .concat(Object.values(doc.methods).filter(v => pEnt.indexOf(v.name.tln) === -1).map(v => v.name.tln))
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
