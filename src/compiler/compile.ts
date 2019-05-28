import * as path from "path"

import { registry } from "../schema"
import { Compiler } from "./compiler"
import { TypeFactory } from "./type-factory"
import { createModule } from "./module"
import { FlatCompiler } from "./flat_compiler"


export interface CompileOptions {
    outPath: string,
    helperPath?: string
}


export class CompileSession {
    public readonly outPath: string
    public readonly helperPath: string

    public constructor(public readonly options: CompileOptions) {
        this.outPath = path.resolve(options.outPath)
        this.helperPath = options.helperPath ? path.resolve(options.helperPath) : this.outPath
    }
}



export function compile(files: string[], options: CompileOptions) {
    const session = new CompileSession(options)
    const outputPath = path.join(session.helperPath, "__anzar_rpc_output.ts")
    const emitted: { [key: string]: any } = {}
    const documentsByModule: { [key: string]: any } = {}
    const depsByModule: string[] = []
    const flatCompiler = new FlatCompiler()

    while (files.length) {
        const file = files.shift() as string
        const doc = registry.get(file)
        const comp = new Compiler(doc)
        doc.outPath = path.normalize(doc.outPath || (path.join(session.outPath, doc.module.parent, doc.module.name) + ".ts"))

        if (!emitted[doc.outPath]) {
            emitted[doc.outPath] = true

            // comp.emit(doc.outPath, factoryPath)
            flatCompiler.addCompiler(comp)

            files = files.concat(comp.deps)
            if (!documentsByModule[doc.module.parent]) {
                documentsByModule[doc.module.parent] = []
            }
            documentsByModule[doc.module.parent].push(doc)

            if (!depsByModule[doc.module.parent]) {
                depsByModule[doc.module.parent] = []
            }
            depsByModule[doc.module.parent] = depsByModule[doc.module.parent].concat(comp.deps)
        }
    }

    flatCompiler.emit(outputPath)

    for (const k in documentsByModule) {
        const indexFile = path.join(session.outPath, `${k}.api.ts`)
        const deps = depsByModule[k]
            .map(v => `${session.outPath}/${v.module.parent}.api.ts`)
            .filter((v, i, a) => a.indexOf(v) === i)
        createModule(indexFile, Object.values(documentsByModule[k]), deps, outputPath)
    }

    // TypeFactory.emit(factoryPath)
}
