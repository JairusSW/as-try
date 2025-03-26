It'll take some typical try/catch syntax like so:

```js
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
```

And transforms it into something along the lines of:

```js
import { AbortState, Exception, ExceptionState, ExceptionType } from "./types";

{
  __try_abort("Failed to execute!", "test.ts");
  if (!ExceptionState.Failed) {
    console.log("This should not execute");
  }
}
{
  let e = new Exception(ExceptionState.Type);
  console.log("Got an error: " + e.toString());
}
{
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
```