import { Parser } from "assemblyscript/dist/assemblyscript.js";
import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
import { FunctionLinker } from "./linkers/function.js";
import { isStdlib } from "./lib/util.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

export default class Transformer extends Transform {
  afterParse(parser: Parser): void {

    let sources = parser.sources;

    const baseDir = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
    sources.forEach(v => console.log(v.normalizedPath))

    // const libExept = sources.some(v => v.normalizedPath.startsWith("~lib/as-try/assembly/types/exception.ts"));
    // if (!sources.some(v => v.normalizedPath.startsWith("assembly/types/exception.ts"))) {
    //   console.log("Added source: assembly/types/exception.ts");
    //   parser.parseFile(fs.readFileSync("./assembly/types/exception.ts").toString(), "./assembly/types/exception.ts", false);
    // } else if (!libExept) {
    //   console.log("Added source: ~lib/as-try/assembly/types/exception.ts");
    //   parser.parseFile(fs.readFileSync(path.join(baseDir, "assembly", "types", "exception.ts")).toString(), "~lib/as-try/assembly/types/exception.ts", false);
    // }

    // const libUnreach = sources.some(v => v.normalizedPath.startsWith("~lib/as-try/assembly/types/unreachable.ts"));
    // if (!sources.some(v => v.normalizedPath.startsWith("assembly/types/unreachable.ts"))) {
    //   console.log("Added source: assembly/types/unreachable.ts");
    //   parser.parseFile(fs.readFileSync("./assembly/types/unreachable.ts").toString(), "./assembly/types/unreachable.ts", false);
    // } else if (!libUnreach) {
    //   console.log("Added source: ~lib/as-try/assembly/types/unreachable.ts");
    //   parser.parseFile(fs.readFileSync(path.join(baseDir, "assembly", "types", "unreachable.ts")).toString(), "~lib/as-try/assembly/types/unreachable.ts", false);
    // }

    // const libAbort = sources.some(v => v.normalizedPath.startsWith("~lib/as-try/assembly/types/abort.ts"));
    // if (!sources.some(v => v.normalizedPath.startsWith("assembly/types/abort.ts"))) {
    //   console.log("Added source: assembly/types/abort.ts");
    //   parser.parseFile(fs.readFileSync("./assembly/types/abort.ts").toString(), "./assembly/types/abort.ts", false);
    // } else if (!libAbort) {
    //   console.log("Added source: ~lib/as-try/assembly/types/abort.ts");
    //   parser.parseFile(fs.readFileSync(path.join(baseDir, "assembly", "types", "abort.ts")).toString(), "~lib/as-try/assembly/types/abort.ts", false);
    // }


    console.log("Added source: assembly/types/exception.ts");
    parser.parseFile(fs.readFileSync("./assembly/types/exception.ts").toString(), "./assembly/types/exception.ts", false);
    console.log("Added source: assembly/types/unreachable.ts");
    parser.parseFile(fs.readFileSync("./assembly/types/unreachable.ts").toString(), "./assembly/types/unreachable.ts", false);
    console.log("Added source: assembly/types/abort.ts");
    parser.parseFile(fs.readFileSync("./assembly/types/abort.ts").toString(), "./assembly/types/abort.ts", false);
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
      if (source.internalPath.startsWith("~lib/performance")) continue;
      if (source.internalPath.startsWith("~lib/wasi_")) continue;
      if (source.internalPath.startsWith("~lib/shared/")) continue;
      // console.log("Source: " + source.internalPath)
      transformer.visit(source);
      // if (source.sourceKind == SourceKind.UserEntry) console.log(toString(source))
    }
  }
}
