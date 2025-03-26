import { Node } from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";

export class RangeTransform extends Visitor {
  public newNode: Node;
  constructor(newNode: Node) {
    super();
    this.newNode = newNode;
  }
  _visit(node: Node, ref: Node | Node[] | null): void {
    node.range = this.newNode.range;
    super._visit(node, ref);
  }
}