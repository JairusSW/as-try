import { AbortState } from "./types";

{
  // Try Block
  // Only replace `abort` calls within a try block
  abort("Failed to execute!");
  if (!AbortState.failed) {
    console.log("This should not execute");
  }
}
{
  // Catch Block
  if (AbortState.failed) {
    // Reset abort status
    AbortState.failed = false;
    console.log("Got an error: " + AbortState.msg!);
  }
}
{
  // Finally Block
  console.log("Gracefully shutting down...");
  process.exit(0);
}

function doSomething(shouldCrash: boolean = false): string {
  if (shouldCrash) {
    __try_abort("Function 'doSomething' failed to execute properly!");
    return changetype<string>(0); // This would need to change later. 
  } else {
    return "Operation succeeded in 512ms";
  }
}

@inline function __try_abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
  AbortState.failed = true;
  AbortState.msg = msg;
  AbortState.fileName = fileName;
  AbortState.lineNumber = lineNumber;
  AbortState.columnNumber = columnNumber;
}