import { AbortState } from "./types/abort";
import { ExceptionState, Exception } from "./types/exception";

// 1st Level Abort
// try {
//   abort("Failed to execute!", "test.ts");
//   console.log("This should not execute");
// } catch (e) {
//   console.log("Got an error: " + e.toString());
// } finally {
//   console.log("Gracefully shutting down...");
//   process.exit(0);
// }

function doSomething(shouldAbort: boolean = false): void {
  if (shouldAbort) abort("Function 'doSomething' failed to execute properly!");
  console.log("This should not execute");
}

// 2nd Level Abort
try {
  doSomething(true);
} catch (e) {
  console.log("Got an error: " + e.toString());
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}