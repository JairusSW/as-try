import { AbortState, Exception, ExceptionState, ExceptionType } from "./types";

try {
  // Do something
  abort("Failed to execute!", "test.ts");
  console.log("This should not execute");
} catch (e) {
  console.log("Got an error: " + e.toString());
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}

// function doSomething(shouldCrash: boolean = false): string {
//   if (shouldCrash) abort("Function 'doSomething' failed to execute properly!");
//   return "Operation succeeded in 512ms";
// }

function __try_abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
  ExceptionState.Failed = true;
  ExceptionState.Type = ExceptionType.Abort;

  AbortState.msg = msg;
  AbortState.fileName = fileName;
  AbortState.lineNumber = lineNumber;
  AbortState.columnNumber = columnNumber;
}