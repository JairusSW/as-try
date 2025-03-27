import { ExceptionState, ExceptionType } from "./exception";

export namespace ErrorState {
  export let message: string = "";
  export let name: string = "";
  export let stack: string | null = null;
  // @ts-ignore: inline
  @inline export function reset(): void {
    ExceptionState.Failed = false;
    ErrorState.message = "";
    ErrorState.name = "";
    ErrorState.stack = null;
  }
  // @ts-ignore: inline
  export function error(message: string = ""): void {
    ExceptionState.Failed = true;
    ExceptionState.Type = ExceptionType.Error;

    ErrorState.message = message;
  }
}

new Error