export enum ExceptionType {
  None,
  Abort,
  Throw,
  Unreachable
}

export namespace ExceptionState {
  export let Failed: boolean = false;
  export let Type: ExceptionType = ExceptionType.None;
}

export namespace AbortState {
  export let msg: string | null = null;
  export let fileName: string | null = null;
  export let lineNumber: i32 = -1;
  export let columnNumber: i32 = -1;
  function reset(): void {
    ExceptionState.Failed = false;
    AbortState.msg = null;
    AbortState.fileName = null;
    AbortState.lineNumber = -1;
    AbortState.columnNumber = -1;
  }
}

export namespace ErrorState {
  export let message: string = "";
  export let name: string = "";
  export let stack: string | null = null;
  function reset(): void {
    ExceptionState.Failed = false;
    ErrorState.message = "";
    ErrorState.name = "";
    ErrorState.stack = null;
  }
}

export class Exception {
  public type: ExceptionType;
  // Abort
  public msg: string | null = AbortState.msg;
  public fileName: string | null = AbortState.fileName;
  public lineNumber: i32 = AbortState.lineNumber;
  public columnNumber: i32 = AbortState.columnNumber;

  // Error
  public message: string = ErrorState.message;
  public name: string = ErrorState.name;
  public stack: string | null = ErrorState.stack;

  constructor(type: ExceptionType) {
    this.type = type;
  }
  toString(): string {
    let out = "";
    if (this.type == ExceptionType.Abort) {
      out = "abort";
      if (AbortState.msg) out += ": " + AbortState.msg!;
      if (AbortState.fileName) out += " in " + AbortState.fileName!;
      if (AbortState.lineNumber) out += ` in (${AbortState.lineNumber}:${AbortState.columnNumber})`;
    }
    return out;
  }
}