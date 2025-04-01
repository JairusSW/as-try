// Taken from https://github.com/as-pect/visitor-as/blob/master/src/simpleParser.ts
import { Parser, Tokenizer, Source, SourceKind, Expression, Statement, NamespaceDeclaration, ClassDeclaration, DeclarationStatement, Range, Node, NodeKind } from "assemblyscript/dist/assemblyscript.js";
import { ASTBuilder } from "./builder.js";

export class SimpleParser {
  private static get parser(): Parser {
    return new Parser();
  }

  private static getTokenizer(s: string, file: string = "index.ts"): Tokenizer {
    return new Tokenizer(new Source(SourceKind.User, file, s));
  }

  static parseExpression(s: string): Expression {
    const res = this.parser.parseExpression(this.getTokenizer(s));
    if (res == null) {
      throw new Error("Failed to parse the expression: '" + s + "'");
    }
    return res;
  }

  static parseStatement(s: string, topLevel = false): Statement {
    const res = this.parser.parseStatement(this.getTokenizer(s), topLevel);
    if (res == null) {
      throw new Error("Failed to parse the statement: '" + s + "'");
    }
    return res;
  }

  static parseTopLevelStatement(s: string, namespace?: NamespaceDeclaration | null): Statement {
    const res = this.parser.parseTopLevelStatement(this.getTokenizer(s), namespace);
    if (res == null) {
      throw new Error("Failed to parse the top level statement: '" + s + "'");
    }
    return res;
  }

  static parseClassMember(s: string, _class: ClassDeclaration): DeclarationStatement {
    let res = this.parser.parseClassMember(this.getTokenizer(s, _class.range.source.normalizedPath), _class);
    if (res == null) {
      throw new Error("Failed to parse the class member: '" + s + "'");
    }
    return <DeclarationStatement>res;
  }
}

let isStdlibRegex = /\~lib\/(?:array|arraybuffer|atomics|builtins|crypto|console|compat|dataview|date|diagnostics|error|function|iterator|map|math|number|object|process|reference|regexp|set|staticarray|string|symbol|table|typedarray|vector|rt\/?|bindings\/|shared\/typeinfo)|util\/|uri|polyfills|memory/;

export function isStdlib(s: Source | { range: Range }): boolean {
  let source = s instanceof Source ? s : s.range.source;
  return isStdlibRegex.test(source.internalPath);
}

export function toString(node: Node | Node[] | null): string {
  if (!node) return "null";
  if (Array.isArray(node)) return node.map((v) => toString(v)).join("\n");
  return ASTBuilder.build(node);
}

export function replaceRef(node: Node, replacement: Node, ref: Node | Node[] | null): void {
  if (!node) return;
  const nodeExpr = stripExpr(node);
  if (Array.isArray(ref)) {
    for (let i = 0; i < ref.length; i++) {
      const r = stripExpr(ref[i]);
      if (r == nodeExpr) {
        ref[i] = replacement;
        break;
      }
    }
    const nodeIndex = ref.indexOf(node);
    if (nodeIndex == -1) return;
    ref[nodeIndex] = replacement;
  } else {
    const keys = Object.keys(ref);
    for (const key of keys) {
      const nV = stripExpr(ref[key] as Node);
      if (nV == nodeExpr) {
        ref[key] = replacement;
        break;
      }
    }
  }
}

export function stripExpr(node: Node): Node {
  if (!node) return node;
  if (node.kind == NodeKind.Expression) return node["expression"];
  return node;
}

export function nodeEq(a: Node, b: Node): boolean {
  if (!a || !b) return false;
  if (!a["kind"] || !b["kind"]) return false;
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const keys1 = Object.keys(a);
  const keys2 = Object.keys(b);

  if (keys1 !== keys2) return false;

  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!nodeEq(a[key], b[key])) return false;
  }

  return true;
}