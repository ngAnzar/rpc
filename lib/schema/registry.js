"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = exports.Registry = void 0;
const path = require("path");
const model_1 = require("./model");
const loader_1 = require("./loader");
class Registry {
    constructor() {
        this.documents = {};
    }
    get(docPath) {
        docPath = path.normalize(path.resolve(docPath));
        if (docPath in this.documents) {
            return this.documents[docPath];
        }
        else {
            const json = loader_1.loadDefinition(docPath);
            const doc = new model_1.Document(this, json, docPath);
            this.documents[docPath] = doc;
            doc._resolveType();
            return doc;
        }
    }
}
exports.Registry = Registry;
exports.registry = new Registry();
//# sourceMappingURL=registry.js.map