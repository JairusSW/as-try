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
  foo()
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