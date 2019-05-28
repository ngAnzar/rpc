import * as fs from "fs-extra"
import * as path from "path"

import { Compiler, renderBlockComment, RenderedBlock } from "./compiler"
import { TypeFactory } from "./type-factory"


export class FlatCompiler {
    protected compilers: Compiler[] = []
    protected blocks: { [key: string]: RenderedBlock } = {}
    protected commonImports: string = [
        `import { FactoryProvider, InjectionToken } from "@angular/core"`,
        `import { Observable } from "rxjs"`,
        `import { Entity as Entity__, Field as Field__, Method as Method__, HTTPClient as HTTPClient__, RpcDataSource as RpcDataSource__, StaticSource as StaticSource__ } from "@anzar/rpc"`
    ].join("\n")

    public constructor() {

    }

    public addCompiler(compiler: Compiler) {
        this.compilers.push(compiler)
        for (const rb of compiler.renderEntities()) {
            this.blocks[rb.qname] = rb
        }
        for (const rb of compiler.renderMethods()) {
            this.blocks[rb.qname] = rb
        }
        // console.log(this.blocks)
        // this.body.push(compiler.renderBody(`${compiler.doc.module.name} // `))
    }

    public emit(outPath: string) {
        fs.mkdirpSync(path.dirname(outPath))

        fs.writeFileSync(outPath,
            this.commonImports + "\n\n" +
            renderBlockComment("FACTORIES") +
            TypeFactory.renderBody() +
            this.orderedBlocks().map(b => b.content).join("\n\n"))
    }

    protected orderedBlocks(): RenderedBlock[] {
        let deps: string[] = []

        for (const k of Object.keys(this.blocks).sort()) {
            this.addToDeps(this.blocks[k], deps)
        }

        return deps.map(k => this.blocks[k])
    }

    protected addToDeps(block: RenderedBlock, res: string[]) {
        let idx = res.indexOf(block.qname)
        if (idx === -1) {
            idx = res.length
            res.push(block.qname)
        }

        for (let dep of block.deps) {
            if (res.indexOf(dep) === -1) {
                res.splice(idx, 0, dep)
                this.addToDeps(this.blocks[dep], res)
            }
        }
    }
}
