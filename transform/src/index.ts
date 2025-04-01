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
  CommonFlags,
  NamedTypeNode,
  ReturnStatement
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";
import { isPrimitive, replaceRef, toString } from "./util.js";
import { CallExpression, FunctionDeclaration, FunctionExpression, ThrowStatement } from "types:assemblyscript/src/ast";
import { Exception, ExceptionType } from "./types.js";
import { RangeTransform } from "./range.js";


class FunctionData {
  public node: FunctionDeclaration;
  public ref: Node | Node[] | null;
  constructor(node: FunctionDeclaration, ref: Node | Node[] | null) {
    this.node = node;
    this.ref = ref;
  }
}

class FunctionLinker extends Visitor {
  static SN: FunctionLinker = new FunctionLinker();
  public fns: FunctionData[] = [];
  public foundException: boolean = false;
  visitFunctionDeclaration(node: FunctionDeclaration, isDefault?: boolean, ref?: Node | Node[] | null): void {
    this.foundException = false
    super.visitFunctionDeclaration(node, isDefault, ref);
    if (!this.foundException) return;
    this.fns.push(new FunctionData(node, ref));
  }
  visitCallExpression(node: CallExpression, ref?: Node | Node[] | null): void {
    const fnName = node.expression as IdentifierExpression;
    if (fnName.text == "abort") this.foundException = true;
    else super.visitCallExpression(node, ref);
  }
  // visitFunctionExpression(node: FunctionExpression, ref?: Node | Node[] | null): void {
  //   this.functions.push(node);
  //   super.visitFunctionExpression(node, ref);
  // }
  static visit(source: Source): void {
    FunctionLinker.SN.visitSource(source);
  }
  static getFunction(fnName: string): FunctionData | null {
    return FunctionLinker.SN.fns.find((v) => v.node.name.text == fnName);
  }
  static rmFunction(fnName: string): void {
    const index = FunctionLinker.SN.fns.findIndex(fn => fn.node.name.text === fnName);
    if (index == -1) return;

    FunctionLinker.SN.fns.splice(index, 1);
  }
  static reset(): void {
    FunctionLinker.SN.fns = [];
  }
}

class ExceptionLinker extends Visitor {
  static SN: ExceptionLinker = new ExceptionLinker();

  public fn: FunctionDeclaration | null = null;

  visitCallExpression(node: CallExpression, ref?: Node | Node[] | null): void {
    const fnName = node.expression as IdentifierExpression; // Can also be PropertyAccessExpression

    if (fnName.text == "abort") {
      const newException = Node.createExpressionStatement(
        Node.createCallExpression(
          Node.createPropertyAccessExpression(
            Node.createIdentifierExpression(
              "AbortState",
              node.range
            ),
            Node.createIdentifierExpression(
              "abort",
              node.range
            ),
            node.range
          ),
          null,
          node.args,
          node.range
        )
      );

      let returnStmt: ReturnStatement = Node.createReturnStatement(null, node.range);

      if (this.fn) {
        // We are inside of a function
        const returnType = toString(this.fn.signature.returnType);
        console.log("Return Type: " + returnType);
        if (returnType != "void" && returnType != "never") {
          returnStmt = Node.createReturnStatement(
            isPrimitive(returnType)
              ? returnType == "f32" || returnType == "f64"
                ? Node.createFloatLiteralExpression(0, node.range)
                : Node.createIntegerLiteralExpression(i64_zero, node.range)
              : Node.createCallExpression(
                Node.createIdentifierExpression(
                  "changetype",
                  node.range
                ),
                [this.fn.signature.returnType],
                [Node.createIntegerLiteralExpression(i64_zero, node.range)],
                node.range
              ),
            node.range
          );
          console.log("Return: " + toString(returnStmt));
        }
      }

      console.log("Return: " + toString(returnStmt));

      if (!Array.isArray(ref))
        replaceRef(node, Node.createBlockStatement([newException, returnStmt], node.range), ref);
      else
        replaceRef(node, [newException, returnStmt], ref);
      console.log("Ref: " + toString(ref));
    } else {
      const linked = FunctionLinker.getFunction(fnName.text);
      if (!linked) return;
      const linkedFn = linked.node;

      const overrideFn = Node.createFunctionDeclaration(
        Node.createIdentifierExpression(
          "__try_" + linkedFn.name.text,
          linkedFn.name.range
        ),
        linkedFn.decorators,
        linkedFn.flags,
        linkedFn.typeParameters,
        linkedFn.signature,
        linkedFn.body,
        linkedFn.arrowKind,
        linkedFn.range
      );

      replaceRef(linkedFn, [linkedFn, overrideFn], linked.ref);

      const overrideCall = Node.createExpressionStatement(
        Node.createCallExpression(
          Node.createIdentifierExpression(
            "__try_" + fnName.text,
            node.expression.range
          ),
          node.typeArguments,
          node.args,
          node.range
        )
      );

      replaceRef(node, overrideCall, ref);

      console.log("Link: " + toString(overrideCall));
      this.visit(overrideFn);
      // source.statements.splice(source.statements.indexOf(linkedFn) + 1, 0, overrideFn);
      console.log("Linked Fn: " + toString(overrideFn));
    }
  }
  visitFunctionDeclaration(node: FunctionDeclaration, isDefault?: boolean, ref?: Node | Node[] | null): void {
    this.fn = node;
    super.visitFunctionDeclaration(node, isDefault, ref);
    this.fn = null;
  }
  static replace(node: Node | Node[]): void {
    ExceptionLinker.SN.visit(node);
  }
}

