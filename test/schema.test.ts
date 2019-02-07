import * as path from "path"
import { expect } from "chai"
import { registry } from "../src/schema"


describe("Schema functions", () => {
    it("Load", () => {
        let doc = registry.get(path.join(__dirname, "definition.json"))
        // const doc = loadDefinition(path.join(__dirname, "definition.json"))
        //console.log(doc.entities["User"].fields.nodes.type.mapping[0])
    })
})
