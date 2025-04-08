export var ExceptionType;
(function (ExceptionType) {
  ExceptionType[(ExceptionType["Throw"] = 0)] = "Throw";
  ExceptionType[(ExceptionType["Abort"] = 1)] = "Abort";
  ExceptionType[(ExceptionType["Unreachable"] = 2)] = "Unreachable";
})(ExceptionType || (ExceptionType = {}));
export class Exception {
  type;
  node;
  base;
  children;
  constructor(type, node, base, children = []) {
    this.type = type;
    this.node = node;
    this.base = base;
    this.children = children;
  }
}
//# sourceMappingURL=types.js.map
