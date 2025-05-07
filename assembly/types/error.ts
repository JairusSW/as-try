import { __ExceptionState, __ExceptionType } from "./exception";

export namespace __ErrorState {
  export let message: string = "";
  export let name: string = "";
  export let stack: string | null = null;
  // @ts-ignore: inline
  @inline export function reset(): void {
    __ExceptionState.Failed = false;
    __ErrorState.message = "";
    __ErrorState.name = "";
    __ErrorState.stack = null;
  }
  // @ts-ignore: inline
  @inline export function error(message: string = ""): void {
    __ExceptionState.Failed = true;
    __ExceptionState.Type = __ExceptionType.Error;

    __ErrorState.message = message;
  }
}