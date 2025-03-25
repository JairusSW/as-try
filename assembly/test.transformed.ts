import { AbortState } from "./types";

try {
  // Do something
  doSomething(true);
  console.log("This should not execute");
} catch (e) {
  console.log("Got an error: " + e);
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}

{
  // Only replace `abort` calls within a try block
  doSomething(true);
  if (!AbortState.failed) {
    console.log("This should not execute");
  } else {
    console.log("Got an error: " + AbortState.msg);
  }
}

{
  // Finally Statements
  console.log("Gracefully shutting down...");
  process.exit(0);
}

function doSomething(shouldCrash: boolean = false): string {
  if (shouldCrash) {
    __try_abort("Function 'doSomething' failed to execute properly!");
    return changetype<string>(0);
  } else {
    return "";
  }
}

@inline function __try_abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
  AbortState.failed = true;

  AbortState.msg = msg;
  AbortState.fileName = fileName;
  AbortState.lineNumber = lineNumber;
  AbortState.columnNumber = columnNumber;
}