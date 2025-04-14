import { Node, Range, } from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./lib/visitor.js";
import { toString } from "./lib/util.js";
import { replaceRef } from "./utils.js";
import { FunctionLinker } from "./linkers/function.js";
import { ExceptionLinker } from "./linkers/exception.js";
const DEBUG = process.env["DEBUG"]
    ? process.env["DEBUG"] == "true"
        ? true
        : false
    : false;
export class TryTransform extends Visitor {
    searching = false;
    foundExceptions = [];
    overrideFns = [];
    baseStatements = [];
    visitTryStatement(node, ref) {
        this.baseStatements = node.bodyStatements;
        if (DEBUG)
            console.log("Found try: " + toString(node));
        this.foundExceptions = [];
        const beforeTry = Node.createExpressionStatement(Node.createBinaryExpression(101, Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), Node.createFalseExpression(node.range), node.range));
        const hasBaseException = node.bodyStatements.some((v) => {
            if (!v)
                return false;
            if (v.kind == 9
                && v.expression.kind == 6
                && (v.expression.text == "abort"
                    ||
                        v.expression.text == "unreachable"))
                return true;
            if (v.kind == 45)
                return true;
            return false;
        });
        if (DEBUG)
            console.log("Has Base Exception: " + hasBaseException);
        const tryBlock = Node.createBlockStatement([beforeTry, ...node.bodyStatements], new Range(this.baseStatements[0]?.range.start || node.range.start, this.baseStatements[this.baseStatements.length - 1]?.range.end ||
            node.range.end));
        const tryLoop = hasBaseException ? Node.createDoStatement(tryBlock, Node.createFalseExpression(node.range), new Range(this.baseStatements[0]?.range.start || node.range.start, this.baseStatements[this.baseStatements.length - 1]?.range.end ||
            node.range.end)) : null;
        ExceptionLinker.replace(tryLoop || tryBlock);
        if (DEBUG)
            console.log("Before Try: " + toString(beforeTry));
        if (DEBUG)
            console.log("Try Block/Loop: " + toString(tryLoop || tryBlock));
        const catchVar = Node.createVariableStatement(null, [
            Node.createVariableDeclaration(node.catchVariable, null, 16, null, Node.createNewExpression(Node.createSimpleTypeName("Exception", node.range), null, [
                Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Type", node.range), node.range),
            ], node.range), node.range),
        ], node.range);
        let catchBlock = Node.createIfStatement(Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), Node.createBlockStatement([
            ...[
                node.catchStatements
                    ? Node.createBlockStatement([catchVar, ...node.catchStatements, beforeTry], new Range(node.catchStatements[0]?.range.start || node.range.start, node.catchStatements[node.catchStatements.length - 1]?.range.end || node.range.end))
                    : null,
                node.finallyStatements?.length
                    ? Node.createBlockStatement(node.finallyStatements, new Range(node.finallyStatements[0]?.range.start || node.range.start, node.finallyStatements[node.finallyStatements.length - 1]?.range.end || node.range.end))
                    : null,
            ].filter((v) => v != null),
        ], node.range), null, node.range);
        if (DEBUG)
            console.log("Catch Block: " + toString(catchBlock));
        replaceRef(node, [tryLoop || tryBlock, catchBlock], ref);
    }
    visitSource(node) {
        FunctionLinker.visit(node);
        super.visitSource(node);
    }
}
//# sourceMappingURL=transform.js.map