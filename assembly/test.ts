import { JSON } from "json-as";
import { __ErrorState } from "./types/error";
import { foo } from "./foo";

@json
class Vec3 {
  public a: string = "";
}

function abortingFunction(): void {
  abort("Aborted from abortingFunction");
}

try {
  // Do something
  abortingFunction()
  console.log("This should not execute");
} catch (e) {
  console.log("Got an error: " + e.toString());
  // try {
  //   foo();
  // } catch (e) {
  //   console.log("Got another error: " + e.toString());
  // }
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}