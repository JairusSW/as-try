import { Transform } from "assemblyscript/dist/transform.js";
import { Node, Range } from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "./visitor.js";
import { toString } from "./util.js";
import { Exception, ExceptionType } from "./types.js";
class TryTransform extends Visitor {
    foundExceptions = [];
    visitTryStatement(node, ref) {
        console.log("Found try: " + toString(node));
        this.foundExceptions = [];
        let exceptions = [];
        for (const stmt of node.bodyStatements) {
            this.visit(stmt);
            if (!this.foundExceptions.length)
                continue;
            const baseException = this.foundExceptions[0];
            const ex = new Exception(getExceptionType(baseException), baseException, stmt);
            console.log("Found base exception: " + toString(baseException));
            for (let i = 1; i < this.foundExceptions.length; i++) {
                const childException = this.foundExceptions[i];
                const exChild = new Exception(getExceptionType(childException), childException, stmt);
                ex.children.push(exChild);
                console.log("Found child exception: " + toString(childException));
            }
            exceptions.push(ex);
            this.foundExceptions = [];
        }
        if (!exceptions.length)
            return;
        const tryBlock = Node.createBlockStatement([], new Range(node.bodyStatements[0].range.start, node.bodyStatements[node.bodyStatements.length - 1].range.end));
        for (const stmt of node.bodyStatements) {
            const hasException = exceptions.find((v) => v.base == stmt);
            if (!hasException) {
                tryBlock.statements.push(stmt);
                continue;
            }
            const exceptionNode = hasException.node;
            const exceptionBase = hasException.base;
            const exceptionType = hasException.type;
            const replace = new ExceptionReplacer();
            console.log("node: " + toString(exceptionNode));
            replace.visit(exceptionBase, node.bodyStatements);
        }
        this.foundExceptions = [];
    }
    visitCallExpression(node, ref) {
        const name = node.expression;
        if (name.text == "abort") {
            this.foundExceptions.push(node);
        }
    }
    visitSource(node) {
        super.visitSource(node);
    }
}
class ExceptionReplacer extends Visitor {
    visitCallExpression(node, ref) {
        const name = node.expression;
        if (name.text != "abort")
            return;
        node.expression.text = "__try_abort";
        console.log(toString(node));
        console.log("ref: ", ref);
        if (Array.isArray(ref)) {
            console.log("Ref is an array");
        }
    }
}
export default class Transformer extends Transform {
    afterParse(parser) {
        const transformer = new TryTransform();
        const sources = parser.sources.sort((_a, _b) => {
            const a = _a.internalPath;
            const b = _b.internalPath;
            if (a[0] == "~" && b[0] !== "~") {
                return -1;
            }
            else if (a[0] !== "~" && b[0] == "~") {
                return 1;
            }
            else {
                return 0;
            }
        });
        for (const source of sources) {
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
//# sourceMappingURL=index.js.map