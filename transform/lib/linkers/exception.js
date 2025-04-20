import { Visitor } from "../lib/visitor.js";
import { Node, } from "assemblyscript/dist/assemblyscript.js";
import { cloneNode, getFnName, replaceAfter, replaceRef, stripExpr } from "../utils.js";
import { FunctionLinker } from "./function.js";
import { SimpleParser, toString } from "../lib/util.js";
const DEBUG = process.env["DEBUG"]
    ? process.env["DEBUG"] == "true"
        ? true
        : false
    : false;
export class __ExceptionParent {
    exception;
    parent;
    constructor(exception, parent = null) {
        this.exception = exception;
        this.parent = parent;
    }
}
export class __ExceptionLinker extends Visitor {
    static SN = new __ExceptionLinker();
    changed = false;
    fn = null;
    exceptions = [];
    addedImports = new Set();
    visitCallExpression(node, ref = null) {
        const fnName = node.expression.kind == 6 ? node.expression.text : node.expression.property.text;
        if (fnName == "abort" || fnName == "unreachable") {
            if (fnName == "abort")
                this.addedImports.add("__AbortState");
            else
                this.addedImports.add("__UnreachableState");
            const newException = fnName == "abort" ?
                Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("__AbortState", node.range), Node.createIdentifierExpression("abort", node.range), node.range), null, node.args, node.range)) : Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("__UnreachableState", node.range), Node.createIdentifierExpression("unreachable", node.range), node.range), null, node.args, node.range));
            const breakerStmt = this.getBreaker(node, this.fn);
            if (!Array.isArray(ref))
                replaceRef(node, Node.createBlockStatement([newException, breakerStmt], node.range), ref);
            else
                replaceRef(node, [newException, breakerStmt], ref);
        }
        else {
            const linked = FunctionLinker.getFunction(node.expression);
            if (!linked)
                return;
            const linkedFn = linked.node;
            if (linkedFn.name.text != "parse")
                return;
            const overrideCall = Node.createExpressionStatement(Node.createCallExpression(linked.path ?
                SimpleParser.parseExpression(getFnName("__try_" + linkedFn.name.text, linked.path ? Array.from(linked.path.keys()) : null))
                : Node.createIdentifierExpression(getFnName("__try_" + linkedFn.name.text), node.expression.range), node.typeArguments, node.args, node.range));
            const remainingStmts = Array.isArray(ref)
                ? ref.findIndex((v) => stripExpr(v) == stripExpr(node))
                : -1;
            if (remainingStmts != -1 && remainingStmts < ref.length) {
                this.addedImports.add("__ExceptionState");
                const errorCheck = Node.createIfStatement(Node.createUnaryPrefixExpression(95, Node.createPropertyAccessExpression(Node.createIdentifierExpression("__ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), node.range), Node.createBlockStatement(ref.slice(remainingStmts + 1), node.range), null, node.range);
                if (DEBUG)
                    console.log("Error Check:" + toString(errorCheck));
                super.visitBlockStatement(errorCheck.ifTrue, errorCheck);
                replaceAfter(node, [overrideCall, errorCheck], ref);
            }
            else {
                replaceRef(node, overrideCall, ref);
            }
            if (!linked.linked) {
                const linkedBody = linkedFn.body;
                const overrideFn = Node.createFunctionDeclaration(Node.createIdentifierExpression("__try_" + linkedFn.name.text, linkedFn.name.range), linkedFn.decorators, linkedFn.flags, linkedFn.typeParameters, linkedFn.signature, cloneNode(linkedBody), linkedFn.arrowKind, linkedFn.range);
                linked.linked = true;
                console.log("Set Fn " + overrideFn.name.text);
                const lastFn = this.fn;
                this.fn = overrideFn;
                this.fn = lastFn;
                console.log("Release Fn " + overrideFn.name.text);
                if (DEBUG)
                    console.log("Linked Fn: " + toString(overrideFn));
                console.log(toString(this.currentSource));
                console.log("Visit Override Fn: " + "__try_" + linkedFn.name.text);
                super.visit(overrideFn, ref);
                replaceRef(linkedFn, [linkedFn, overrideFn], linked.ref);
                console.log(toString(linkedFn.range.source));
            }
            if (DEBUG)
                console.log("Link: " + toString(overrideCall));
        }
        super.visitCallExpression(node, ref);
    }
    visitThrowStatement(node, ref) {
        const value = node.value;
        if (value.kind != 17 || value.typeName.identifier.text != "Error")
            throw new Error("__Exception handling only supports throwing Error classes");
        this.addedImports.add("__ErrorState");
        const newThrow = Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("__ErrorState", node.range), Node.createIdentifierExpression("error", node.range), node.range), null, value.args, node.range));
        console.log("Fn (Throw): " + toString(this.fn));
        const breaker = this.getBreaker(node, this.fn);
        console.log("Breaker (Throw): " + toString(breaker));
        if (!Array.isArray(ref))
            replaceRef(node, Node.createBlockStatement([newThrow, breaker], node.range), ref);
        else
            replaceRef(node, [newThrow, breaker], ref);
    }
    visitFunctionDeclaration(node, isDefault, ref) {
        console.log("Set Fn " + node.name.text);
        const lastFn = this.fn;
        this.fn = node;
        super.visit(node.body, node);
        console.log("Release Fn " + node.name.text);
        this.fn = lastFn;
        super.visit(node.name, node);
        super.visit(node.decorators, node);
        super.visit(node.typeParameters, node);
        super.visit(node.signature, node);
    }
    getBreaker(node, parent = null) {
        let breakStmt = Node.createReturnStatement(null, node.range);
        if (parent) {
            const returnType = toString(parent.signature.returnType);
            if (DEBUG)
                console.log("Return Type: " + returnType + " derived from " + parent.name.text);
            if (returnType != "void" && returnType != "never") {
                breakStmt = Node.createIfStatement(Node.createCallExpression(Node.createIdentifierExpression("isBoolean", node.range), [parent.signature.returnType], [], node.range), Node.createReturnStatement(Node.createFalseExpression(node.range), node.range), Node.createIfStatement(Node.createCallExpression(Node.createIdentifierExpression("isInteger", node.range), [parent.signature.returnType], [], node.range), Node.createReturnStatement(Node.createIntegerLiteralExpression(i64_zero, node.range), node.range), Node.createIfStatement(Node.createCallExpression(Node.createIdentifierExpression("isFloat", node.range), [parent.signature.returnType], [], node.range), Node.createFloatLiteralExpression(0, node.range), Node.createIfStatement(Node.createBinaryExpression(98, Node.createCallExpression(Node.createIdentifierExpression("isManaged", node.range), [parent.signature.returnType], [], node.range), Node.createCallExpression(Node.createIdentifierExpression("isUnmanaged", node.range), [parent.signature.returnType], [], node.range), node.range), Node.createReturnStatement(Node.createCallExpression(Node.createIdentifierExpression("changetype", node.range), [parent.signature.returnType], [Node.createIntegerLiteralExpression(i64_zero, node.range)], node.range), node.range), Node.createReturnStatement(null, node.range), node.range), node.range), node.range), node.range);
            }
            else {
                breakStmt = Node.createReturnStatement(null, node.range);
            }
        }
        if (DEBUG)
            console.log("Return: " + toString(breakStmt));
        return breakStmt;
    }
    static replace(node) {
        __ExceptionLinker.SN.fn = null;
        __ExceptionLinker.SN.visit(node);
    }
}
//# sourceMappingURL=exception.js.map