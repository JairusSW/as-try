import { Visitor } from "../lib/visitor.js";
import { Node, } from "assemblyscript/dist/assemblyscript.js";
import { cloneNode, getFnName, replaceAfter, replaceRef, stripExpr } from "../utils.js";
import { FunctionLinker } from "./function.js";
import { SimpleParser, toString } from "../lib/util.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
const reservedFns = [
    "changetype",
    "__new",
    "__renew",
    "__link"
];
const DEBUG = process.env["DEBUG"]
    ? process.env["DEBUG"] == "true"
        ? true
        : false
    : false;
export class ExceptionParent {
    exception;
    parent;
    constructor(exception, parent = null) {
        this.exception = exception;
        this.parent = parent;
    }
}
export class ExceptionLinker extends Visitor {
    static SN = new ExceptionLinker();
    changed = false;
    fn = null;
    exceptions = [];
    visitCallExpression(node, ref = null) {
        const fnName = node.expression.kind == 6 ? node.expression.text : node.expression.property.text;
        if (reservedFns.includes(fnName))
            return;
        if (fnName == "abort" || fnName == "unreachable") {
            if (fnName == "abort")
                this.addImport(new Set(["__AbortState"]), node.range.source);
            else
                this.addImport(new Set(["__UnreachableState"]), node.range.source);
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
            const overrideCall = Node.createExpressionStatement(Node.createCallExpression(linked.path ?
                SimpleParser.parseExpression(getFnName("__try_" + linkedFn.name.text, linked.path ? Array.from(linked.path.keys()) : null))
                : Node.createIdentifierExpression(getFnName("__try_" + linkedFn.name.text), node.expression.range), node.typeArguments, node.args, node.range));
            const remainingStmts = Array.isArray(ref)
                ? ref.findIndex((v) => stripExpr(v) == stripExpr(node))
                : -1;
            if (remainingStmts != -1 && remainingStmts < ref.length) {
                this.addImport(new Set(["__ExceptionState"]), node.range.source);
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
        this.addImport(new Set(["__ErrorState"]), node.range.source);
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
    addImport(imports, source) {
        const sourcePath = path.resolve(process.cwd(), source.normalizedPath);
        while (imports.size) {
            let names = [];
            let path = "";
            if (imports.has("__AbortState")) {
                names = ["__AbortState"];
                path = calcPath(sourcePath, "abort");
                imports.delete("__AbortState");
            }
            else if (imports.has("__ExceptionState") && imports.has("__Exception")) {
                names = ["__ExceptionState", "__Exception"];
                path = calcPath(sourcePath, "exception");
                imports.delete("__ExceptionState");
                imports.delete("__Exception");
            }
            else if (imports.has("__ExceptionState")) {
                names = ["__ExceptionState"];
                path = calcPath(sourcePath, "exception");
                imports.delete("__ExceptionState");
            }
            else if (imports.has("__Exception")) {
                names = ["__Exception"];
                path = calcPath(sourcePath, "exception");
                imports.delete("__Exception");
            }
            else if (imports.has("__ErrorState")) {
                names = ["__ErrorState"];
                path = calcPath(sourcePath, "error");
                imports.delete("__ErrorState");
            }
            else if (imports.has("__UnreachableState")) {
                names = ["__UnreachableState"];
                path = calcPath(sourcePath, "unreachable");
                imports.delete("__UnreachableState");
            }
            else {
                return;
            }
            if (hasSameImport(names, path, source))
                continue;
            const importStatement = Node.createImportStatement(names.map(v => Node.createImportDeclaration(Node.createIdentifierExpression(v, source.range), null, source.range)), Node.createStringLiteralExpression(path, source.range), source.range);
            source.statements.unshift(importStatement);
            if (DEBUG) {
                console.log("Import: " + toString(importStatement) + " in " + source.normalizedPath);
            }
        }
    }
    static replace(node) {
        ExceptionLinker.SN.fn = null;
        ExceptionLinker.SN.visit(node);
    }
}
function calcPath(from, toName) {
    const thisFile = fileURLToPath(import.meta.url);
    const baseDir = path.resolve(thisFile, "..", "..", "..", "..");
    let relPath = path.posix.join(...(path.relative(path.dirname(from), path.join(baseDir, "assembly", "types", toName)).split(path.sep))).replace(/^.*node_modules\/as-try/, "as-try");
    if (!relPath.startsWith(".") && !relPath.startsWith("/") && !relPath.startsWith("as-try")) {
        relPath = "./" + relPath;
    }
    return relPath;
}
function hasSameImport(names, pathStr, source) {
    const targetNames = new Set(names);
    return source.statements.some(s => {
        if (s.kind !== 42)
            return false;
        const stmt = s;
        if (path.resolve(stmt.path.value) !== path.resolve(pathStr))
            return false;
        const decls = stmt.declarations;
        if (decls.length !== targetNames.size)
            return false;
        for (const decl of decls) {
            if (!targetNames.has(decl.name.text))
                return false;
        }
        return true;
    });
}
//# sourceMappingURL=exception.js.map