import { Visitor } from "../lib/visitor.js";
import { Node } from "assemblyscript/dist/assemblyscript.js";
import { isPrimitive, replaceAfter, replaceRef, stripExpr } from "../utils.js";
import { FunctionLinker } from "./function.js";
import { toString } from "../lib/util.js";
const DEBUG = process.env["DEBUG"] ? process.env["DEBUG"] == "true" ? true : false : false;
export class ExceptionLinker extends Visitor {
    static SN = new ExceptionLinker();
    fn = null;
    visitCallExpression(node, ref = null) {
        const fnName = node.expression;
        if (fnName.text == "abort") {
            const newException = Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("AbortState", node.range), Node.createIdentifierExpression("abort", node.range), node.range), null, node.args, node.range));
            let returnStmt = Node.createReturnStatement(null, node.range);
            if (this.fn) {
                const returnType = toString(this.fn.signature.returnType);
                if (DEBUG)
                    console.log("Return Type: " + returnType);
                if (returnType != "void" && returnType != "never") {
                    returnStmt = Node.createReturnStatement(isPrimitive(returnType)
                        ? returnType == "f32" || returnType == "f64"
                            ? Node.createFloatLiteralExpression(0, node.range)
                            : Node.createIntegerLiteralExpression(i64_zero, node.range)
                        : Node.createCallExpression(Node.createIdentifierExpression("changetype", node.range), [this.fn.signature.returnType], [Node.createIntegerLiteralExpression(i64_zero, node.range)], node.range), node.range);
                    if (DEBUG)
                        console.log("Return: " + toString(returnStmt));
                }
            }
            if (DEBUG)
                console.log("Return: " + toString(returnStmt));
            if (!Array.isArray(ref))
                replaceRef(node, Node.createBlockStatement([newException, returnStmt], node.range), ref);
            else
                replaceRef(node, [newException, returnStmt], ref);
        }
        else {
            const linked = FunctionLinker.getFunction(fnName.text);
            if (!linked)
                return;
            const linkedFn = linked.node;
            if (!linked.linked) {
                const overrideFn = Node.createFunctionDeclaration(Node.createIdentifierExpression("__try_" + linkedFn.name.text, linkedFn.name.range), linkedFn.decorators, linkedFn.flags, linkedFn.typeParameters, linkedFn.signature, linkedFn.body, linkedFn.arrowKind, linkedFn.range);
                replaceRef(linkedFn, [linkedFn, overrideFn], linked.ref);
                linked.linked = true;
                this.visit(overrideFn);
                if (DEBUG)
                    console.log("Linked Fn: " + toString(overrideFn));
            }
            const overrideCall = Node.createExpressionStatement(Node.createCallExpression(Node.createIdentifierExpression("__try_" + fnName.text, node.expression.range), node.typeArguments, node.args, node.range));
            const remainingStmts = Array.isArray(ref)
                ? ref.findIndex((v) => stripExpr(v) == stripExpr(node))
                : -1;
            if (remainingStmts != -1 && remainingStmts < ref.length) {
                const errorCheck = Node.createIfStatement(Node.createUnaryPrefixExpression(95, Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), node.range), Node.createBlockStatement(ref.slice(remainingStmts + 1), node.range), null, node.range);
                if (DEBUG)
                    console.log("Error Check:" + toString(errorCheck));
                super.visitBlockStatement(errorCheck.ifTrue, errorCheck);
                replaceAfter(node, [overrideCall, errorCheck], ref);
            }
            else {
                replaceRef(node, overrideCall, ref);
            }
            if (DEBUG)
                console.log("Link: " + toString(overrideCall));
        }
    }
    visitFunctionDeclaration(node, isDefault, ref) {
        this.fn = node;
        super.visitFunctionDeclaration(node, isDefault, ref);
        this.fn = null;
    }
    static replace(node) {
        ExceptionLinker.SN.visit(node);
    }
}
//# sourceMappingURL=exception.js.map