import * as path from "path"

import { Document } from "./model"
import { loadDefinition } from "./loader"


export class Registry {
    private readonly documents: { [key: string]: Document } = {}

    public get(docPath: string): Document {
        docPath = path.normalize(path.resolve(docPath))

        if (docPath in this.documents) {
            return this.documents[docPath]
        } else {
            const json = loadDefinition(docPath)
            const doc = new Document(this, json, docPath)
            this.documents[docPath] = doc;
            (doc as any)._resolveType()
            return doc
        }
    }
}

export const registry = new Registry()
