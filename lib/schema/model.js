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
            throw new Error(`Invalid reference ${docPath}#${jsonPath}. The reference must be point to entity or a type`);
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
class Type_Optional extends Type {
    constructor(itemType) {
        super();
        this.itemType = itemType;
    }
    _resolve() {
        this.itemType.resolve();
    }
    _createUid() {
        return `Type_Optional[${this.itemType.uid}]`;
    }
}
exports.Type_Optional = Type_Optional;
class Type_Polymorph extends Type {
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
        return `Type_Polymorph[${id}]`;
    }
}
exports.Type_Polymorph = Type_Polymorph;
class Type_PolymorphId {
    constructor(fields, values) {
        this.fields = fields;
        this.values = values;
    }
    get uid() {
        return `${this.fields.join(",")}//${this.values.join(",")}`;
    }
}
exports.Type_PolymorphId = Type_PolymorphId;
class Type_PolymorphMap {
    constructor(id, type) {
        this.id = id;
        this.type = type;
    }
    get uid() {
        return `${this.id.uid}:${this.type.uid}`;
    }
}
exports.Type_PolymorphMap = Type_PolymorphMap;
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
const ENT_DATA = Symbol("Entity.data");
class Entity {
    constructor(name, fields, polymorph, primaryKey) {
        this.fields = fields;
        this.polymorph = polymorph;
        this.primaryKey = primaryKey;
        this[ENT_NAME] = name;
    }
    static qname(ent) {
        return ent[ENT_NAME];
    }
    static data(ent) {
        return ent[ENT_DATA];
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
class StaticData {
    constructor(items) {
        this.items = items;
    }
}
exports.StaticData = StaticData;
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
        if (json.data) {
            this._convertData(json.data);
        }
    }
    _convertEntities(ents) {
        for (const k in ents) {
            const name = new QName(this.path, "/entities/", k);
            const entity = ents[k];
            let fields = {};
            let poly = null;
            if (entity.fields) {
                for (const fieldName in entity.fields) {
                    const fieldProp = entity.fields[fieldName];
                    fields[fieldName] = new EntityField(fieldName, this._type(fieldProp.type), fieldProp.summary, fieldProp.description);
                }
            }
            if (entity.polymorph) {
                poly = this._type({ polymorph: entity.polymorph });
            }
            this.entities[k] = new Entity(name, fields, poly, entity.primaryKey);
        }
    }
    _convertMethods(mets) {
        for (const k in mets) {
            const name = new QName(this.path, "/methods/", k);
            const met = mets[k];
            let returns = new MethodReturns(this._type(met.returns.type), met.returns.summary, met.returns.description);
            let params = {};
            let throws = [];
            if (met.params) {
                for (const k in met.params) {
                    const param = met.params[k];
                    params[k] = new MethodParam(k, this._type(param.type), param.summary, param.description);
                }
            }
            if (met.throws) {
                for (const item of met.throws) {
                    throws.push(new MethodThrow(item.code, item.message, item.data, item.summary, item.description));
                }
            }
            this.methods[k] = new Method(name, params, returns, throws);
        }
    }
    _convertData(data) {
        for (const entityName in data) {
            const ent = this.entities[entityName];
            if (ent) {
                ent[ENT_DATA] = new StaticData(data[entityName]);
            }
            else {
                throw Error("Entity is defined: " + entityName);
            }
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
            else if (t.optional) {
                return new Type_Optional(this._type(t.optional));
            }
            else if (t.polymorph) {
                const identity = t.polymorph.identity;
                let idFields = Array.isArray(identity) ? identity : [identity];
                let mapping = [];
                for (const item of t.polymorph.mapping) {
                    const idValues = Array.isArray(item.id) ? item.id : [item.id];
                    if (idFields.length !== idValues.length) {
                        throw new Error("Incorrect number of id values in polymorphic mapping definition");
                    }
                    const id = new Type_PolymorphId(idFields, idValues);
                    mapping.push(new Type_PolymorphMap(id, this._type({ $ref: item.$ref })));
                }
                return new Type_Polymorph(mapping);
            }
        }
        throw new Error("Undefined type: " + JSON.stringify(t));
    }
    _resolveType() {
        for (const k in this.entities) {
            const ent = this.entities[k];
            const fields = ent.fields;
            for (const f in fields) {
                const field = fields[f];
                if (field.type) {
                    field.type.resolve();
                }
            }
            if (ent.polymorph) {
                for (const m of ent.polymorph.mapping) {
                    m.type.resolve();
                }
            }
        }
        for (const k in this.methods) {
            const met = this.methods[k];
            for (const pname in met.params) {
                const param = met.params[pname];
                if (param.type) {
                    param.type.resolve();
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