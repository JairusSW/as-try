import { Visitor } from "../lib/visitor.js";
import { getFnName } from "../utils.js";
export class FunctionData {
    node;
    ref;
    linked = false;
    path;
    import = null;
    constructor(node, ref, path = null) {
        this.node = node;
        this.ref = ref;
        this.path = path;
    }
}
export class SourceData {
    source;
    fns;
    imports;
    constructor(source, fns = [], imports = []) {
        this.source = source;
        this.fns = fns;
        this.imports = imports;
    }
}
export class FunctionLinkerState {
    path;
    sourceData;
    sD;
    visitedSources;
    constructor(path, sourceData, sD, visitedSources) {
        this.path = path;
        this.sourceData = sourceData;
        this.sD = sD;
        this.visitedSources = visitedSources;
    }
}
export class FunctionLinker extends Visitor {
    static SN = new FunctionLinker();
    i = false;
    path = new Map();
    foundException = false;
    sources = [];
    sourceData = [];
    sD;
    visitedSources = new Set();
    visitImportStatement(node, ref) {
        const path = node.internalPath;
        const pathSource = this.sources.find(v => v.internalPath == path) ||
            this.sources.find(v => v.internalPath == path + "/assembly/index") ||
            this.sources.find(v => v.internalPath == path + "/index");
        if (!pathSource)
            return;
        const externSource = this.analyzeSource(pathSource);
        this.sD.imports.push(externSource);
    }
    visitFunctionDeclaration(node, isDefault, ref) {
        this.foundException = false;
        super.visitFunctionDeclaration(node, isDefault, ref);
        if (this.foundException) {
            const path = this.path.size ? new Map(this.path.entries()) : null;
            this.sD.fns.push(new FunctionData(node, ref, path));
            console.log("Added Function: " + node.name.text + " in " + node.range.source.internalPath);
        }
    }
    visitMethodDeclaration(node, ref) {
        this.foundException = false;
        super.visitMethodDeclaration(node, ref);
        if (this.foundException) {
            const path = this.path.size ? new Map(this.path.entries()) : null;
            this.sD.fns.push(new FunctionData(node, ref, path));
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
    visitClassDeclaration(node, isDefault, ref) {
        this.path.set(node.name.text, node);
        super.visitClassDeclaration(node, isDefault, ref);
        this.path.delete(node.name.text);
    }
    visitSource(node, ref) {
        if (!node)
            return;
        if (this.visitedSources.has(node.internalPath))
            return;
        this.sD = new SourceData(node);
        this.sourceData.push(this.sD);
        super.visitSource(node, ref);
        this.visitedSources.add(node.internalPath);
    }
    analyzeSource(node) {
        if (this.visitedSources.has(node.internalPath)) {
            const foundSource = this.sourceData.find(v => v.source.internalPath == node.internalPath);
            if (foundSource)
                return foundSource;
        }
        const state = this.saveState();
        const visitor = new FunctionLinker();
        this.restoreState(state, visitor);
        visitor.visitSource(node);
        this.sourceData = visitor.sourceData;
        return visitor.sD;
    }
    saveState(o = this) {
        return new FunctionLinkerState(this.path, this.sourceData, this.sD, this.visitedSources);
    }
    restoreState(state, o = this) {
        o.path = state.path;
        o.sourceData = state.sourceData;
        o.sD = state.sD;
        o.visitedSources = state.visitedSources;
    }
    static visitSources(sources) {
        FunctionLinker.SN.sources = sources;
        for (const source of sources) {
            FunctionLinker.SN.visitSource(source);
        }
    }
    static getFunction(fnName, path = null) {
        const name = getFnName(fnName, path);
        console.log("Looking for: " + name);
        const source = fnName.range.source;
        const sourceData = FunctionLinker.SN.sourceData.find(v => v.source.internalPath == source.internalPath);
        if (!sourceData)
            console.log("Could not find source data");
        if (!sourceData)
            return null;
        const localFn = sourceData.fns.find((v) => {
            return name == getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
        });
        if (localFn)
            return localFn;
        console.log("Looking in imports: " + sourceData.imports.map(v => v.source.internalPath).join(" "));
        for (const imported of sourceData.imports) {
            console.log(imported.source.internalPath + " " + imported.fns.length);
            const importedFn = imported.fns.find(v => {
                return name == getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
            });
            if (importedFn)
                return importedFn;
        }
        return null;
    }
    static getNamespace(ns) {
        return FunctionLinker.SN.path.get(ns) ?? null;
    }
    static rmFunction(fnName) {
        const index = FunctionLinker.SN.sD.fns.findIndex((fn) => getFnName(fn.node.name) === fnName);
        if (index !== -1) {
            FunctionLinker.SN.sD.fns.splice(index, 1);
        }
    }
    static reset() {
        FunctionLinker.SN.sD.fns = [];
        FunctionLinker.SN.path.clear();
    }
}
//# sourceMappingURL=function.js.map