"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createModuleCode(documents) {
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
    return "";
}
exports.createModuleCode = createModuleCode;
function flatUnique(arr) {
    let res = [];
    for (const a of arr) {
        res = res.concat(a);
    }
    return res.filter((v, i, a) => a.indexOf(v) === i);
}
//# sourceMappingURL=module.js.map