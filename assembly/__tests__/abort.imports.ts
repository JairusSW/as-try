import { __AbortState } from "../types/abort";
import { __Exception, __ExceptionState } from "../types/exception";
export function importedFunction(): void {
  abort("Aborted from importedFunction");
}

export function deepImportedFunction(): void {
  try {
    importedFunction();
  } catch (e) {
    abort("Aborted from deepImportedFunction");
  }
}
