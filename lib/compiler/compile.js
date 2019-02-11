"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const schema_1 = require("../schema");
const compiler_1 = require("./compiler");
const type_factory_1 = require("./type-factory");
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
    const factoryPath = path.join(session.helperPath, type_factory_1.TypeFactory.name) + ".ts";
    const emitted = {};
    while (files.length) {
        const file = files.shift();
        if (!emitted[file]) {
            emitted[file] = true;
            const doc = schema_1.registry.get(file);
            const comp = new compiler_1.Compiler(doc);
            doc.outPath = doc.outPath || (path.join(session.outPath, doc.module.parent, doc.module.name) + ".ts");
            comp.emit(doc.outPath, factoryPath);
            files = files.concat(comp.deps);
        }
    }
    type_factory_1.TypeFactory.emit(factoryPath);
}
exports.compile = compile;
//# sourceMappingURL=compile.js.map