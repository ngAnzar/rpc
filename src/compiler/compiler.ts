import * as fs from "fs-extra"
import * as path from "path"

import {
    registry, Document, Entity, Module,
    Type, Type_List, Type_Mapping, Type_Native, Type_Polymorphic, Type_Ref, Type_Tuple, QName
} from "../schema"

import { TypeFactory } from "./type-factory"
import { createEntityCode } from "./entity"


export class Compiler {
    protected imports: { [key: string]: { qname: QName, alias: string } } = {}

    public constructor(public readonly doc: Document) {

    }

    public emit(filePath: string) {
        fs.mkdirpSync(path.dirname(filePath))

        let entities: string = this.renderEntities()
        let content = this.renderImports()
            + "\n\n"
            + entities
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
                this.imports[ent.name.uid] = {
                    qname: ent.name,
                    alias: this._getUniqueImportName(ent.name)
                }
            } else {
                this.importType(type.referenced)
            }
        } else if (type instanceof Type_Tuple) {
            for (const t of type.items) {
                this.importType(t)
            }
        }

        throw new Error("Unhandled type")
    }

    protected _getUniqueImportName(qname: QName): string {
        let alias = qname.name
        let i = 0
        let uid = qname.uid
        let ok = true

        do {
            for (const k in this.doc.entities) {
                const ent = this.doc.entities[k]
                if (ent.name.fullName === alias) {
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
            return type.mapping.map(v => this.typeAsTs(v.type)).join(" | ")
        }

        throw new Error("Ungandled type")
    }

    public typeAsFactory(type: Type): string {
        return TypeFactory.get(this, type)
    }

    public getEntityName(ent: Entity): string {
        return ent.name.name
    }

    protected _tempVarIdx = 0
    protected _tempVar() {
        return `anzar_temp_${this._tempVarIdx++}`
    }

    protected renderEntities(): string {
        return Object.values(this.doc.entities).map(ent => {
            return createEntityCode(this, ent)
        }).join("\n\n")
    }

    protected renderImports(): string {
        let selfModuleParts = this.doc.module.parent.split("/")
        function determineFrom(other: QName) {
            let otherModuleParts = other.document.module.parent.split("/")
            let i = 0, l = selfModuleParts.length

            for (; i < l; i++) {
                if (selfModuleParts[i] !== otherModuleParts[i]) {
                    if (i === 0) {
                        return other.document.module.parent + "/" + other.document.module.name
                    }
                }
            }

            return "./" + otherModuleParts.slice(i).join("/") + other.document.module.name
        }

        let groupByModule: { [key: string]: Array<{ fname: string[], alias: string }> } = {}

        for (const imp of Object.values(this.imports)) {
            const importFrom = determineFrom(imp.qname)
            if (!groupByModule[importFrom]) {
                groupByModule[importFrom] = []
            }
            groupByModule[importFrom].push({ fname: imp.qname.fullName.split("."), alias: imp.alias })
        }

        let res: string[] = []
        for (const impFrom in groupByModule) {
            let imps: string[] = []
            let convs: string[] = []

            for (const imp of groupByModule[impFrom]) {
                if (imp.fname.length > 1 || imp.fname[0] !== imp.alias) {
                    imps.push(imp.fname[0])
                    convs.push(`const ${imp.alias} = ${imp.fname.join(".")}`)
                } else {
                    imps.push(imp.alias)
                }
            }

            res.push(`import { ${imps.join(", ")} } from "${impFrom}"`)
            if (convs.length) {
                res = res.concat(convs)
            }
        }

        return res.join("\n")
    }
}
