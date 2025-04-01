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
    if (!node || !ref)
        return;
    const nodeExpr = stripExpr(node);
    if (Array.isArray(ref)) {
        for (let i = 0; i < ref.length; i++) {
            if (stripExpr(ref[i]) === nodeExpr) {
                if (Array.isArray(replacement))
                    ref.splice(i, 1, ...replacement);
                else
                    ref[i] = replacement;
                return;
            }
        }
    }
    else if (typeof ref === 'object') {
        for (const key of Object.keys(ref)) {
            const current = ref[key];
            if (Array.isArray(current)) {
                for (let i = 0; i < current.length; i++) {
                    if (stripExpr(current[i]) === nodeExpr) {
                        if (Array.isArray(replacement))
                            current.splice(i, 1, ...replacement);
                        else
                            current[i] = replacement;
                        return;
                    }
                }
            }
            else if (stripExpr(current) === nodeExpr) {
                ref[key] = replacement;
                return;
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
export function isPrimitive(type) {
    const primitiveTypes = ["u8", "u16", "u32", "u64", "i8", "i16", "i32", "i64", "f32", "f64", "bool", "boolean"];
    return primitiveTypes.some((v) => type.startsWith(v));
}
//# sourceMappingURL=util.js.map