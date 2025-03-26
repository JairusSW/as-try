import { Transform } from "assemblyscript/dist/transform.js";
import {
  Parser,
  Node,
  Source,
  TryStatement,
  IdentifierExpression,
  NodeKind,
  Range,
  Token,
  Statement,
  BlockStatement,
  CommonFlags
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";
import { SimpleParser, toString } from "./util.js";
import { CallExpression, FunctionDeclaration, ThrowStatement } from "types:assemblyscript/src/ast";
import { Exception, ExceptionType } from "./types.js";
import { RangeTransform } from "./range.js";

class TryTransform extends Visitor {
  public searching: boolean = false;
  public foundExceptions: Node[] = [];
  public fns: Map<string, FunctionDeclaration | null> = new Map<string, FunctionDeclaration | null>();
  public baseStatements: Node[] = [];
  visitTryStatement(node: TryStatement, ref?: Node | Node[] | null): void {
    this.baseStatements = node.bodyStatements;
    console.log("Found try: " + toString(node));
    this.foundExceptions = [];

    let exceptions: Exception[] = [];

    this.searching = true;
    for (const stmt of this.baseStatements) {
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
    this.searching = false;

    if (!exceptions.length) return;

    const tryBlock = Node.createBlockStatement([], new Range(
      this.baseStatements[0].range.start,
      this.baseStatements[this.baseStatements.length - 1].range.end
    ));

    
    const catchVar = Node.createVariableStatement(
      null,
      [
        Node.createVariableDeclaration(
          node.catchVariable,
          null,
          CommonFlags.Let,
          null,
          Node.createNewExpression(
            Node.createSimpleTypeName("Exception", node.range),
            null,
            [
              Node.createPropertyAccessExpression(
                Node.createIdentifierExpression(
                  "ExceptionState",
                  node.range
                ),
                Node.createIdentifierExpression(
                  "Type",
                  node.range
                ),
                node.range
              )
            ],
            node.range
          ),
          node.range
        )
      ],
      node.range
    );

    let catchBlock = Node.createIfStatement(
      Node.createPropertyAccessExpression(
        Node.createIdentifierExpression(
          "ExceptionState",
          node.range
        ),
        Node.createIdentifierExpression(
          "Failed",
          node.range
        ),
        node.range
      ),
      Node.createBlockStatement([
        ...[
          Node.createBlockStatement([catchVar, ...node.catchStatements], new Range(
            node.catchStatements[0].range.start,
            node.catchStatements[node.catchStatements.length - 1].range.end
          )),
          node.finallyStatements.length ? Node.createBlockStatement(node.finallyStatements, new Range(
            node.finallyStatements[0].range.start,
            node.finallyStatements[node.finallyStatements.length - 1].range.end
          )) : null
        ].filter((v) => v != null)
      ], node.range),
      null,
      node.range
    );

    this.addTryBlock(exceptions, this.baseStatements, tryBlock);

    this.foundExceptions = [];
    console.log(toString(tryBlock));
    console.log(toString(catchBlock));
    const baseIndex = (ref as Node[]).indexOf(node);
    (ref as Node[]).splice(baseIndex, 1, tryBlock, catchBlock);

    const replacer = new RangeTransform(node);
    replacer.visit(tryBlock);
  }
  visitCallExpression(node: CallExpression, ref?: Node | null): void {
    const fnName = node.expression as IdentifierExpression;
    if (fnName.text == "abort") {
      this.foundExceptions.push(node);
    } else if (this.searching) {
      if (!this.fns.has(fnName.text)) {
        console.log("Could not find function " + fnName.text);
        return;
      }
      const fnRef = this.fns.get(fnName.text);
      if (!fnRef) return;
      this.fns.set(fnName.text, null);
      this.visit(fnRef);
    }
  }
  visitFunctionDeclaration(node: FunctionDeclaration, isDefault?: boolean, ref?: Node | Node[] | null): void {
    super.visitFunctionDeclaration(node, isDefault, ref);
    if (!this.fns.has(node.name.text)) this.fns.set(node.name.text, node);
  }
  visitSource(node: Source): void {
    super.visitSource(node);
  }
  addTryBlock(exceptions: Exception[], statements: Statement[], tryBlock: BlockStatement): void {
    if (!statements.length) return;
    for (const stmt of statements) {
      const hasException = exceptions.find((v) => v.base == stmt);
      if (!hasException) {
        tryBlock.statements.push(stmt);
        continue;
      }

      const exceptionBase = hasException.base;
      const exceptionType = hasException.type;

      if (exceptionType == ExceptionType.Abort) {
        const exceptionNode = hasException.node as CallExpression;
        const exceptionIndex = statements.indexOf(exceptionNode);
        const remainingStatements = (exceptionIndex + 2 < statements.length)
          ? statements.slice(exceptionIndex + 2)
          : [];
        exceptions.splice(exceptionIndex, 1);

        const newException = Node.createExpressionStatement(
          Node.createCallExpression(
            Node.createIdentifierExpression(
              "__try_abort",
              exceptionNode.expression.range
            ),
            null,
            exceptionNode.args,
            exceptionNode.range
          )
        );

        const sucBlock = Node.createIfStatement(
          Node.createUnaryPrefixExpression(
            Token.Exclamation,
            Node.createPropertyAccessExpression(
              Node.createIdentifierExpression(
                "ExceptionState",
                exceptionBase.range
              ),
              Node.createIdentifierExpression(
                "Failed",
                exceptionBase.range
              ),
              exceptionBase.range
            ),
            exceptionBase.range
          ),
          Node.createBlockStatement(
            remainingStatements,
            exceptionBase.range
          ),
          null,
          exceptionBase.range
        );
        tryBlock.statements.push(newException, sucBlock);
        if (exceptions.length && remainingStatements.length) this.addTryBlock(exceptions, remainingStatements, sucBlock.ifTrue as BlockStatement)
        return;
      }
    }
  }
}

export default class Transformer extends Transform {
  afterParse(parser: Parser): void {
    const transformer = new TryTransform();

    for (const source of parser.sources) {
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

class Finder extends Visitor {
  public findNode: Node;
  public foundNode: Node | null = null;
  constructor(findNode: Node) {
    super();
    this.findNode = findNode;
  }
  _visit(node: Node, ref: Node | null): void {
    if (this.foundNode) return;

    if (node == this.findNode) this.foundNode = node;
    else super._visit(node, ref);
  }
}

function findRecursive(node: Node, stmts: Node[]): Node | null {
  for (const stmt of stmts) {
    const finder = new Finder(stmt);
    if (finder.foundNode) return stmt;
  }
  return null;
}