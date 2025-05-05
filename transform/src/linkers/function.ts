import {
  Node,
  FunctionDeclaration,
  CallExpression,
  Source,
  ThrowStatement,
  NamespaceDeclaration,
  Expression,
  ClassDeclaration,
  ImportStatement,
  MethodDeclaration,
  CommonFlags,
} from "assemblyscript/dist/assemblyscript.js";
import { Visitor } from "../lib/visitor.js";
import { getFnName } from "../utils.js";

const DEBUG = process.env["DEBUG"]
  ? process.env["DEBUG"] == "true"
    ? true
    : false
  : false;

export class FunctionData {
  public node: FunctionDeclaration;
  public ref: Node | Node[] | null;
  public linked: boolean = false;
  public path: Map<string, NamespaceDeclaration> | null;
  public exported: boolean = false;
  public imported: boolean = false;

  constructor(node: FunctionDeclaration, ref: Node | Node[] | null, exported: boolean = false, path: Map<string, NamespaceDeclaration> = null) {
    this.node = node;
    this.ref = ref;
    this.path = path;
  }
  clone(): FunctionData {
    const fn = new FunctionData(this.node, this.ref, this.path);
    fn.linked = this.linked;
    fn.imported = this.imported;
    return fn;
  }
}

export class SourceData {
  public source: Source;
  public fns: FunctionData[];
  public imports: SourceData[];
  constructor(source: Source, fns: FunctionData[] = [], imports: SourceData[] = []) {
    this.source = source;
    this.fns = fns;
    this.imports = imports;
  }
}

export class FunctionLinkerState {
  public path: Map<string, NamespaceDeclaration | ClassDeclaration>;
  public sourceData: SourceData[];
  public sD: SourceData;
  public visitedSources: Set<string>;
  constructor(
    path: Map<string, NamespaceDeclaration | ClassDeclaration>,
    sourceData: SourceData[],
    sD: SourceData,
    visitedSources: Set<string>
  ) {
    this.path = path;
    this.sourceData = sourceData;
    this.sD = sD
    this.visitedSources = visitedSources;
  }
}

export class FunctionLinker extends Visitor {
  static SN: FunctionLinker = new FunctionLinker();

  public i: boolean = false;
  public path: Map<string, NamespaceDeclaration | ClassDeclaration> = new Map();
  public foundException: boolean = false;
  public sources: Source[] = [];
  public sourceData: SourceData[] = [];

  public sD!: SourceData;

  private visitedSources: Set<string> = new Set<string>();

  visitImportStatement(node: ImportStatement, ref?: Node | Node[] | null): void {
    const path = node.internalPath;
    const pathSource =
      this.sources.find(v => v.internalPath == path) ||
      this.sources.find(v => v.internalPath == path + "/assembly/index") ||
      this.sources.find(v => v.internalPath == path + "/index");

    if (!pathSource) return;

    const externSource = this.analyzeSource(pathSource);
    this.sD.imports.push(externSource);
  }

  visitFunctionDeclaration(
    node: FunctionDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    super.visitFunctionDeclaration(node, isDefault, ref);

    if (this.foundException) {
      const path = this.path.size ? new Map<string, NamespaceDeclaration | ClassDeclaration>(this.path.entries()) : null;
      this.sD.fns.push(new FunctionData(node, ref, (node.flags & CommonFlags.Export) ? true : false, path));
      if (DEBUG) console.log("Added Function: " + node.name.text + " in " + node.range.source.internalPath);
      this.foundException = false;
    }
  }

  visitMethodDeclaration(node: MethodDeclaration, ref?: Node | Node[] | null): void {
    this.foundException = false;
    super.visitMethodDeclaration(node, ref);

    if (this.foundException) {
      const path = this.path.size ? new Map<string, NamespaceDeclaration | ClassDeclaration>(this.path.entries()) : null;
      this.sD.fns.push(new FunctionData(node, ref, false, path)); // I should really check if the class is exported and if the method is public
    }
  }

  visitCallExpression(node: CallExpression, ref?: Node | Node[] | null): void {
    const fnName = getFnName(node.expression);
    if (!fnName) return super.visitCallExpression(node, ref);

    if (fnName === "abort" || fnName === "unreachable") {
      this.foundException = true;
    }

    super.visitCallExpression(node, ref);
  }

  visitThrowStatement(node: ThrowStatement, ref?: Node | Node[] | null): void {
    this.foundException = true;
  }

