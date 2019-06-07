"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const compiler_1 = require("./compiler");
const type_factory_1 = require("./type-factory");
class FlatCompiler {
    constructor() {
        this.compilers = [];
        this.blocks = {};
        this.commonImports = [
            `import { FactoryProvider, InjectionToken, Inject } from "@angular/core"`,
            `import { Observable } from "rxjs"`,
            `import { Entity as Entity__, Field as Field__, Method as Method__, HTTPClient as HTTPClient__, RpcDataSource as RpcDataSource__, StaticSource as StaticSource__ } from "@anzar/rpc"`
        ].join("\n");
    }
    addCompiler(compiler) {
        this.compilers.push(compiler);
        for (const rb of compiler.renderEntities()) {
            this.blocks[rb.qname] = rb;
        }
        for (const rb of compiler.renderMethods()) {
            this.blocks[rb.qname] = rb;
        }
        // console.log(this.blocks)
        // this.body.push(compiler.renderBody(`${compiler.doc.module.name} // `))
    }
    emit(outPath) {
        fs.mkdirpSync(path.dirname(outPath));
        fs.writeFileSync(outPath, this.commonImports + "\n\n" +
            compiler_1.renderBlockComment("FACTORIES") +
            type_factory_1.TypeFactory.renderBody() +
            this.orderedBlocks().map(b => b.content).join("\n\n"));
    }
    orderedBlocks() {
        let deps = [];
        for (const k of Object.keys(this.blocks).sort()) {
            this.addToDeps(this.blocks[k], deps);
        }
        return deps.map(k => this.blocks[k]);
    }
    addToDeps(block, res) {
        let idx = res.indexOf(block.qname);
        if (idx === -1) {
            idx = res.length;
            res.push(block.qname);
        }
        for (let dep of block.deps) {
            if (res.indexOf(dep) === -1) {
                res.splice(idx, 0, dep);
                this.addToDeps(this.blocks[dep], res);
            }
        }
    }
}
exports.FlatCompiler = FlatCompiler;
//# sourceMappingURL=flat_compiler.js.map