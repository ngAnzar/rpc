import * as url from "url"
import * as path from "path"
import * as crypto from "crypto"
import * as jsonpointer from "jsonpointer"

import { Registry, registry } from "./registry"


export abstract class Type {
    public get uid(): string {
        return this._uid ? this._uid : (this._uid = crypto.createHash("md5").update(this._createUid()).digest("hex"))
    }
    private _uid: string

    public resolve() {
        delete this._uid
        this._resolve()
    }


    protected abstract _resolve(): void
    protected abstract _createUid(): string
}

export class Type_Ref extends Type {
    public readonly referenced: Type | Entity

    public constructor(private readonly reg: Registry, private readonly ref: string, private readonly docPath: string) {
        super()

        if (ref.indexOf("#") == -1) {
            throw new Error("Invalid reference identifier. Missing hash part.")
        }
    }

    protected _resolve() {
        if (this.referenced) {
            return
        }

        const uri = url.parse(this.ref)
        let docPath: string, jsonPath: string

        if (uri.protocol && uri.hostname) {
            console.log({ uri })
            throw new Error("Remote URI-s currently not supported")
            // remote file
        } else {
            docPath = `${uri.protocol || ""}${uri.path || ""}`
            jsonPath = uri.hash ? uri.hash.substr(1) : ""
            if (!path.isAbsolute(docPath)) {
                if (!docPath || docPath.length === 0) {
                    docPath = this.docPath
                } else {
                    docPath = path.join(path.dirname(this.docPath), docPath)
                }
            }
            docPath = path.normalize(path.resolve(docPath))
        }

        const refDoc = this.reg.get(docPath);
        (this as any).referenced = jsonpointer.get(refDoc, jsonPath)

        if (!((this.referenced as any) instanceof Entity) &&
            !((this.referenced as any) instanceof Type)) {
            throw new Error("Invalid reference. The reference must be point to entity or a type")
        }
    }

    protected _createUid(): string {
        if (this.referenced instanceof Entity) {
            return Entity.qname(this.referenced).uid
        } else {
            return this.referenced.uid
        }
    }
}


export class Type_Native extends Type {
    public constructor(public readonly name: string) {
        super()
    }

    protected _resolve() { }

    protected _createUid(): string {
        return `Type_Native[${this.name}]`
    }
}


export class Type_Mapping extends Type {
    public constructor(public readonly itemType: Type) {
        super()
    }

    protected _resolve() {
        this.itemType.resolve()
    }

    protected _createUid(): string {
        return `Type_Mapping[${this.itemType.uid}]`
    }
}


export class Type_List extends Type {
    public constructor(public readonly itemType: Type) {
        super()
    }

    protected _resolve() {
        this.itemType.resolve()
    }

    protected _createUid(): string {
        return `Type_List[${this.itemType.uid}]`
    }
}


export class Type_Tuple extends Type {
    public constructor(public readonly items: Type[]) {
        super()
    }

    protected _resolve() {
        for (const item of this.items) {
            item.resolve()
        }
    }

    protected _createUid(): string {
        return `Type_Tuple[${this.items.map(v => v.uid).join(", ")}]`
    }
}


export class Type_Polymorphic extends Type {
    public constructor(public readonly mapping: Type_PolymorphicMap[]) {
        super()
    }

    protected _resolve() {
        for (const m of this.mapping) {
            m.type.resolve()
        }
    }

    protected _createUid(): string {
        let id = Object.values(this.mapping).map(v => v.uid).join(",")
        return `Type_Polymorphic[${id}]`
    }
}


export class Type_PolymorphicId {
    public constructor(public readonly fields: string[], public readonly values: Array<string | number>) {
    }

    public get uid(): string {
        return `${this.fields.join(",")}//${this.values.join(",")}`
    }
}


export class Type_PolymorphicMap {
    public constructor(public readonly id: Type_PolymorphicId, public readonly type: Type_Ref) {

    }

    public get uid(): string {
        return `${this.id.uid}:${this.type.uid}`
    }
}


export class QName {
    public readonly tln: string
    public readonly ns: string
    public readonly name: string

    public constructor(public readonly file: string, public readonly path: string, name: string) {
        let parts = name.split(".")
        this.name = parts.pop() as string
        this.ns = parts.join(".")
        this.tln = parts[0]
    }

    public get fullName() {
        return this.ns ? `${this.ns}.${this.name}` : this.name
    }

    public get uid(): string {
        return `${this.file}#${this.path}${this.fullName}`
    }

    public get document() {
        return registry.get(this.file)
    }
}


const ENT_NAME = Symbol("Entity.name")
const ENT_FIELDS = Symbol("Entity.fields")

export class Entity {
    public static qname(ent: Entity): QName {
        return ent[ENT_NAME]
    }

