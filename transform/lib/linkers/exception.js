import { Visitor } from "../lib/visitor.js";
import { Node, } from "assemblyscript/dist/assemblyscript.js";
import { getFnName, isPrimitive, replaceAfter, replaceRef, stripExpr } from "../utils.js";
import { FunctionLinker } from "./function.js";
import { toString } from "../lib/util.js";
const DEBUG = process.env["DEBUG"]
    ? process.env["DEBUG"] == "true"
        ? true
        : false
    : false;
export class ExceptionLinker extends Visitor {
    static SN = new ExceptionLinker();
    loop = null;
    fn = null;
    path = null;
    visitCallExpression(node, ref = null) {
        const fnName = node.expression.kind == 6 ? node.expression.text : node.expression.property.text;
        const path = this.path ? this.path.join(".") + "." : "";
        if (fnName == "abort" || fnName == "unreachable") {
            const newException = fnName == "abort" ?
                Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("AbortState", node.range), Node.createIdentifierExpression("abort", node.range), node.range), null, node.args, node.range)) : Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("UnreachableState", node.range), Node.createIdentifierExpression("unreachable", node.range), node.range), null, node.args, node.range));
            const breakerStmt = this.getBreaker(node);
            if (!Array.isArray(ref))
                replaceRef(node, Node.createBlockStatement([newException, breakerStmt], node.range), ref);
            else
                replaceRef(node, [newException, breakerStmt], ref);
        }
        else {
            const linked = FunctionLinker.getFunction(node.expression, this.path);
            if (!linked)
                return;
            const linkedFn = linked.node;
            if (!linked.linked) {
                const overrideFn = Node.createFunctionDeclaration(Node.createIdentifierExpression("__try_" + linkedFn.name.text, linkedFn.name.range), linkedFn.decorators, linkedFn.flags, linkedFn.typeParameters, linkedFn.signature, linkedFn.body, linkedFn.arrowKind, linkedFn.range);
                replaceRef(linkedFn, [linkedFn, overrideFn], linked.ref);
                linked.linked = true;
                super.visit(overrideFn);
                if (DEBUG)
                    console.log("Linked Fn: " + toString(overrideFn));
            }
            const overrideCall = Node.createExpressionStatement(Node.createCallExpression(Node.createIdentifierExpression(getFnName("__try_" + linkedFn.name.text, linked.path ? Array.from(linked.path.keys()) : null), node.expression.range), node.typeArguments, node.args, node.range));
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
        super.visitCallExpression(node, ref);
    }
    visitThrowStatement(node, ref) {
        const value = node.value;
        if (value.kind != 17 || value.typeName.identifier.text != "Error")
            throw new Error("Exception handling only supports throwing Error classes");
        const newThrow = Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("ErrorState", node.range), Node.createIdentifierExpression("error", node.range), node.range), null, value.args, node.range));
        const breakerStmt = this.getBreaker(node);
        if (!Array.isArray(ref))
            replaceRef(node, Node.createBlockStatement([newThrow, breakerStmt], node.range), ref);
        else
            replaceRef(node, [newThrow, breakerStmt], ref);
    }
    visitFunctionDeclaration(node, isDefault, ref) {
        this.fn = node;
        super.visit(node.body, node);
        this.fn = null;
        super.visit(node.name, node);
        super.visit(node.decorators, node);
        super.visit(node.typeParameters, node);
        super.visit(node.signature, node);
    }
    visitWhileStatement(node, ref) {
        this.loop = node;
        super.visit(node.body, node);
        this.loop = null;
        super.visit(node.condition, node);
    }
    visitDoStatement(node, ref) {
        this.loop = node;
        super.visit(node.body, node);
        this.loop = null;
        super.visit(node.condition, node);
    }
    visitForStatement(node, ref) {
        this.loop = node;
        super.visit(node.body, node);
        this.loop = null;
        super.visit(node.initializer, node);
        super.visit(node.condition, node);
        super.visit(node.incrementor, node);
    }
    getBreaker(node) {
        let breakStmt = Node.createReturnStatement(null, node.range);
        if (this.fn) {
            const returnType = toString(this.fn.signature.returnType);
            if (DEBUG)
                console.log("Return Type: " + returnType);
            if (returnType != "void" && returnType != "never") {
                breakStmt = Node.createReturnStatement(isPrimitive(returnType)
                    ? returnType == "f32" || returnType == "f64"
                        ? Node.createFloatLiteralExpression(0, node.range)
                        : Node.createIntegerLiteralExpression(i64_zero, node.range)
                    : Node.createCallExpression(Node.createIdentifierExpression("changetype", node.range), [this.fn.signature.returnType], [Node.createIntegerLiteralExpression(i64_zero, node.range)], node.range), node.range);
            }
            if (DEBUG)
                console.log("Return: " + toString(breakStmt));
        }
        else if (this.loop) {
            breakStmt = Node.createBreakStatement(null, node.range);
            if (DEBUG)
                console.log("Break: " + toString(breakStmt));
        }
        else {
            if (DEBUG)
                console.log("Return: " + toString(breakStmt));
            return breakStmt;
        }
    }
    static replace(node) {
        ExceptionLinker.SN.fn = null;
        ExceptionLinker.SN.loop = null;
        ExceptionLinker.SN.path = null;
        const source = Array.isArray(node) ? node[0].range.source : node.range.source;
        ExceptionLinker.SN.visit(node);
    }
}
//# sourceMappingURL=exception.js.map