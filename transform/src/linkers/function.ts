import {
  Node,
  FunctionDeclaration,
  CallExpression,
  Source,
  ThrowStatement,
  NamespaceDeclaration,
  Expression,
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "../lib/visitor.js";
import { getFnName } from "../utils.js";

export class FunctionData {
  public node: FunctionDeclaration;
  public ref: Node | Node[] | null;
  public linked: boolean = false;
  public path: Map<string, NamespaceDeclaration> | null;

  constructor(node: FunctionDeclaration, ref: Node | Node[] | null, path: Map<string, NamespaceDeclaration> = null) {
    this.node = node;
    this.ref = ref;
    this.path = path;
  }
}

export class FunctionLinker extends Visitor {
  static SN: FunctionLinker = new FunctionLinker();

  public fns: FunctionData[] = [];
  public path: Map<string, NamespaceDeclaration> = new Map();
  public foundException: boolean = false;

  visitFunctionDeclaration(
    node: FunctionDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    this.foundException = false;
    super.visitFunctionDeclaration(node, isDefault, ref);

    if (this.foundException) {
      const path = this.path.size ? new Map<string, NamespaceDeclaration>(this.path.entries()) : null;
      this.fns.push(new FunctionData(node, ref, path));
    }
  }

  visitCallExpression(node: CallExpression, ref?: Node | Node[] | null): void {
    const fnName = getFnName(node.expression);
    if (!fnName) return super.visitCallExpression(node, ref);

    if (fnName === "abort" || fnName === "unreachable") {
      this.foundException = true;
    }

    super.visitCallExpression(node, ref);
  }

  visitThrowStatement(node: ThrowStatement, ref?: Node | Node[] | null): void {
    this.foundException = true;
  }

  visitNamespaceDeclaration(
    node: NamespaceDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    const nsName = node.name.text;
    // console.log("Namespace: " + (this.path.size ? Array.from(this.path.keys()).join(".") + "."  : "") + nsName)
    this.path.set(nsName, node);
    super.visitNamespaceDeclaration(node, isDefault, ref);
    this.path.delete(nsName);
  }

  static visit(source: Source): void {
    FunctionLinker.SN.visitSource(source);
  }

  static getFunction(fnName: Expression, path: string[] | null = null): FunctionData | null {
    const name = getFnName(fnName, path);
    const fn = FunctionLinker.SN.fns.find((v) => {
      const actualName = getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
      return actualName == name;
    }) || null;
    return fn;
  }

  static getNamespace(ns: string): NamespaceDeclaration | null {
    return FunctionLinker.SN.path.get(ns) ?? null;
  }

  static rmFunction(fnName: string): void {
    const index = FunctionLinker.SN.fns.findIndex(
      (fn) => getFnName(fn.node.name) === fnName,
    );
    if (index !== -1) {
      FunctionLinker.SN.fns.splice(index, 1);
    }
  }

  static reset(): void {
    FunctionLinker.SN.fns = [];
    FunctionLinker.SN.path.clear();
  }
}