    public static fields(ent: Entity): EntityFields {
        return ent[ENT_FIELDS]
    }

    protected [ENT_NAME]: QName
    protected [ENT_FIELDS]: EntityFields

    public constructor(name: QName, fields: EntityFields) {
        this[ENT_NAME] = name
        this[ENT_FIELDS] = fields

        for (const k in fields) {
            this[k] = fields[k]
        }
    }
}


export class EntityField {
    public constructor(
        public name: string,
        public type: Type,
        public summary: string,
        public description: string) {
    }
}


export type Entities = { [key: string]: Entity }
export type EntityFields = { [key: string]: EntityField }


export class Method {
    public constructor(public name: QName,
        public params: MethodParams,
        public returns: MethodReturns,
        public throws: MethodThrows) {
    }
}


export class MethodParam {
    public constructor(public name: string,
        public type: Type,
        public summary: string,
        public description: string) {

    }
}


export class MethodReturns {
    public constructor(public type: Type,
        public summary: string,
        public description: string) {

    }
}


export class MethodThrow {
    public constructor(public code: number | null,
        public message: string,
        public data: any,
        public summary: string,
        public description: string) {

    }
}


export type Methods = { [key: string]: Method }
export type MethodParams = MethodParam[]
export type MethodThrows = MethodThrow[]


export class Module {
    public constructor(public parent: string, public name: string) {
    }
}


export class Document {
    public readonly module: Module
    public readonly entities: Entities = {}
    public readonly methods: Methods = {}
    public readonly path: string
    public outPath: string

    public constructor(private readonly reg: Registry, json: any, _path: string) {
        this.path = _path
        let basename = path.basename(_path).split(".")
        basename.pop()
        this.module = new Module(json.module, basename.join("."))

        if (json.entities) {
            this._convertEntities(json.entities)
        }
        if (json.methods) {
            this._convertMethods(json.methods)
        }
    }

    protected _convertEntities(ents: { [key: string]: any }) {
        for (const k in ents) {
            const name = new QName(this.path, "/entities/", k)
            let fields: EntityFields = {}

            for (const fieldName in ents[k]) {
                const fieldProp = ents[k][fieldName]
                fields[fieldName] = new EntityField(fieldName, this._type(fieldProp.type), fieldProp.summary, fieldProp.description)
            }

            this.entities[k] = new Entity(name, fields)
        }
    }

    protected _convertMethods(mets: { [key: string]: any }) {
        for (const k in mets) {
            const name = new QName(this.path, "/methods/", k)
            const met = mets[k]

            let returns: MethodReturns = new MethodReturns(this._type(met.returns.type), met.returns.summary, met.returns.description)
            let params: MethodParams = []
            let throws: MethodThrows = []

            for (const param of met.params) {
                params.push(new MethodParam(param.name, this._type(param.type), param.summary, param.description))
            }

            for (const item of met.throws) {
                throws.push(new MethodThrow(item.code, item.message, item.data, item.summary, item.description))
            }

            this.methods[k] = new Method(name, params, returns, throws)
        }
    }

    protected _type(t: any): Type {
        if (typeof t === "string") {
            return new Type_Native(t)
        } else if (Array.isArray(t)) {
            let items = t.map(this._type.bind(this)) as Type[]
            return new Type_Tuple(items)
        } else if (t) {
            if (t.$ref) {
                return new Type_Ref(this.reg, t.$ref, this.path)
            } else if (t.mapOf) {
                return new Type_Mapping(this._type(t.mapOf))
            } else if (t.listOf) {
                return new Type_List(this._type(t.listOf))
            } else if (t.polymorphic) {
                const identity = t.polymorphic.identity
                let idFields = Array.isArray(identity) ? identity : [identity]
                let mapping: Type_PolymorphicMap[] = []

                for (const item of t.polymorphic.mapping) {
                    const idValues = Array.isArray(item.id) ? item.id : [item.id]
                    if (idFields.length !== idValues.length) {
                        throw new Error("Incorrect number of id values in polymorphic mapping definition")
                    }
                    const id = new Type_PolymorphicId(idFields, idValues)
                    mapping.push(new Type_PolymorphicMap(id, this._type({ $ref: item.$ref }) as Type_Ref));
                }

                return new Type_Polymorphic(mapping)
            }
        }

        throw new Error("Undefined type")
    }

    protected _resolveType() {
        for (const k in this.entities) {
            const ent = this.entities[k]
            const fields = Entity.fields(ent)
            for (const f in fields) {
                const field = fields[f]
                if (field.type) {
                    field.type.resolve()
                }
            }
        }

        for (const k in this.methods) {
            const met = this.methods[k]

            for (const p of met.params) {
                if (p.type) {
                    p.type.resolve()
                }
            }

            if (met.returns.type) {
                met.returns.type.resolve()
            }
        }
    }
}
