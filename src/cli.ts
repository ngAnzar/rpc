#!/usr/bin/env node

const path = require("path")
const glob = require("glob")
const { ArgumentParser } = require("argparse")
const { compile } = require("./compiler")

const parser = new ArgumentParser({
    add_help: true
})

parser.add_argument("-o", "--outPath", {
    help: "output path"
})

parser.add_argument("-i", "--input", {
    nargs: "*",
    help: "input files"
})


var args = parser.parse_args()
if (!args.input || args.input.length === 0) {
    console.error("Missing input file")
    process.exit(1)
}

const outPath = path.normalize(path.resolve(args.outPath || "./"))

let input = []
for (const i of args.input) {
    input = input.concat(glob.sync(i))
}

compile(input, { outPath })
