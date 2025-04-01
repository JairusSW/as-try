import { ExceptionState, ExceptionType } from "./exception";

export namespace UnreachableState {
  // @ts-ignore: inline
  @inline export function reset(): void {
    ExceptionState.Failed = false;
  }
  // @ts-ignore: inline
  export function unreachable(): void {
    ExceptionState.Failed = true;
    ExceptionState.Type = ExceptionType.Unreachable;
  }
}