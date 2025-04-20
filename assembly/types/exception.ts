import { __AbortState } from "./abort";
import { __ErrorState } from "./error";

export enum __ExceptionType {
  None,
  Abort,
  Error,
  Unreachable,
}

export namespace __ExceptionState {
  export let Failed: boolean = false;
  export let Type: __ExceptionType = __ExceptionType.None;
}

export class __Exception {
  public type: __ExceptionType;
  // Abort
  public msg: string | null = __AbortState.msg;
  public fileName: string | null = __AbortState.fileName;
  public lineNumber: i32 = __AbortState.lineNumber;
  public columnNumber: i32 = __AbortState.columnNumber;

  // Error
  public message: string = __ErrorState.message;
  public name: string = __ErrorState.name;
  public stack: string | null = __ErrorState.stack;

  constructor(type: __ExceptionType) {
    this.type = type;
  }
  toString(): string {
    let out = "";
    if (this.type == __ExceptionType.Abort) {
      out = "abort";
      if (__AbortState.msg) out += ": " + __AbortState.msg!;
      if (__AbortState.fileName) out += " in " + __AbortState.fileName!;
      if (__AbortState.lineNumber)
        out += ` in (${__AbortState.lineNumber}:${__AbortState.columnNumber})`;
    } else if (this.type == __ExceptionType.Unreachable) {
      out = "unreachable";
    } else if (this.type == __ExceptionType.Error) {
      out = "Error: " + __ErrorState.message;
    }
    return out;
  }
}
