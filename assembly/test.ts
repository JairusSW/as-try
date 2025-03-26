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
//   if (shouldCrash) {
//     __try_abort("Function 'doSomething' failed to execute properly!");
//     return changetype<string>(0);
//   }
//   return "Operation succeeded in 512ms";
// }

// {
//   const foo = doSomething(false);
//   if (!ExceptionState.Failed) {
//     console.log("This should not execute. Foo: " + foo);
//   }
// }

// if (ExceptionState.Failed) {
//   {
//     let e = new Exception(ExceptionState.Type);
//     console.log("Got an error: " + e.toString());
//   }
//   {
//     console.log("Gracefully shutting down...");
//     process.exit(0);
//   }
// }

function __try_abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
  ExceptionState.Failed = true;
  ExceptionState.Type = ExceptionType.Abort;

  AbortState.msg = msg;
  AbortState.fileName = fileName;
  AbortState.lineNumber = lineNumber;
  AbortState.columnNumber = columnNumber;
}