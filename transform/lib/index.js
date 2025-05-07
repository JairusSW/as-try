import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
import { FunctionLinker } from "./linkers/function.js";
import { isStdlib } from "./lib/util.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
export default class Transformer extends Transform {
    afterParse(parser) {
        let sources = parser.sources;
        const baseDir = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
        sources.forEach(v => console.log(v.normalizedPath));
        console.log("Added source: assembly/types/exception.ts");
        parser.parseFile(fs.readFileSync("./assembly/types/exception.ts").toString(), "./assembly/types/exception.ts", false);
        console.log("Added source: assembly/types/unreachable.ts");
        parser.parseFile(fs.readFileSync("./assembly/types/unreachable.ts").toString(), "./assembly/types/unreachable.ts", false);
        console.log("Added source: assembly/types/abort.ts");
        parser.parseFile(fs.readFileSync("./assembly/types/abort.ts").toString(), "./assembly/types/abort.ts", false);
        sources = parser.sources.sort((a, b) => {
            if (a.sourceKind >= 2 && b.sourceKind <= 1) {
                return -1;
            }
            else if (a.sourceKind <= 1 && b.sourceKind >= 2) {
                return 1;
            }
            else {
                return 0;
            }
        }).filter((v) => !isStdlib(v));
        FunctionLinker.visitSources(sources);
        const transformer = new TryTransform();
        for (const source of sources) {
            if (source.internalPath.startsWith("~lib/rt"))
                continue;
            if (source.internalPath.startsWith("~lib/performance"))
                continue;
            if (source.internalPath.startsWith("~lib/wasi_"))
                continue;
            if (source.internalPath.startsWith("~lib/shared/"))
                continue;
            transformer.visit(source);
        }
    }
}
//# sourceMappingURL=index.js.map