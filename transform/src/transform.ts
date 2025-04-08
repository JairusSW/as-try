import { CallExpression, CommonFlags, FunctionDeclaration, Node, Range, Source, Token, TryStatement } from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./lib/visitor.js";
import { toString } from "./lib/util.js"
import { replaceRef } from "./utils.js";
import { FunctionLinker } from "./linkers/function.js";
import { ExceptionLinker } from "./linkers/exception.js";

const DEBUG = process.env["DEBUG"] ? process.env["DEBUG"] == "true" ? true : false : false;

export class TryTransform extends Visitor {
  public searching: boolean = false;
  public foundExceptions: Node[] = [];
  public overrideFns: FunctionDeclaration[] = [];
  public baseStatements: Node[] = [];
  visitTryStatement(node: TryStatement, ref?: Node | Node[] | null): void {
    this.baseStatements = node.bodyStatements;
    if (DEBUG) console.log("Found try: " + toString(node));
    this.foundExceptions = [];

    const beforeTry = Node.createExpressionStatement(
      Node.createBinaryExpression(
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
        Node.createFalseExpression(node.range),
        node.range
      )
    );

    const tryBlock = Node.createBlockStatement(node.bodyStatements, new Range(
      this.baseStatements[0]?.range.start || node.range.start,
      this.baseStatements[this.baseStatements.length - 1]?.range.end || node.range.end
    ));
    ExceptionLinker.replace(tryBlock);

    if (DEBUG) console.log("Before Try: " + toString(beforeTry));

    if (DEBUG) console.log("Try Block: " + toString(tryBlock));

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
          node.catchStatements ? Node.createBlockStatement([catchVar, ...node.catchStatements], new Range(
            node.catchStatements[0].range.start,
            node.catchStatements[node.catchStatements.length - 1].range.end
          )) : null,
          node.finallyStatements?.length ? Node.createBlockStatement(node.finallyStatements, new Range(
            node.finallyStatements[0].range.start,
            node.finallyStatements[node.finallyStatements.length - 1].range.end
          )) : null
        ].filter((v) => v != null)
      ], node.range),
      null,
      node.range
    );

    if (DEBUG) console.log("Catch Block: " + toString(catchBlock));
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
    FunctionLinker.visit(node);
    super.visitSource(node);
    FunctionLinker.reset();
    if (DEBUG) console.log("Source: " + toString(node));
  }
}
