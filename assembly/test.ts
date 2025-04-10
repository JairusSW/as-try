import { JSON } from "json-as";
import { AbortState } from "./types/abort";
import { ExceptionState, Exception } from "./types/exception";
import { ErrorState } from "./types/error";

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
try {
  throw new Error("This is an error");
} catch (e) {
  console.log("Got an error: " + e.toString());
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}

// function doSomething(shouldAbort: boolean = false): void {
//   if (shouldAbort) {
//     abort("Function 'doSomething' failed to execute properly!");
//   }
//   console.log("'doSomething' executed");
// }

// // 2nd Level Abort
// try {
//   doSomething(false);
//   console.log("First exception passed");
//   doSomething(true);
//   console.log("Second exception passed")
// } catch (e) {
//   console.log("Got an error: " + e.toString());
// } finally {
//   console.log("Gracefully shutting down...");
//   process.exit(0);
// }