class TryTransform extends Visitor {
  public searching: boolean = false;
  public foundExceptions: Node[] = [];
  public overrideFns: FunctionDeclaration[] = [];
  public baseStatements: Node[] = [];
  visitTryStatement(node: TryStatement, ref?: Node | Node[] | null): void {
    this.baseStatements = node.bodyStatements;
    console.log("Found try: " + toString(node));
    this.foundExceptions = [];

    const beforeTry = Node.createBinaryExpression(
      Token.Equals,
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
      Node.createIdentifierExpression(
        "false",
        node.range
      ),
      node.range
    );

    const tryBlock = Node.createBlockStatement(node.bodyStatements, new Range(
      this.baseStatements[0].range.start,
      this.baseStatements[this.baseStatements.length - 1].range.end
    ));
    ExceptionLinker.replace(tryBlock);

    console.log("Before Try: " + toString(beforeTry));

    console.log("Try Block: " + toString(tryBlock));

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

    console.log("Catch Block: " + toString(catchBlock));
    replaceRef(node, [beforeTry, tryBlock, catchBlock], ref);
  }
  visitCallExpression(node: CallExpression, ref?: Node | null): void {
    super.visitCallExpression(node, ref);
    // const fnName = node.expression as IdentifierExpression;
    // if (fnName.text == "abort") {
    //   this.foundExceptions.push(node);
    //   return;
    // }

    // const linkedFn = FunctionLinker.getFunction(fnName.text);
    // if (linkedFn) {
    //   console.log("Linked Call: " + toString(FunctionLinker.getFunction(fnName.text)));
    //   const overrideFn = this.genTryableFn(linkedFn);
    //   FunctionLinker.replace(linkedFn, ...[linkedFn, overrideFn]);
    // }
  }
  visitSource(node: Source): void {
    if (!node.normalizedPath.includes("test.ts")) return;
    this.currentSource = node;
    FunctionLinker.visit(node);
    super.visitSource(node);
    FunctionLinker.reset();
    console.log("Source: " + toString(node));
  }
  // genTryableFn(node: FunctionDeclaration): FunctionDeclaration {
  //   const body = this.replaceCalls(node.body);
  //   const newFn = Node.createFunctionDeclaration(
  //     Node.createIdentifierExpression(
  //       "__try_" + node.name.text,
  //       node.range
  //     ),
  //     null,
  //     node.flags,
  //     node.typeParameters,
  //     node.signature,
  //     body,
  //     node.arrowKind,
  //     node.range
  //   );
  //   return newFn;
  // }
  // replaceCalls(node: Statement): Statement[] {

  // }
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
            Node.createPropertyAccessExpression(
              Node.createIdentifierExpression(
                "AbortState",
                exceptionNode.range
              ),
              Node.createIdentifierExpression(
                "abort",
                exceptionNode.range
              ),
              exceptionNode.range
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