import {
  BlockStatement,
  CommonFlags,
  DoStatement,
  FunctionDeclaration,
  IfStatement,
  Node,
  Source,
  Token,
  TryStatement,
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./lib/visitor.js";
import { toString } from "./lib/util.js";
import { hasOnlyCalls, replaceRef } from "./utils.js";
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

    let tryBlock: BlockStatement | DoStatement;
    let catchBlock: IfStatement;
    let finallyBlock: BlockStatement | DoStatement;

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

    // if (DEBUG) console.log("Has Base Exception: " + hasBaseException)

    tryBlock = hasOnlyCalls(node.bodyStatements)
      ? Node.createBlockStatement(
        [beforeTry, ...node.bodyStatements],
        node.range
      )
      : Node.createDoStatement(
        Node.createBlockStatement(
          [beforeTry, ...node.bodyStatements],
          node.range
        ),
        Node.createFalseExpression(node.range),
        node.range
      );

    ExceptionLinker.replace(tryBlock);

    if (DEBUG) console.log("Try Block/Loop: " + toString(tryBlock));

    if (node.catchStatements?.length) {
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

      catchBlock = Node.createIfStatement(
        Node.createPropertyAccessExpression(
          Node.createIdentifierExpression("__ExceptionState", node.range),
          Node.createIdentifierExpression("Failed", node.range),
          node.range,
        ),
        Node.createBlockStatement(
          [catchVar, ...node.catchStatements, beforeTry],
          node.range
        ),
        null,
        node.range
      );

      if (DEBUG) console.log("Catch Block: " + toString(catchBlock));
    }

    if (node.finallyStatements) {
      finallyBlock = Node.createBlockStatement(
        node.finallyStatements,
        node.range
      );

      if (DEBUG) console.log("Finally Block: " + toString(finallyBlock));
    }

    replaceRef(node, [tryBlock, catchBlock, finallyBlock].filter(v => v != null), ref);
    super.visit([tryBlock, catchBlock, finallyBlock]);
  }
  visitSource(node: Source): void {
    super.visitSource(node);
    // if (DEBUG) console.log("Source: " + toString(node));
  }
}
