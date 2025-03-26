import { CallExpression, Node, ThrowStatement } from "assemblyscript/dist/assemblyscript.js";

export enum ExceptionType {
  Throw,
  Abort,
  Unreachable
}

export class Exception {
  public type: ExceptionType;
  public node: Node;
  public base: Node;
  public children: Exception[];
  constructor(type: ExceptionType, node: Node, base: Node, children: Exception[] = []) {
    this.type = type;
    this.node = node;
    this.base = base;
    this.children = children;
  }
}