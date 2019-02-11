"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const path = require("path");
const crypto = require("crypto");
const jsonpointer = require("jsonpointer");
const registry_1 = require("./registry");
class Type {
    get uid() {
        return this._uid ? this._uid : (this._uid = crypto.createHash("md5").update(this._createUid()).digest("hex"));
    }
    resolve() {
        delete this._uid;
        this._resolve();
    }
}
exports.Type = Type;
class Type_Ref extends Type {
    constructor(reg, ref, docPath) {
        super();
        this.reg = reg;
        this.ref = ref;
        this.docPath = docPath;
        if (ref.indexOf("#") == -1) {
            throw new Error("Invalid reference identifier. Missing hash part.");
        }
    }
    _resolve() {
        if (this.referenced) {
            return;
        }
        const uri = url.parse(this.ref);
        let docPath, jsonPath;
        if (uri.protocol && uri.hostname) {
            console.log({ uri });
            throw new Error("Remote URI-s currently not supported");
            // remote file
        }
        else {
            docPath = `${uri.protocol || ""}${uri.path || ""}`;
            jsonPath = uri.hash ? uri.hash.substr(1) : "";
            if (!path.isAbsolute(docPath)) {
                if (!docPath || docPath.length === 0) {
                    docPath = this.docPath;
                }
                else {
                    docPath = path.join(path.dirname(this.docPath), docPath);
                }
            }
            docPath = path.normalize(path.resolve(docPath));
        }
        const refDoc = this.reg.get(docPath);
        this.referenced = jsonpointer.get(refDoc, jsonPath);
        if (!(this.referenced instanceof Entity) &&
            !(this.referenced instanceof Type)) {
            throw new Error("Invalid reference. The reference must be point to entity or a type");
        }
    }
    _createUid() {
        if (this.referenced instanceof Entity) {
            return Entity.qname(this.referenced).uid;
        }
        else {
            return this.referenced.uid;
        }
    }
}
exports.Type_Ref = Type_Ref;
class Type_Native extends Type {
    constructor(name) {
        super();
        this.name = name;
    }
    _resolve() { }
    _createUid() {
        return `Type_Native[${this.name}]`;
    }
}
exports.Type_Native = Type_Native;
class Type_Mapping extends Type {
    constructor(itemType) {
        super();
        this.itemType = itemType;
    }
    _resolve() {
        this.itemType.resolve();
    }
    _createUid() {
        return `Type_Mapping[${this.itemType.uid}]`;
    }
}
exports.Type_Mapping = Type_Mapping;
class Type_List extends Type {
    constructor(itemType) {
        super();
        this.itemType = itemType;
    }
    _resolve() {
        this.itemType.resolve();
    }
    _createUid() {
        return `Type_List[${this.itemType.uid}]`;
    }
}
exports.Type_List = Type_List;
class Type_Tuple extends Type {
    constructor(items) {
        super();
        this.items = items;
    }
    _resolve() {
        for (const item of this.items) {
            item.resolve();
        }
    }
    _createUid() {
        return `Type_Tuple[${this.items.map(v => v.uid).join(", ")}]`;
    }
}
exports.Type_Tuple = Type_Tuple;
class Type_Polymorphic extends Type {
    constructor(mapping) {
        super();
        this.mapping = mapping;
    }
    _resolve() {
        for (const m of this.mapping) {
            m.type.resolve();
        }
    }
    _createUid() {
        let id = Object.values(this.mapping).map(v => v.uid).join(",");
        return `Type_Polymorphic[${id}]`;
    }
}
exports.Type_Polymorphic = Type_Polymorphic;
class Type_PolymorphicId {
    constructor(fields, values) {
        this.fields = fields;
        this.values = values;
    }
    get uid() {
        return `${this.fields.join(",")}//${this.values.join(",")}`;
    }
}
exports.Type_PolymorphicId = Type_PolymorphicId;
class Type_PolymorphicMap {
    constructor(id, type) {
        this.id = id;
        this.type = type;
    }
    get uid() {
        return `${this.id.uid}:${this.type.uid}`;
    }
}
exports.Type_PolymorphicMap = Type_PolymorphicMap;
class QName {
    constructor(file, path, name) {
        this.file = file;
        this.path = path;
        let parts = name.split(".");
        this.tln = parts[0];
        this.name = parts.pop();
        this.ns = parts.join(".");
    }
    get fullName() {
        return this.ns ? `${this.ns}.${this.name}` : this.name;
    }
    get uid() {
        return `${this.file}#${this.path}${this.fullName}`;
    }
    get document() {
        return registry_1.registry.get(this.file);
    }
}
exports.QName = QName;
const ENT_NAME = Symbol("Entity.name");
const ENT_FIELDS = Symbol("Entity.fields");
class Entity {
    constructor(name, fields) {
        this[ENT_NAME] = name;
        this[ENT_FIELDS] = fields;
        for (const k in fields) {
            this[k] = fields[k];
        }
    }
    static qname(ent) {
        return ent[ENT_NAME];
    }
    static fields(ent) {
        return ent[ENT_FIELDS];
    }
}
exports.Entity = Entity;
class EntityField {
    constructor(name, type, summary, description) {
        this.name = name;
        this.type = type;
        this.summary = summary;
        this.description = description;
    }
}
exports.EntityField = EntityField;
class Method {
    constructor(name, params, returns, throws) {
        this.name = name;
        this.params = params;
        this.returns = returns;
        this.throws = throws;
    }
}
exports.Method = Method;
class MethodParam {
    constructor(name, type, summary, description) {
        this.name = name;
        this.type = type;
        this.summary = summary;
        this.description = description;
    }
}
exports.MethodParam = MethodParam;
class MethodReturns {
    constructor(type, summary, description) {
        this.type = type;
        this.summary = summary;
        this.description = description;
    }
}
exports.MethodReturns = MethodReturns;
class MethodThrow {
    constructor(code, message, data, summary, description) {
        this.code = code;
        this.message = message;
        this.data = data;
        this.summary = summary;
        this.description = description;
    }
}
exports.MethodThrow = MethodThrow;
class Module {
    constructor(parent, name) {
        this.parent = parent;
        this.name = name;
    }
}
exports.Module = Module;
class Document {
    constructor(reg, json, _path) {
        this.reg = reg;
        this.entities = {};
        this.methods = {};
        this.path = _path;
        let basename = path.basename(_path).split(".");
        basename.pop();
        this.module = new Module(json.module, basename.join("."));
        if (json.entities) {
            this._convertEntities(json.entities);
        }
        if (json.methods) {
            this._convertMethods(json.methods);
        }
    }
    _convertEntities(ents) {
        for (const k in ents) {
            const name = new QName(this.path, "/entities/", k);
            let fields = {};
            for (const fieldName in ents[k]) {
                const fieldProp = ents[k][fieldName];
                fields[fieldName] = new EntityField(fieldName, this._type(fieldProp.type), fieldProp.summary, fieldProp.description);
            }
            this.entities[k] = new Entity(name, fields);
        }
    }
    _convertMethods(mets) {
        for (const k in mets) {
            const name = new QName(this.path, "/methods/", k);
            const met = mets[k];
            let returns = new MethodReturns(this._type(met.returns.type), met.returns.summary, met.returns.description);
            let params = [];
            let throws = [];
            for (const param of met.params) {
                params.push(new MethodParam(param.name, this._type(param.type), param.summary, param.description));
            }
            for (const item of met.throws) {
                throws.push(new MethodThrow(item.code, item.message, item.data, item.summary, item.description));
            }
            this.methods[k] = new Method(name, params, returns, throws);
        }
    }
    _type(t) {
        if (typeof t === "string") {
            return new Type_Native(t);
        }
        else if (Array.isArray(t)) {
            let items = t.map(this._type.bind(this));
            return new Type_Tuple(items);
        }
        else if (t) {
            if (t.$ref) {
                return new Type_Ref(this.reg, t.$ref, this.path);
            }
            else if (t.mapOf) {
                return new Type_Mapping(this._type(t.mapOf));
            }
            else if (t.listOf) {
                return new Type_List(this._type(t.listOf));
            }
            else if (t.polymorphic) {
                const identity = t.polymorphic.identity;
                let idFields = Array.isArray(identity) ? identity : [identity];
                let mapping = [];
                for (const item of t.polymorphic.mapping) {
                    const idValues = Array.isArray(item.id) ? item.id : [item.id];
                    if (idFields.length !== idValues.length) {
                        throw new Error("Incorrect number of id values in polymorphic mapping definition");
                    }
                    const id = new Type_PolymorphicId(idFields, idValues);
                    mapping.push(new Type_PolymorphicMap(id, this._type({ $ref: item.$ref })));
                }
                return new Type_Polymorphic(mapping);
            }
        }
        throw new Error("Undefined type");
    }
    _resolveType() {
        for (const k in this.entities) {
            const ent = this.entities[k];
            const fields = Entity.fields(ent);
            for (const f in fields) {
                const field = fields[f];
                if (field.type) {
                    field.type.resolve();
                }
            }
        }
        for (const k in this.methods) {
            const met = this.methods[k];
            for (const p of met.params) {
                if (p.type) {
                    p.type.resolve();
                }
            }
            if (met.returns.type) {
                met.returns.type.resolve();
            }
        }
    }
}
exports.Document = Document;
//# sourceMappingURL=model.js.map