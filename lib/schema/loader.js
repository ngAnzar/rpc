"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const ajv = require("ajv");
exports.schema = require("../../definition.schema.json");
const ajvInstance = ajv({
    allErrors: true,
    jsonPointers: true
});
exports.validator = ajvInstance.compile(exports.schema);
function loadDefinition(jsonPath) {
    const content = fs.readJsonSync(jsonPath);
    if (exports.validator(content)) {
        return content;
    }
    else {
        if (exports.validator.errors) {
            throw new Error(formatError(exports.validator.errors, jsonPath));
        }
        else {
            throw new Error("Undefined error during validate the given definition");
        }
    }
}
exports.loadDefinition = loadDefinition;
function formatError(errors, filePath) {
    let messages = [];
    for (const error of errors) {
        let params = error.params ? " " + JSON.stringify(error.params) : "";
        messages.push(`Error in #${error.dataPath} '${error.message}'${params}. Schema '${error.schemaPath}'`);
    }
    return messages.join("\n");
}
//# sourceMappingURL=loader.js.map