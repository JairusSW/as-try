import {
  CallExpression,
  CommonFlags,
  ExpressionStatement,
  FunctionDeclaration,
  IdentifierExpression,
  Node,
  NodeKind,
  Range,
  Source,
  Token,
  TryStatement,
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./lib/visitor.js";
import { SimpleParser, toString } from "./lib/util.js";
import { replaceRef } from "./utils.js";
import { ExceptionLinker } from "./linkers/exception.js";

const DEBUG = process.env["DEBUG"]
  ? process.env["DEBUG"] == "true"
    ? true
    : false
  : false;

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
          Node.createIdentifierExpression("__ExceptionState", node.range),
          Node.createIdentifierExpression("Failed", node.range),
          node.range,
        ),
        Node.createFalseExpression(node.range),
        node.range,
      ),
    );

    const hasBaseException = node.bodyStatements.some((v) => {
      if (!v) return false;
      if (v.kind == NodeKind.Expression) v = (v as ExpressionStatement).expression;
      if (
        v.kind == NodeKind.Call
        && (v as CallExpression).expression.kind == NodeKind.Identifier
        && (
          ((v as CallExpression).expression as IdentifierExpression).text == "abort"
          ||
          ((v as CallExpression).expression as IdentifierExpression).text == "unreachable"
        )
      ) return true;
      if (v.kind == NodeKind.Throw) return true;
      return false;
    });

    // if (DEBUG) console.log("Has Base Exception: " + hasBaseException)

    const tryBlock = Node.createBlockStatement(
      [beforeTry, ...node.bodyStatements],
      new Range(
        this.baseStatements[0]?.range.start || node.range.start,
        this.baseStatements[this.baseStatements.length - 1]?.range.end ||
        node.range.end,
      ),
    );

    const tryLoop = hasBaseException ? Node.createDoStatement(
      tryBlock,
      Node.createFalseExpression(node.range),
      new Range(
        this.baseStatements[0]?.range.start || node.range.start,
        this.baseStatements[this.baseStatements.length - 1]?.range.end ||
        node.range.end,
      )
    ) : null;

    ExceptionLinker.replace(tryLoop || tryBlock, hasBaseException);

    // if (DEBUG) console.log("Before Try: " + toString(beforeTry));

    if (DEBUG) console.log("Try Block/Loop: " + toString(tryLoop || tryBlock));

    if (node.catchStatements?.length)
      ExceptionLinker.SN.addImport(new Set<string>(["__ExceptionState", "__Exception"]), node.range.source);

    const catchVar = Node.createVariableStatement(
      null,
      [
        Node.createVariableDeclaration(
          node.catchVariable,
          null,
          CommonFlags.Let,
          null,
          Node.createNewExpression(
            Node.createSimpleTypeName("__Exception", node.range),
            null,
            [
              Node.createPropertyAccessExpression(
                Node.createIdentifierExpression("__ExceptionState", node.range),
                Node.createIdentifierExpression("Type", node.range),
                node.range,
              ),
            ],
            node.range,
          ),
          node.range,
        ),
      ],
      node.range,
    );

    let catchBlock = Node.createIfStatement(
      Node.createPropertyAccessExpression(
        Node.createIdentifierExpression("__ExceptionState", node.range),
        Node.createIdentifierExpression("Failed", node.range),
        node.range,
      ),
      Node.createBlockStatement(
        [
          ...[
            node.catchStatements
              ? Node.createBlockStatement(
                [catchVar, ...node.catchStatements, beforeTry],
                new Range(
                  node.catchStatements[0]?.range.start || node.range.start,
                  node.catchStatements[
                    node.catchStatements.length - 1
                  ]?.range.end || node.range.end,
                ),
              )
              : null,
            node.finallyStatements?.length
              ? Node.createBlockStatement(
                node.finallyStatements,
                new Range(
                  node.finallyStatements[0]?.range.start || node.range.start,
                  node.finallyStatements[
                    node.finallyStatements.length - 1
                  ]?.range.end || node.range.end,
                ),
              )
              : null,
          ].filter((v) => v != null),
        ],
        node.range,
      ),
      null,
      node.range,
    );

    if (DEBUG) console.log("Catch Block: " + toString(catchBlock));
    replaceRef(node, [tryLoop || tryBlock, catchBlock], ref);
    super.visit(tryLoop || tryBlock);
    super.visit(catchBlock);
  }
  visitSource(node: Source): void {
    super.visitSource(node);
    // if (DEBUG) console.log("Source: " + toString(node));
  }
}
