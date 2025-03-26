import { Transform } from "assemblyscript/dist/transform.js";
import {
  Parser,
  Node,
  Source,
  TryStatement,
  IdentifierExpression,
  NodeKind,
  Range
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";
import { toString } from "./util.js";
import { CallExpression, FunctionDeclaration, ThrowStatement } from "types:assemblyscript/src/ast";
import { Exception, ExceptionType } from "./types.js";

class TryTransform extends Visitor {
  public foundExceptions: Node[] = [];
  visitTryStatement(node: TryStatement, ref?: Node | null): void {
    console.log("Found try: " + toString(node));
    this.foundExceptions = [];

    let exceptions: Exception[] = [];

    for (const stmt of node.bodyStatements) {
      this.visit(stmt);
      if (!this.foundExceptions.length) continue;

      const baseException = this.foundExceptions[0];
      const ex = new Exception(getExceptionType(baseException), baseException, stmt);
      console.log("Found base exception: " + toString(baseException));

      for (let i = 1; i < this.foundExceptions.length; i++) {
        const childException = this.foundExceptions[i];
        const exChild = new Exception(getExceptionType(childException), childException, stmt);
        ex.children.push(exChild);

        console.log("Found child exception: " + toString(childException));
      }
      
      exceptions.push(ex);
      this.foundExceptions = [];
    }

    if (!exceptions.length) return;

    const tryBlock = Node.createBlockStatement([], new Range(
      node.bodyStatements[0].range.start,
      node.bodyStatements[node.bodyStatements.length - 1].range.end
    ));

    for (const stmt of node.bodyStatements) {
      const hasException = exceptions.find((v) => v.base == stmt);
      if (!hasException) {
        tryBlock.statements.push(stmt);
        continue;
      }

      const exceptionNode = hasException.node;
      const exceptionBase = hasException.base;
      const exceptionType = hasException.type;


      const replacer = new ExceptionReplacer();
      console.log("node: " + toString(exceptionNode))
      // @ts-ignore: type
      replacer.visit(exceptionBase, node.bodyStatements);
    }

    this.foundExceptions = [];
  }
  visitCallExpression(node: CallExpression, ref?: Node | null): void {
    const name = node.expression as IdentifierExpression;
    if (name.text == "abort") {
      this.foundExceptions.push(node);
    }
  }
  visitSource(node: Source): void {
    super.visitSource(node);
  }
}

class ExceptionReplacer extends Visitor {
  
  visitCallExpression(node: CallExpression, ref?: Node | null): void {
    const name = node.expression as IdentifierExpression;
    if (name.text != "abort") return;
    node.expression.text = "__try_abort";
    console.log(toString(node))
    console.log("ref: ", ref);

    if (Array.isArray(ref)) {
      console.log("Ref is an array");

    }
  }
  static replace(exception: Exception, stmts: Node[]): Node[] {
    const replacer = new ExceptionReplacer();

    const exceptionIndex = 
    replacer.visit(exception);
  }
}

export default class Transformer extends Transform {
  afterParse(parser: Parser): void {
    const transformer = new TryTransform();
    const sources = parser.sources.sort((_a, _b) => {
      const a = _a.internalPath;
      const b = _b.internalPath;
      if (a[0] == "~" && b[0] !== "~") {
        return -1;
      } else if (a[0] !== "~" && b[0] == "~") {
        return 1;
      } else {
        return 0;
      }
    });

    for (const source of sources) {
      transformer.currentSource = source;
      transformer.visit(source);
    }
  }
}

function getExceptionType(node: Node): ExceptionType | null {
  if (node.kind == NodeKind.Throw) return ExceptionType.Throw;
  if (node.kind == NodeKind.Call) {
    const name = ((node as CallExpression).expression as IdentifierExpression).text;
    if (name == "abort") return ExceptionType.Abort;
    if (name == "unreachable") return ExceptionType.Unreachable;
  }
  return null;
}

function findRecursive(node: Node, stmts: Node[]): Node {
  // this should search for node and return the stmts index that it was found. use a visitor
}