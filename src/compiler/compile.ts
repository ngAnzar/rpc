import * as path from "path"

import { registry } from "../schema"
import { Compiler } from "./compiler"
import { TypeFactory } from "./type-factory"
import { createModule } from "./module"


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
    const factoryPath = path.join(session.helperPath, TypeFactory.name) + ".ts"
    const emitted: { [key: string]: any } = {}
    const documentsByModule: { [key: string]: any } = {}
    const depsByModule: string[] = []

    while (files.length) {
        const file = files.shift() as string

        if (!emitted[file]) {
            emitted[file] = true

            const doc = registry.get(file)
            const comp = new Compiler(doc)
            doc.outPath = doc.outPath || (path.join(session.outPath, doc.module.parent, doc.module.name) + ".ts")
            comp.emit(doc.outPath, factoryPath)

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

    for (const k in documentsByModule) {
        const indexFile = path.join(session.outPath, k, "index.ts")
        const deps = depsByModule[k]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(v => registry.get(v).outPath)
        createModule(indexFile, Object.values(documentsByModule[k]), deps)
    }

    TypeFactory.emit(factoryPath)
}
