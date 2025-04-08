import {
  Node,
  FunctionDeclaration,
  CallExpression,
  IdentifierExpression,
  Source,
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "../lib/visitor.js";

export class FunctionData {
  public node: FunctionDeclaration;
  public ref: Node | Node[] | null;
  public linked: boolean = false;
  constructor(node: FunctionDeclaration, ref: Node | Node[] | null) {
    this.node = node;
    this.ref = ref;
  }
}

export class FunctionLinker extends Visitor {
  static SN: FunctionLinker = new FunctionLinker();
  public fns: FunctionData[] = [];
  public foundException: boolean = false;
  visitFunctionDeclaration(
    node: FunctionDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    this.foundException = false;
    super.visitFunctionDeclaration(node, isDefault, ref);
    if (!this.foundException) return;
    this.fns.push(new FunctionData(node, ref));
  }
  visitCallExpression(node: CallExpression, ref?: Node | Node[] | null): void {
    const fnName = node.expression as IdentifierExpression;
    if (fnName.text == "abort") this.foundException = true;
    else super.visitCallExpression(node, ref);
  }
  static visit(source: Source): void {
    FunctionLinker.SN.visitSource(source);
  }
  static getFunction(fnName: string): FunctionData | null {
    return FunctionLinker.SN.fns.find((v) => v.node.name.text == fnName);
  }
  static rmFunction(fnName: string): void {
    const index = FunctionLinker.SN.fns.findIndex(
      (fn) => fn.node.name.text === fnName,
    );
    if (index == -1) return;

    FunctionLinker.SN.fns.splice(index, 1);
  }
  static reset(): void {
    FunctionLinker.SN.fns = [];
  }
}
