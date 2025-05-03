import { __ErrorState } from "./types/error";

export function foo(): void {
  throw new Error("Throw from catch");
}