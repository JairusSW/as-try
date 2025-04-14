import { Visitor } from "../lib/visitor.js";
import { getFnName } from "../utils.js";
export class FunctionData {
    node;
    ref;
    linked = false;
    path;
    constructor(node, ref, path = null) {
        this.node = node;
        this.ref = ref;
        this.path = path;
    }
}
export class FunctionLinker extends Visitor {
    static SN = new FunctionLinker();
    fns = [];
    path = new Map();
    foundException = false;
    visitFunctionDeclaration(node, isDefault, ref) {
        this.foundException = false;
        super.visitFunctionDeclaration(node, isDefault, ref);
        if (this.foundException) {
            const path = this.path.size ? new Map(this.path.entries()) : null;
            this.fns.push(new FunctionData(node, ref, path));
        }
    }
    visitCallExpression(node, ref) {
        const fnName = getFnName(node.expression);
        if (!fnName)
            return super.visitCallExpression(node, ref);
        if (fnName === "abort" || fnName === "unreachable") {
            this.foundException = true;
        }
        super.visitCallExpression(node, ref);
    }
    visitThrowStatement(node, ref) {
        this.foundException = true;
    }
    visitNamespaceDeclaration(node, isDefault, ref) {
        const nsName = node.name.text;
        this.path.set(nsName, node);
        super.visitNamespaceDeclaration(node, isDefault, ref);
        this.path.delete(nsName);
    }
    static visit(source) {
        FunctionLinker.SN.visitSource(source);
    }
    static getFunction(fnName, path = null) {
        const name = getFnName(fnName, path);
        const fn = FunctionLinker.SN.fns.find((v) => {
            const actualName = getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
            return actualName == name;
        }) || null;
        return fn;
    }
    static getNamespace(ns) {
        return FunctionLinker.SN.path.get(ns) ?? null;
    }
    static rmFunction(fnName) {
        const index = FunctionLinker.SN.fns.findIndex((fn) => getFnName(fn.node.name) === fnName);
        if (index !== -1) {
            FunctionLinker.SN.fns.splice(index, 1);
        }
    }
    static reset() {
        FunctionLinker.SN.fns = [];
        FunctionLinker.SN.path.clear();
    }
}
//# sourceMappingURL=function.js.map