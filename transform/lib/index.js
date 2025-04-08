import { Transform } from "assemblyscript/dist/transform.js";
import { TryTransform } from "./transform.js";
export default class Transformer extends Transform {
  afterParse(parser) {
    const transformer = new TryTransform();
    for (const source of parser.sources) {
      transformer.visit(source);
    }
  }
}
//# sourceMappingURL=index.js.map
