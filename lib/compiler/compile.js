"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const schema_1 = require("../schema");
const compiler_1 = require("./compiler");
const module_1 = require("./module");
const flat_compiler_1 = require("./flat_compiler");
class CompileSession {
    constructor(options) {
        this.options = options;
        this.outPath = path.resolve(options.outPath);
        this.helperPath = options.helperPath ? path.resolve(options.helperPath) : this.outPath;
    }
}
exports.CompileSession = CompileSession;
function compile(files, options) {
    const session = new CompileSession(options);
    const outputPath = path.join(session.helperPath, "__anzar_rpc_output.ts");
    const emitted = {};
    const documentsByModule = {};
    const depsByModule = [];
    const flatCompiler = new flat_compiler_1.FlatCompiler();
    while (files.length) {
        const file = files.shift();
        const doc = schema_1.registry.get(file);
        const comp = new compiler_1.Compiler(doc);
        doc.outPath = path.normalize(doc.outPath || (path.join(session.outPath, doc.module.parent, doc.module.name) + ".ts"));
        if (!emitted[doc.outPath]) {
            emitted[doc.outPath] = true;
            // comp.emit(doc.outPath, factoryPath)
            flatCompiler.addCompiler(comp);
            files = files.concat(comp.deps);
            if (!documentsByModule[doc.module.parent]) {
                documentsByModule[doc.module.parent] = [];
            }
            documentsByModule[doc.module.parent].push(doc);
            if (!depsByModule[doc.module.parent]) {
                depsByModule[doc.module.parent] = [];
            }
            depsByModule[doc.module.parent] = depsByModule[doc.module.parent].concat(comp.deps);
        }
    }
    flatCompiler.emit(outputPath);
    for (const k in documentsByModule) {
        const indexFile = path.join(session.outPath, `${k}.api.ts`);
        const deps = depsByModule[k]
            .map(v => `${session.outPath}/${v.module.parent}.api.ts`)
            .filter((v, i, a) => a.indexOf(v) === i);
        module_1.createModule(indexFile, Object.values(documentsByModule[k]), deps, outputPath);
    }
    // TypeFactory.emit(factoryPath)
}
exports.compile = compile;
//# sourceMappingURL=compile.js.map