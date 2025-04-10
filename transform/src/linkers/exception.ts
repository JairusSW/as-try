import { Visitor } from "../lib/visitor.js";
import {
  Node,
  CallExpression,
  IdentifierExpression,
  FunctionDeclaration,
  ReturnStatement,
  Token,
  Statement,
  BlockStatement,
  BreakStatement,
  DoStatement,
  ForStatement,
  NodeKind,
  NewExpression,
} from "assemblyscript/dist/assemblyscript.js";
import { blockify, isPrimitive, replaceAfter, replaceRef, stripExpr } from "../utils.js";
import { FunctionLinker } from "./function.js";
import { toString } from "../lib/util.js";
import { ThrowStatement, WhileStatement } from "types:assemblyscript/src/ast";

const DEBUG = process.env["DEBUG"]
  ? process.env["DEBUG"] == "true"
    ? true
    : false
  : false;

export class ExceptionLinker extends Visitor {
  static SN: ExceptionLinker = new ExceptionLinker();

  public loop: DoStatement | WhileStatement | ForStatement | null = null;
  public fn: FunctionDeclaration | null = null;

  visitCallExpression(
    node: CallExpression,
    ref: Node | Node[] | null = null,
  ): void {
    const fnName = node.expression as IdentifierExpression; // Can also be PropertyAccessExpression

    if (fnName.text == "abort" || fnName.text == "unreachable") {
      const newException = fnName.text == "abort" ?
        Node.createExpressionStatement(
          Node.createCallExpression(
            Node.createPropertyAccessExpression(
              Node.createIdentifierExpression("AbortState", node.range),
              Node.createIdentifierExpression("abort", node.range),
              node.range,
            ),
            null,
            node.args,
            node.range,
          ),
        ) : Node.createExpressionStatement(
          Node.createCallExpression(
            Node.createPropertyAccessExpression(
              Node.createIdentifierExpression("UnreachableState", node.range),
              Node.createIdentifierExpression("unreachable", node.range),
              node.range,
            ),
            null,
            node.args,
            node.range,
          ),
        );

      const breakerStmt = this.getBreaker(node);

      if (!Array.isArray(ref))
        replaceRef(
          node,
          Node.createBlockStatement([newException, breakerStmt], node.range),
          ref,
        );
      else replaceRef(node, [newException, breakerStmt], ref);
    } else {
      const linked = FunctionLinker.getFunction(fnName.text);
      if (!linked) return;
      const linkedFn = linked.node;

      if (!linked.linked) {
        const overrideFn = Node.createFunctionDeclaration(
          Node.createIdentifierExpression(
            "__try_" + linkedFn.name.text,
            linkedFn.name.range,
          ),
          linkedFn.decorators,
          linkedFn.flags,
          linkedFn.typeParameters,
          linkedFn.signature,
          linkedFn.body,
          linkedFn.arrowKind,
          linkedFn.range,
        );

        replaceRef(linkedFn, [linkedFn, overrideFn], linked.ref);
        linked.linked = true;

        this.visit(overrideFn);
        if (DEBUG) console.log("Linked Fn: " + toString(overrideFn));
      }

      const overrideCall = Node.createExpressionStatement(
        Node.createCallExpression(
          Node.createIdentifierExpression(
            "__try_" + fnName.text,
            node.expression.range,
          ),
          node.typeArguments,
          node.args,
          node.range,
        ),
      );

      const remainingStmts = Array.isArray(ref)
        ? ref.findIndex((v) => stripExpr(v) == stripExpr(node))
        : -1;
      // @ts-expect-error
      if (remainingStmts != -1 && remainingStmts < ref.length) {
        const errorCheck = Node.createIfStatement(
          Node.createUnaryPrefixExpression(
            Token.Exclamation,
            Node.createPropertyAccessExpression(
              Node.createIdentifierExpression("ExceptionState", node.range),
              Node.createIdentifierExpression("Failed", node.range),
              node.range,
            ),
            node.range,
          ),
          Node.createBlockStatement(
            (ref as Statement[]).slice(remainingStmts + 1),
            node.range,
          ),
          null,
          node.range,
        );
        if (DEBUG) console.log("Error Check:" + toString(errorCheck));
        super.visitBlockStatement(
          errorCheck.ifTrue as BlockStatement,
          errorCheck,
        );
        replaceAfter(node, [overrideCall, errorCheck], ref);
      } else {
        replaceRef(node, overrideCall, ref);
      }

      if (DEBUG) console.log("Link: " + toString(overrideCall));
    }
  }
  visitThrowStatement(node: ThrowStatement, ref?: Node | Node[] | null): void {
    const value = node.value as NewExpression;
    if (value.kind != NodeKind.New || (value as NewExpression).typeName.identifier.text != "Error") throw new Error("Exception handling only supports throwing Error classes");

    const newThrow = Node.createExpressionStatement(
      Node.createCallExpression(
        Node.createPropertyAccessExpression(
          Node.createIdentifierExpression("ErrorState", node.range),
          Node.createIdentifierExpression("error", node.range),
          node.range,
        ),
        null,
        value.args,
        node.range,
      ),
    );

    const breakerStmt = this.getBreaker(node);
    replaceRef(node, [newThrow, breakerStmt], ref);
  }
  visitFunctionDeclaration(
    node: FunctionDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    this.fn = node;
    super.visitFunctionDeclaration(node, isDefault, ref);
    this.fn = null;
  }
  visitWhileStatement(node: WhileStatement, ref?: Node | Node[] | null): void {
    this.loop = node;
    super.visit(node.body, node);
    this.loop = null;
    super.visit(node.condition, node);
  }
  visitDoStatement(node: DoStatement, ref?: Node | Node[] | null): void {
    this.loop = node;
    super.visit(node.body, node);
    this.loop = null;
    super.visit(node.condition, node);
  }
  visitForStatement(node: ForStatement, ref?: Node | Node[] | null): void {
    this.loop = node;
    super.visit(node.body, node);
    this.loop = null;
    this.visit(node.initializer, node);
    this.visit(node.condition, node);
    this.visit(node.incrementor, node);
  }
  getBreaker(node: Node): ReturnStatement | BreakStatement | null {
    let breakStmt: ReturnStatement | BreakStatement | null = null;

    if (this.fn) {
      breakStmt = Node.createReturnStatement(
        null,
        node.range,
      );

      const returnType = toString(this.fn.signature.returnType);
      if (DEBUG) console.log("Return Type: " + returnType);
      if (returnType != "void" && returnType != "never") {
        breakStmt = Node.createReturnStatement(
          isPrimitive(returnType)
            ? returnType == "f32" || returnType == "f64"
              ? Node.createFloatLiteralExpression(0, node.range)
              : Node.createIntegerLiteralExpression(i64_zero, node.range)
            : Node.createCallExpression(
              Node.createIdentifierExpression("changetype", node.range),
              [this.fn.signature.returnType],
              [Node.createIntegerLiteralExpression(i64_zero, node.range)],
              node.range,
            ),
          node.range,
        );
      }
      if (DEBUG) console.log("Return: " + toString(breakStmt));
    } else if (this.loop) {
      breakStmt = Node.createBreakStatement(
        null,
        node.range,
      );
      if (DEBUG) console.log("Break: " + toString(breakStmt));
    }
    return breakStmt;
  }
  static replace(node: Node | Node[]): void {
    ExceptionLinker.SN.visit(node);
  }
}