  visitNamespaceDeclaration(
    node: NamespaceDeclaration,
    isDefault?: boolean,
    ref?: Node | Node[] | null,
  ): void {
    const nsName = node.name.text;
    // console.log("Namespace: " + (this.path.size ? Array.from(this.path.keys()).join(".") + "."  : "") + nsName)
    this.path.set(nsName, node);
    super.visitNamespaceDeclaration(node, isDefault, ref);
    this.path.delete(nsName);
  }

  visitClassDeclaration(node: ClassDeclaration, isDefault?: boolean, ref?: Node | Node[] | null): void {
    this.path.set(node.name.text, node);
    super.visitClassDeclaration(node, isDefault, ref);
    this.path.delete(node.name.text);
  }

  visitSource(node: Source, ref?: Node | Node[] | null): void {
    if (!node) return;
    if (this.visitedSources.has(node.internalPath)) return;

    // const sourceData = new SourceData(node);
    this.sD = new SourceData(node);
    this.sourceData.push(this.sD);
    super.visitSource(node, ref);
    this.visitedSources.add(node.internalPath);
  }

  analyzeSource(node: Source): SourceData {
    if (this.visitedSources.has(node.internalPath)) {
      const foundSource = this.sourceData.find(v => v.source.internalPath == node.internalPath);
      if (foundSource) return foundSource;
    }

    const state = this.saveState();
    const visitor = new FunctionLinker();
    this.restoreState(state, visitor);

    visitor.visitSource(node);

    this.sourceData = visitor.sourceData;

    return visitor.sD;
  }

  saveState(o: FunctionLinker = this): FunctionLinkerState {
    return new FunctionLinkerState(this.path, this.sourceData, this.sD, this.visitedSources);
  }

  restoreState(state: FunctionLinkerState, o: FunctionLinker = this): void {
    o.path = state.path;
    o.sourceData = state.sourceData;
    o.sD = state.sD;
    o.visitedSources = state.visitedSources;
  }

  static visitSources(sources: Source[]): void {
    FunctionLinker.SN.sources = sources;
    for (const source of sources) {
      if (source.internalPath.startsWith("~lib/rt")) continue;
      if (source.internalPath.startsWith("~lib/performance")) continue;
      if (source.internalPath.startsWith("~lib/wasi_")) continue;
      if (source.internalPath.startsWith("~lib/shared/")) continue;
      if (source.internalPath.startsWith("~lib/performance")) continue;
      // console.log("Linker Visiting: " + source.internalPath);
      FunctionLinker.SN.visitSource(source);
    }
  }

  // static getFunction(fnName: Expression, path: string[] | null = null): FunctionData | null {
  //   const name = getFnName(fnName, path);
  //   const fn = FunctionLinker.SN.sD.fns.find((v) => {
  //     const actualName = getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
  //     return actualName == name;
  //   }) || null;
  //   return fn;
  // }

  static getFunction(fnName: Expression, path: string[] | null = null): FunctionData | null {
    const name = getFnName(fnName, path);
    // console.log("Looking for: " + name);
    const source = fnName.range.source;
    const sourceData = FunctionLinker.SN.sourceData.find(v => v.source.internalPath == source.internalPath);
    // if (!sourceData) console.log("Could not find source data");
    if (!sourceData) return null;

    const localFn = sourceData.fns.find((v) => {
      return name == getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
    });

    if (localFn) return localFn;

    // console.log("Looking in imports: " + sourceData.imports.map(v => v.source.internalPath).join(" "))
    for (const imported of sourceData.imports) {
      // console.log(imported.source.internalPath + " " + imported.fns.length)
      let importedFn = imported.fns.find(v => {
        return v.exported && name == getFnName(v.node.name, v.path ? Array.from(v.path.keys()) : null);
      });
      if (importedFn) {
        importedFn = importedFn.clone();
        importedFn.imported = true;
        return importedFn;
      }
    }

    return null;
  }

  static getNamespace(ns: string): NamespaceDeclaration | null {
    return FunctionLinker.SN.path.get(ns) ?? null;
  }

  static rmFunction(fnName: string): void {
    const index = FunctionLinker.SN.sD.fns.findIndex(
      (fn) => getFnName(fn.node.name) === fnName,
    );
    if (index !== -1) {
      FunctionLinker.SN.sD.fns.splice(index, 1);
    }
  }

  static reset(): void {
    FunctionLinker.SN.sD.fns = [];
    FunctionLinker.SN.path.clear();
  }
}
