import * as path from "path"
import { expect } from "chai"
import { compile } from "../src/compiler"


describe("Compiler", () => {
    it("Compile", () => {
        compile(
            [
                path.join(__dirname, "definition.json"),
                path.join(__dirname, "file.json"),
            ],
            { outPath: path.join(__dirname, ".compiled") })

        // let doc = registry.get(path.join(__dirname, "definition.json"))



        // const doc = loadDefinition(path.join(__dirname, "definition.json"))
        //console.log(doc.entities["User"].fields.nodes.type.mapping[0])
    })
})
