import * as path from "path"
import * as fs from "fs-extra"
import Ajv, { ErrorObject } from "ajv"
import * as YAML from "yaml"


export const schema = require("../../definition.schema.json")
const ajvInstance = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
})
export const validator = ajvInstance.compile(schema)


export function loadDefinition(jsonPath: string) {
    const raw = fs.readFileSync(jsonPath, "utf-8") as string
    let content = jsonPath.endsWith(".json")
        ? JSON.parse(raw)
        : (jsonPath.endsWith(".yaml") || jsonPath.endsWith(".yml"))
            ? YAML.parse(raw)
            : null

    if (!content) {
        throw new Error("Invalid definition")
    }

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


function formatError(errors: ErrorObject[], filePath: string) {
    let messages: string[] = []

    for (const error of errors) {
        let params: string = error.params ? " " + JSON.stringify(error.params) : ""

        messages.push(`Error in #${error.instancePath} '${error.message}'${params}. Schema '${error.schemaPath}'`)
    }

    return messages.join("\n")
}
