import * as path from "path"
import * as fs from "fs-extra"
import * as ajv from "ajv"


export const schema = require("../../definition.schema.json")
const ajvInstance = ajv({
    allErrors: true,
    jsonPointers: true
})
export const validator = ajvInstance.compile(schema)


export function loadDefinition(jsonPath: string) {
    const content = fs.readJsonSync(jsonPath)

    if (validator(content)) {
        return content
    } else {
        if (validator.errors) {
            throw new Error(formatError(validator.errors, jsonPath))
        } else {
            throw new Error("Undefined error during validate the given definition")
        }
    }
}


function formatError(errors: ajv.ErrorObject[], filePath: string) {
    let messages: string[] = []

    for (const error of errors) {
        let params: string = error.params ? " " + JSON.stringify(error.params) : ""

        messages.push(`Error in #${error.dataPath} '${error.message}'${params}. Schema '${error.schemaPath}'`)
    }

    return messages.join("\n")
}
