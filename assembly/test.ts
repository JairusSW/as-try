import { AbortState } from "./types";

try {
  // Do something
  abort("Failed to execute!");
  console.log("This should not execute");
} catch (e) {
  console.log("Got an error: " + e);
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}

function doSomething(shouldCrash: boolean = false): string {
  if (shouldCrash) abort("Function 'doSomething' failed to execute properly!");
  return "Operation succeeded in 512ms";
}