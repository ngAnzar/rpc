import * as path from "path"

import { registry } from "../schema"
import { Compiler } from "./compiler"
import { TypeFactory } from "./type-factory"


export interface CompileOptions {
    outPath: string
}


export class CompileSession {
    public constructor(public readonly options: CompileOptions) {

    }
}



export function compile(files: string[], options: CompileOptions) {
    const session = new CompileSession(options)

    for (const file of files) {
        const doc = registry.get(file)
        const comp = new Compiler(doc)
        comp.emit(path.join(session.options.outPath, doc.module.parent, doc.module.name) + ".ts")
    }

    TypeFactory.emit(path.join(session.options.outPath, TypeFactory.name) + ".ts")
}
