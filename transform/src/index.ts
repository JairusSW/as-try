import { Parser } from "assemblyscript/dist/assemblyscript.js";
import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
import { FunctionLinker } from "./linkers/function.js";

export default class Transformer extends Transform {
  afterParse(parser: Parser): void {
    const sources = parser.sources.sort((a, b) => {
      if (a.sourceKind >= 2 && b.sourceKind <= 1) {
        return -1;
      } else if (a.sourceKind <= 1 && b.sourceKind >= 2) {
        return 1;
      } else {
        return 0;
      }
    });

    for (const source of sources) FunctionLinker.visit(source);

    const transformer = new TryTransform();

    for (const source of sources) {
      transformer.visit(source);
    }
  }
}
