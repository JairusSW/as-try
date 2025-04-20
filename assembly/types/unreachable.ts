import { __ExceptionState, __ExceptionType } from "./exception";

export namespace __UnreachableState {
  // @ts-ignore: inline
  @inline export function reset(): void {
    __ExceptionState.Failed = false;
  }
  // @ts-ignore: inline
  export function unreachable(): void {
    __ExceptionState.Failed = true;
    __ExceptionState.Type = __ExceptionType.Unreachable;
  }
}