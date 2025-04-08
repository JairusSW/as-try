import { Visitor } from "../lib/visitor.js";
export class FunctionData {
    node;
    ref;
    linked = false;
    constructor(node, ref) {
        this.node = node;
        this.ref = ref;
    }
}
export class FunctionLinker extends Visitor {
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
//# sourceMappingURL=function.js.map