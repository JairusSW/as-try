import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
import { FunctionLinker } from "./linkers/function.js";
import { isStdlib } from "./lib/util.js";
export default class Transformer extends Transform {
    afterParse(parser) {
        const sources = parser.sources.sort((a, b) => {
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
        for (const source of sources)
            FunctionLinker.visit(source);
        const transformer = new TryTransform();
        for (const source of sources) {
            if (source.internalPath.startsWith("~lib/rt"))
                continue;
            transformer.visit(source);
        }
    }
}
//# sourceMappingURL=index.js.map