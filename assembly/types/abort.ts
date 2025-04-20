import { __ExceptionState, __ExceptionType } from "./exception";

export namespace __AbortState {
  export let msg: string | null = null;
  export let fileName: string | null = null;
  export let lineNumber: i32 = -1;
  export let columnNumber: i32 = -1;
  // @ts-ignore: inline
  @inline export function reset(): void {
    __ExceptionState.Failed = false;
    __AbortState.msg = null;
    __AbortState.fileName = null;
    __AbortState.lineNumber = -1;
    __AbortState.columnNumber = -1;
  }
  // @ts-ignore: inline
  export function abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
    __ExceptionState.Failed = true;
    __ExceptionState.Type = __ExceptionType.Abort;

    __AbortState.msg = msg;
    __AbortState.fileName = fileName;
    __AbortState.lineNumber = lineNumber;
    __AbortState.columnNumber = columnNumber;
  }
}