import { Transform } from "assemblyscript/dist/transform.js";
import { Node, Range } from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";
import { isPrimitive, replaceAfter, replaceRef, stripExpr, toString } from "./util.js";
import { ExceptionType } from "./types.js";
class FunctionData {
    node;
    ref;
    linked = false;
    constructor(node, ref) {
        this.node = node;
        this.ref = ref;
    }
}
class FunctionLinker extends Visitor {
    static SN = new FunctionLinker();
    fns = [];
    foundException = false;
    visitFunctionDeclaration(node, isDefault, ref) {
        this.foundException = false;
        super.visitFunctionDeclaration(node, isDefault, ref);
        if (!this.foundException)
            return;
        this.fns.push(new FunctionData(node, ref));
    }
    visitCallExpression(node, ref) {
        const fnName = node.expression;
        if (fnName.text == "abort")
            this.foundException = true;
        else
            super.visitCallExpression(node, ref);
    }
    static visit(source) {
        FunctionLinker.SN.visitSource(source);
    }
    static getFunction(fnName) {
        return FunctionLinker.SN.fns.find((v) => v.node.name.text == fnName);
    }
    static rmFunction(fnName) {
        const index = FunctionLinker.SN.fns.findIndex(fn => fn.node.name.text === fnName);
        if (index == -1)
            return;
        FunctionLinker.SN.fns.splice(index, 1);
    }
    static reset() {
        FunctionLinker.SN.fns = [];
    }
}
class ExceptionLinker extends Visitor {
    static SN = new ExceptionLinker();
    fn = null;
    visitCallExpression(node, ref) {
        const fnName = node.expression;
        if (fnName.text == "abort") {
            const newException = Node.createExpressionStatement(Node.createCallExpression(Node.createPropertyAccessExpression(Node.createIdentifierExpression("AbortState", node.range), Node.createIdentifierExpression("abort", node.range), node.range), null, node.args, node.range));
            let returnStmt = Node.createReturnStatement(null, node.range);
            if (this.fn) {
                const returnType = toString(this.fn.signature.returnType);
                console.log("Return Type: " + returnType);
                if (returnType != "void" && returnType != "never") {
                    returnStmt = Node.createReturnStatement(isPrimitive(returnType)
                        ? returnType == "f32" || returnType == "f64"
                            ? Node.createFloatLiteralExpression(0, node.range)
                            : Node.createIntegerLiteralExpression(i64_zero, node.range)
                        : Node.createCallExpression(Node.createIdentifierExpression("changetype", node.range), [this.fn.signature.returnType], [Node.createIntegerLiteralExpression(i64_zero, node.range)], node.range), node.range);
                    console.log("Return: " + toString(returnStmt));
                }
            }
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
                console.log("Linked Fn: " + toString(overrideFn));
            }
            const overrideCall = Node.createExpressionStatement(Node.createCallExpression(Node.createIdentifierExpression("__try_" + fnName.text, node.expression.range), node.typeArguments, node.args, node.range));
            const remainingStmts = Array.isArray(ref)
                ? ref.findIndex((v) => stripExpr(v) == stripExpr(node))
                : -1;
            console.log("Refff: " + toString(ref) + " " + remainingStmts + " " + ref.length);
            if (remainingStmts != -1 && remainingStmts < ref.length) {
                const errorCheck = Node.createIfStatement(Node.createUnaryPrefixExpression(95, Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), node.range), Node.createBlockStatement(ref.slice(remainingStmts + 1), node.range), null, node.range);
                console.log("Error Check:" + toString(errorCheck));
                super.visitBlockStatement(errorCheck.ifTrue, errorCheck);
                replaceAfter(node, [overrideCall, errorCheck], ref);
            }
            else {
                replaceRef(node, overrideCall, ref);
            }
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
class TryTransform extends Visitor {
    searching = false;
    foundExceptions = [];
    overrideFns = [];
    baseStatements = [];
    visitTryStatement(node, ref) {
        this.baseStatements = node.bodyStatements;
        console.log("Found try: " + toString(node));
        this.foundExceptions = [];
        const beforeTry = Node.createExpressionStatement(Node.createBinaryExpression(101, Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), Node.createFalseExpression(node.range), node.range));
        const tryBlock = Node.createBlockStatement(node.bodyStatements, new Range(this.baseStatements[0].range.start, this.baseStatements[this.baseStatements.length - 1].range.end));
        ExceptionLinker.replace(tryBlock);
        console.log("Before Try: " + toString(beforeTry));
        console.log("Try Block: " + toString(tryBlock));
        const catchVar = Node.createVariableStatement(null, [
            Node.createVariableDeclaration(node.catchVariable, null, 16, null, Node.createNewExpression(Node.createSimpleTypeName("Exception", node.range), null, [
                Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Type", node.range), node.range)
            ], node.range), node.range)
        ], node.range);
        let catchBlock = Node.createIfStatement(Node.createPropertyAccessExpression(Node.createIdentifierExpression("ExceptionState", node.range), Node.createIdentifierExpression("Failed", node.range), node.range), Node.createBlockStatement([
            ...[
                Node.createBlockStatement([catchVar, ...node.catchStatements], new Range(node.catchStatements[0].range.start, node.catchStatements[node.catchStatements.length - 1].range.end)),
                node.finallyStatements.length ? Node.createBlockStatement(node.finallyStatements, new Range(node.finallyStatements[0].range.start, node.finallyStatements[node.finallyStatements.length - 1].range.end)) : null
            ].filter((v) => v != null)
        ], node.range), null, node.range);
        console.log("Catch Block: " + toString(catchBlock));
        replaceRef(node, [beforeTry, tryBlock, catchBlock], ref);
    }
    visitCallExpression(node, ref) {
        super.visitCallExpression(node, ref);
    }
    visitSource(node) {
        if (!node.normalizedPath.includes("test.ts"))
            return;
        this.currentSource = node;
        FunctionLinker.visit(node);
        super.visitSource(node);
        FunctionLinker.reset();
        console.log("Source: " + toString(node));
    }
}
export default class Transformer extends Transform {
    afterParse(parser) {
        const transformer = new TryTransform();
        for (const source of parser.sources) {
            transformer.currentSource = source;
            transformer.visit(source);
        }
    }
}
function getExceptionType(node) {
    if (node.kind == 45)
        return ExceptionType.Throw;
    if (node.kind == 9) {
        const name = node.expression.text;
        if (name == "abort")
            return ExceptionType.Abort;
        if (name == "unreachable")
            return ExceptionType.Unreachable;
    }
    return null;
}
class Finder extends Visitor {
    findNode;
    foundNode = null;
    constructor(findNode) {
        super();
        this.findNode = findNode;
    }
    _visit(node, ref) {
        if (this.foundNode)
            return;
        if (node == this.findNode)
            this.foundNode = node;
        else
            super._visit(node, ref);
    }
}
function findRecursive(node, stmts) {
    for (const stmt of stmts) {
        const finder = new Finder(stmt);
        if (finder.foundNode)
            return stmt;
    }
    return null;
}
//# sourceMappingURL=index.js.map