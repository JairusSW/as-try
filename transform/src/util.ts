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

export function replaceRef(node: Node, replacement: Node | Node[], ref: Node | Node[] | null): void {
  if (!node || !ref) return;
  const nodeExpr = stripExpr(node);

  if (Array.isArray(ref)) {
    for (let i = 0; i < ref.length; i++) {
      if (stripExpr(ref[i]) === nodeExpr) {
        if (Array.isArray(replacement)) ref.splice(i, 1, ...replacement);
        else ref[i] = replacement;
        return; // Exit early after replacement
      }
    }
  } else if (typeof ref === 'object') {
    for (const key of Object.keys(ref)) {
      const current = ref[key] as Node | Node[];
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i++) {
          if (stripExpr(current[i]) === nodeExpr) {
            if (Array.isArray(replacement)) current.splice(i, 1, ...replacement);
            else current[i] = replacement;
            return;
          }
        }
      } else if (stripExpr(current) === nodeExpr) {
        ref[key] = replacement;
        return;
      }
    }
  }
}

export function replaceAfter(node: Node, replacement: Node | Node[], ref: Node | Node[] | null): void {
  if (!node || !ref) return;
  const nodeExpr = stripExpr(node);

  if (Array.isArray(ref)) {
    let found = false;
    for (let i = 0; i < ref.length; i++) {
      if (found || stripExpr(ref[i]) === nodeExpr) {
        ref.splice(i, ref.length - i, ...(Array.isArray(replacement) ? replacement : [replacement]));
        return;
      }
    }
  } else if (typeof ref === 'object') {
    for (const key of Object.keys(ref)) {
      const current = ref[key] as Node | Node[];
      if (Array.isArray(current)) {
        let found = false;
        for (let i = 0; i < current.length; i++) {
          if (found || stripExpr(current[i]) === nodeExpr) {
            current.splice(i, current.length - i, ...(Array.isArray(replacement) ? replacement : [replacement]));
            return;
          }
        }
      } else if (stripExpr(current) === nodeExpr) {
        ref[key] = replacement;
        return;
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

export function isPrimitive(type: string): boolean {
  const primitiveTypes = ["u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64", "f32", "f64", "bool", "boolean"];
  return primitiveTypes.some((v) => type.startsWith(v));
}