"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const schema_1 = require("../schema");
const type_factory_1 = require("./type-factory");
const entity_1 = require("./entity");
const methods_1 = require("./methods");
class Compiler {
    constructor(doc) {
        this.doc = doc;
        this.imports = {};
        this._factories = [];
        this._deps = [];
        this._tempVarIdx = 0;
    }
    get deps() { return this._deps; }
    emit(filePath, factoryPath) {
        fs.mkdirpSync(path.dirname(filePath));
        let entities = this.renderEntities();
        let methods = this.renderMethods();
        let content = this.renderImports(filePath, factoryPath)
            + "\n\n"
            + `/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/\n`
            + `/*                       ENTITIES                        */\n`
            + `/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/\n`
            + entities + "\n\n"
            + `/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/\n`
            + `/*                        METHODS                        */\n`
            + `/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/\n`
            + methods
            + "\n";
        fs.writeFileSync(filePath, content);
    }
    importType(type) {
        if (type instanceof schema_1.Type_List) {
            this.importType(type.itemType);
        }
        else if (type instanceof schema_1.Type_Mapping) {
            this.importType(type.itemType);
        }
        else if (type instanceof schema_1.Type_Native) {
            // pass...
        }
        else if (type instanceof schema_1.Type_Polymorphic) {
            for (const item of type.mapping) {
                this.importType(item.type);
            }
        }
        else if (type instanceof schema_1.Type_Ref) {
            if (type.referenced instanceof schema_1.Entity) {
                const ent = type.referenced;
                const qname = schema_1.Entity.qname(ent);
                this._getQNameLocalName(qname);
            }
            else {
                this.importType(type.referenced);
            }
        }
        else if (type instanceof schema_1.Type_Tuple) {
            for (const t of type.items) {
                this.importType(t);
            }
        }
        else {
            console.log("Unhandled type>>>", type);
            throw new Error("Unhandled type");
        }
    }
    _getUniqueImportName(qname) {
        let alias = qname.name;
        let i = 0;
        let uid = qname.uid;
        let ok = true;
        do {
            ok = true;
            for (const k in this.doc.entities) {
                const ent = this.doc.entities[k];
                if (schema_1.Entity.qname(ent).fullName === alias) {
                    ok = false;
                    break;
                }
            }
            for (const k in this.doc.methods) {
                const met = this.doc.methods[k];
                if (met.name.tln === alias) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                for (const k in this.imports) {
                    if (k === uid) {
                        continue;
                    }
                    else if (this.imports[k].alias === alias) {
                        ok = false;
                        break;
                    }
                }
            }
            if (!ok) {
                alias = `${alias}_${i++}`;
            }
        } while (!ok);
        return alias;
    }
    typeAsTs(type) {
        this.importType(type);
        if (type instanceof schema_1.Type_List) {
            return `Array<${this.typeAsTs(type.itemType)}>`;
        }
        else if (type instanceof schema_1.Type_Mapping) {
            return `{ [key: string]: ${this.typeAsTs(type.itemType)} }`;
        }
        else if (type instanceof schema_1.Type_Native) {
            switch (type.name) {
                case "string": return "string";
                case "boolean": return "boolean";
                case "integer": return "number";
                case "null": return "null";
                case "number": return "number";
                case "date": return "Date";
                case "datetime": return "Date";
            }
            throw new Error("Unhandled native type");
        }
        else if (type instanceof schema_1.Type_Ref) {
            if (type.referenced instanceof schema_1.Entity) {
                return this.getEntityName(type.referenced);
            }
            else {
                return this.typeAsTs(type.referenced);
            }
        }
        else if (type instanceof schema_1.Type_Tuple) {
            return `[${type.items.map(v => this.typeAsTs(v)).join(", ")}]`;
        }
        else if (type instanceof schema_1.Type_Polymorphic) {
            return type.mapping.map(v => {
                let id = {};
                v.id.fields.forEach((field, i) => {
                    id[field] = v.id.values[i];
                });
                return `(${this.typeAsTs(v.type)} & ${JSON.stringify(id)})`;
            }).join(" | ");
        }
        throw new Error("Ungandled type");
    }
    typeAsFactory(type) {
        const name = type_factory_1.TypeFactory.get(this, type);
        if (name.startsWith(type_factory_1.TypeFactory.name) && this._factories.indexOf(name) === -1) {
            this._factories.push(name);
        }
        return name;
    }
    getEntityName(ent) {
        return this._getQNameLocalName(schema_1.Entity.qname(ent));
    }
    _getQNameLocalName(qname) {
        let exists = Object.values(this.doc.entities)
            .filter(v => schema_1.Entity.qname(v).uid === qname.uid);
        if (exists.length === 0) {
            const alias = this._getUniqueImportName(qname);
            this.imports[qname.uid] = { qname, alias };
            return alias;
        }
        else {
            return qname.name;
        }
    }
    _tempVar() {
        return `anzar_temp_${this._tempVarIdx++}`;
    }
    renderEntities() {
        return Object.values(this.doc.entities).map(ent => {
            return entity_1.createEntityCode(this, ent);
        }).join("\n\n\n");
    }
    renderMethods() {
        return methods_1.createMethods(this);
    }
    renderImports(selfPath, factoryPath) {
        let selfModuleParts = this.doc.module.parent.split("/");
        function determineFrom(other) {
            let otherModuleParts = other.document.module.parent.split("/");
            let i = 0, l = selfModuleParts.length;
            for (; i < l; i++) {
                if (selfModuleParts[i] !== otherModuleParts[i]) {
                    if (i === 0) {
                        return other.document.module.parent + "/" + other.document.module.name;
                    }
                }
            }
            let relDepth = Math.max(0, selfModuleParts.length - otherModuleParts.length);
            let rel = relDepth
                ? "../".repeat(selfModuleParts.length - otherModuleParts.length)
                : "./";
            return rel + otherModuleParts.slice(i).join("/") + other.document.module.name;
        }
        let groupByModule = {};
        for (const imp of Object.values(this.imports)) {
            const importFrom = determineFrom(imp.qname);
            if (!groupByModule[importFrom]) {
                groupByModule[importFrom] = [];
            }
            let idx = this._deps.indexOf(imp.qname.file);
            if (idx === -1) {
                this._deps.push(imp.qname.file);
            }
            groupByModule[importFrom].push({ fname: imp.qname.fullName.split("."), alias: imp.alias });
        }
        let res = [
            `import { Observable } from "rxjs"`,
            `import { Entity, Field, Method, RPC_CLIENT } from "@anzar/rpc"`
        ];
        for (const impFrom in groupByModule) {
            let imps = [];
            let convs = [];
            for (const imp of groupByModule[impFrom]) {
                if (imp.fname.length > 1 || imp.fname[0] !== imp.alias) {
                    if (imp.fname.length === 1) {
                        imps.push(`${imp.fname[0]} as ${imp.alias}`);
                    }
                    else {
                        imps.push(imp.fname[0]);
                        convs.push(`const ${imp.alias} = ${imp.fname.join(".")}`);
                    }
                }
                else {
                    imps.push(imp.alias);
                }
            }
            res.push(`import { ${imps.join(", ")} } from "${impFrom}"`);
            if (convs.length) {
                res = res.concat(convs);
            }
        }
        if (this._factories.length > 0) {
            let fac = path.relative(path.dirname(selfPath), factoryPath)
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/");
            res.push(`import { ${this._factories.join(", ")} } from "${fac}"`);
        }
        return res.join("\n");
    }
}
exports.Compiler = Compiler;
//# sourceMappingURL=compiler.js.map