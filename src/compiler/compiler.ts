import * as fs from "fs-extra"
import * as path from "path"

import {
    registry, Document, Entity, Module,
    Type, Type_List, Type_Mapping, Type_Native, Type_Polymorphic, Type_Ref, Type_Tuple, QName
} from "../schema"

import { TypeFactory } from "./type-factory"
import { createEntityCode } from "./entity"
import { createMethods } from "./methods"


export class Compiler {
    protected imports: { [key: string]: { qname: QName, alias: string } } = {}
    protected _factories: string[] = []
    protected _deps: string[] = []

    public constructor(public readonly doc: Document) {

    }

    public get deps() { return this._deps }

    public emit(filePath: string, factoryPath: string) {
        fs.mkdirpSync(path.dirname(filePath))

        let entities: string = this.renderEntities()
        let methods: string = this.renderMethods()
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
            + "\n"

        fs.writeFileSync(filePath, content)
    }

    public importType(type: Type) {
        if (type instanceof Type_List) {
            this.importType(type.itemType)
        } else if (type instanceof Type_Mapping) {
            this.importType(type.itemType)
        } else if (type instanceof Type_Native) {
            // pass...
        } else if (type instanceof Type_Polymorphic) {
            for (const item of type.mapping) {
                this.importType(item.type)
            }
        } else if (type instanceof Type_Ref) {
            if (type.referenced instanceof Entity) {
                const ent = type.referenced
                const qname = Entity.qname(ent)
                this._getQNameLocalName(qname)
            } else {
                this.importType(type.referenced)
            }
        } else if (type instanceof Type_Tuple) {
            for (const t of type.items) {
                this.importType(t)
            }
        } else {
            console.log("Unhandled type>>>", type)
            throw new Error("Unhandled type")
        }
    }

    protected _getUniqueImportName(qname: QName): string {
        let alias = qname.name
        let i = 0
        let uid = qname.uid
        let ok = true

        do {
            ok = true
            for (const k in this.doc.entities) {
                const ent = this.doc.entities[k]
                if (Entity.qname(ent).fullName === alias) {
                    ok = false
                    break
                }
            }

            for (const k in this.doc.methods) {
                const met = this.doc.methods[k]
                if (met.name.tln === alias) {
                    ok = false
                    break
                }
            }

            if (ok) {
                for (const k in this.imports) {
                    if (k === uid) {
                        continue
                    } else if (this.imports[k].alias === alias) {
                        ok = false
                        break
                    }
                }
            }

            if (!ok) {
                alias = `${alias}_${i++}`
            }

        } while (!ok);

        return alias
    }

    public typeAsTs(type: Type): string {
        this.importType(type)

        if (type instanceof Type_List) {
            return `Array<${this.typeAsTs(type.itemType)}>`
        } else if (type instanceof Type_Mapping) {
            return `{ [key: string]: ${this.typeAsTs(type.itemType)} }`
        } else if (type instanceof Type_Native) {
            switch (type.name) {
                case "string": return "string"
                case "boolean": return "boolean"
                case "integer": return "number"
                case "null": return "null"
                case "number": return "number"
                case "date": return "Date"
                case "datetime": return "Date"
            }
            throw new Error("Unhandled native type")
        } else if (type instanceof Type_Ref) {
            if (type.referenced instanceof Entity) {
                return this.getEntityName(type.referenced)
            } else {
                return this.typeAsTs(type.referenced)
            }
        } else if (type instanceof Type_Tuple) {
            return `[${type.items.map(v => this.typeAsTs(v)).join(", ")}]`
        } else if (type instanceof Type_Polymorphic) {
            return type.mapping.map(v => {
                let id = {}
                v.id.fields.forEach((field, i) => {
                    id[field] = v.id.values[i]
                })
                return `(${this.typeAsTs(v.type)} & ${JSON.stringify(id)})`
            }).join(" | ")
        }

        throw new Error("Ungandled type")
    }

    public typeAsFactory(type: Type): string {
        const name = TypeFactory.get(this, type)
        if (name.startsWith(TypeFactory.name) && this._factories.indexOf(name) === -1) {
            this._factories.push(name)
        }
        return name
    }

    public getEntityName(ent: Entity): string {
        return this._getQNameLocalName(Entity.qname(ent))
    }

    protected _getQNameLocalName(qname: QName): string {
        let exists = Object.values(this.doc.entities)
            .filter(v => Entity.qname(v).uid === qname.uid)

        if (exists.length === 0) {
            const alias = this._getUniqueImportName(qname)
            this.imports[qname.uid] = { qname, alias }
            return alias
        } else {
            return qname.name
        }
    }

    protected _tempVarIdx = 0
    protected _tempVar() {
        return `anzar_temp_${this._tempVarIdx++}`
    }

    protected renderEntities(): string {
        return Object.values(this.doc.entities).map(ent => {
            return createEntityCode(this, ent)
        }).join("\n\n\n")
    }

    protected renderMethods(): string {
        return createMethods(this)
    }

    protected renderImports(selfPath: string, factoryPath: string): string {
        let selfModuleParts = this.doc.module.parent.split("/")
        function determineFrom(other: QName) {
            let selfDir = path.dirname(selfPath)
            let otherModuleParts = other.document.module.parent.split("/")
            let otherParts = selfDir.split(/[\\\/]/)
            otherParts = otherParts.slice(0, otherParts.length - selfModuleParts.length)
            otherParts = otherParts.concat(otherModuleParts)
            otherParts.push(other.document.module.name)

            let pth = path.relative(selfDir, otherParts.join(path.sep))
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/")
            if (!pth.startsWith(".")) {
                pth = "./" + pth
            }

            return pth
        }

        let groupByModule: { [key: string]: Array<{ fname: string[], alias: string }> } = {}

        for (const imp of Object.values(this.imports)) {
            const importFrom = determineFrom(imp.qname)
            if (!groupByModule[importFrom]) {
                groupByModule[importFrom] = []
            }

            let idx = this._deps.indexOf(imp.qname.file)
            if (idx === -1) {
                this._deps.push(imp.qname.file)
            }

            groupByModule[importFrom].push({ fname: imp.qname.fullName.split("."), alias: imp.alias })
        }

        let res: string[] = [
            `import { FactoryProvider, Inject, InjectionToken } from "@angular/core"`,
            `import { Observable } from "rxjs"`,
            `import { Entity as Entity__, Field as Field__, Method as Method__, Client as Client__, RPC_CLIENT, Transport, HTTPTransport } from "@anzar/rpc"`
        ]

        for (const impFrom in groupByModule) {
            let imps: string[] = []
            let convs: string[] = []

            for (const imp of groupByModule[impFrom]) {
                if (imp.fname.length > 1 || imp.fname[0] !== imp.alias) {
                    if (imp.fname.length === 1) {
                        imps.push(`${imp.fname[0]} as ${imp.alias}`)
                    } else {
                        imps.push(imp.fname[0])
                        convs.push(`const ${imp.alias} = ${imp.fname.join(".")}`)
                    }
                } else {
                    imps.push(imp.alias)
                }
            }

            res.push(`import { ${imps.join(", ")} } from "${impFrom}"`)
            if (convs.length) {
                res = res.concat(convs)
            }
        }

        if (this._factories.length > 0) {
            let fac = path.relative(path.dirname(selfPath), factoryPath)
                .replace(/\.[tj]s$/, "")
                .replace(/[\\\/]+/g, "/")
            res.push(`import { ${this._factories.join(", ")} } from "${fac}"`)
        }

        return res.join("\n")
    }
}
