import { Parser, Tokenizer, Source } from "assemblyscript/dist/assemblyscript.js";
import { ASTBuilder } from "./builder.js";
export class SimpleParser {
    static get parser() {
        return new Parser();
    }
    static getTokenizer(s, file = "index.ts") {
        return new Tokenizer(new Source(0, file, s));
    }
    static parseExpression(s) {
        const res = this.parser.parseExpression(this.getTokenizer(s));
        if (res == null) {
            throw new Error("Failed to parse the expression: '" + s + "'");
        }
        return res;
    }
    static parseStatement(s, topLevel = false) {
        const res = this.parser.parseStatement(this.getTokenizer(s), topLevel);
        if (res == null) {
            throw new Error("Failed to parse the statement: '" + s + "'");
        }
        return res;
    }
    static parseTopLevelStatement(s, namespace) {
        const res = this.parser.parseTopLevelStatement(this.getTokenizer(s), namespace);
        if (res == null) {
            throw new Error("Failed to parse the top level statement: '" + s + "'");
        }
        return res;
    }
    static parseClassMember(s, _class) {
        let res = this.parser.parseClassMember(this.getTokenizer(s, _class.range.source.normalizedPath), _class);
        if (res == null) {
            throw new Error("Failed to parse the class member: '" + s + "'");
        }
        return res;
    }
}
let isStdlibRegex = /\~lib\/(?:array|arraybuffer|atomics|builtins|crypto|console|compat|dataview|date|diagnostics|error|function|iterator|map|math|number|object|process|reference|regexp|set|staticarray|string|symbol|table|typedarray|vector|rt\/?|bindings\/|shared\/typeinfo)|util\/|uri|polyfills|memory/;
export function isStdlib(s) {
    let source = s instanceof Source ? s : s.range.source;
    return isStdlibRegex.test(source.internalPath);
}
export function toString(node) {
    if (!node)
        return "null";
    if (Array.isArray(node))
        return node.map((v) => toString(v)).join("\n");
    return ASTBuilder.build(node);
}
export function replaceRef(node, replacement, ref) {
    if (!node)
        return;
    const nodeExpr = stripExpr(node);
    if (Array.isArray(ref)) {
        for (let i = 0; i < ref.length; i++) {
            const r = stripExpr(ref[i]);
            if (r == nodeExpr) {
                ref[i] = replacement;
                break;
            }
        }
        const nodeIndex = ref.indexOf(node);
        if (nodeIndex == -1)
            return;
        ref[nodeIndex] = replacement;
    }
    else {
        const keys = Object.keys(ref);
        for (const key of keys) {
            const nV = stripExpr(ref[key]);
            if (nV == nodeExpr) {
                ref[key] = replacement;
                break;
            }
        }
    }
}
export function stripExpr(node) {
    if (!node)
        return node;
    if (node.kind == 38)
        return node["expression"];
    return node;
}
export function nodeEq(a, b) {
    if (!a || !b)
        return false;
    if (!a["kind"] || !b["kind"])
        return false;
    if (a === b)
        return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null)
        return false;
    const keys1 = Object.keys(a);
    const keys2 = Object.keys(b);
    if (keys1 !== keys2)
        return false;
    for (let key of keys1) {
        if (!keys2.includes(key))
            return false;
        if (!nodeEq(a[key], b[key]))
            return false;
    }
    return true;
}
//# sourceMappingURL=util.js.map