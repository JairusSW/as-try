import { Parser, SourceKind } from "assemblyscript/dist/assemblyscript.js";
import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
import { FunctionLinker } from "./linkers/function.js";
import { isStdlib, toString } from "./lib/util.js";
import { readFileSync } from "fs";

export default class Transformer extends Transform {
  afterParse(parser: Parser): void {

    let sources = parser.sources;

    if (!sources.some(v => v.normalizedPath.startsWith("assembly/types/exception.ts") || v.normalizedPath.startsWith("~lib/json-as/assembly/types/exception.ts"))) {
      parser.parseFile(readFileSync("./assembly/types/exception.ts").toString(), "./assembly/types/exception.ts", false);
    }

    if (!sources.some(v => v.normalizedPath.startsWith("assembly/types/unreachable.ts") || v.normalizedPath.startsWith("~lib/json-as/assembly/types/unreachable.ts"))) {
      parser.parseFile(readFileSync("./assembly/types/unreachable.ts").toString(), "./assembly/types/unreachable.ts", false);
    }

    sources = parser.sources.sort((a, b) => {
      if (a.sourceKind >= 2 && b.sourceKind <= 1) {
        return -1;
      } else if (a.sourceKind <= 1 && b.sourceKind >= 2) {
        return 1;
      } else {
        return 0;
      }
    }).filter((v) => !isStdlib(v));

    FunctionLinker.visitSources(sources);

    const transformer = new TryTransform();

    for (const source of sources) {
      if (source.internalPath.startsWith("~lib/rt")) continue;
      // console.log("Source: " + source.internalPath)
      transformer.visit(source);
      if (source.sourceKind == SourceKind.UserEntry) console.log(toString(source))
    }
  }
}
