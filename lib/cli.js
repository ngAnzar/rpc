#!/usr/bin/env node
const path = require("path");
const glob = require("glob");
const { ArgumentParser } = require("argparse");
const { compile } = require("./compiler");
const parser = new ArgumentParser({
    addHelp: true
});
parser.addArgument(["-o", "--outPath"], {
    help: "output path"
});
parser.addArgument(["-i", "--input"], {
    nargs: "*",
    help: "input files"
});
var args = parser.parseArgs();
if (!args.input || args.input.length === 0) {
    console.error("Missing input file");
    process.exit(1);
}
const outPath = path.normalize(path.resolve(args.outPath || "./"));
let input = [];
for (const i of args.input) {
    input = input.concat(glob.sync(i));
}
compile(input, { outPath });
//# sourceMappingURL=cli.js.map