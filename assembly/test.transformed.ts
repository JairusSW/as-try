import { AbortState } from "./types/abort";
import { ExceptionState, Exception } from "./types/exception";

// 1st Level Abort
// ExceptionState.Failed = false;
// {
//   AbortState.abort("Failed to execute!", "test.ts");
//   if (!ExceptionState.Failed) {
//     console.log("This should not execute");
//   }
// }
// if (ExceptionState.Failed) {
//   {
//     let e = new Exception(ExceptionState.Type);
//     console.log("Got an error: " + e.toString());
//   }
//   {
//     console.log("Finished");
//   }
// }
export function example(): void {
  do {
    console.log("Hey")
    if (true) break;
    console.log("skipped")
  } while (0)

  console.log('LOL')
}


function doSomething(shouldAbort: boolean = false): string {
  doSomethingElse(shouldAbort);
  if (ExceptionState.Failed) return changetype<string>(4294967295);
  return "Function 'doSomething' executed properly";
}

function doSomethingElse(shouldAbort: boolean = false): void {
  if (shouldAbort) {
    AbortState.abort("Function 'doSomething' failed to execute properly!");
    // Since it's void, I can return here or jump to the branch
    return;
  }
  console.log("This should not execute");
}

// 2nd Level Abort
ExceptionState.Failed = false;
{
  const foo = doSomething((false));
  if (!ExceptionState.Failed) console.log(foo);
}
if (ExceptionState.Failed) {
  {
    let e = new Exception(ExceptionState.Type);
    console.log("Got an error: " + e.toString());
  }
  {
    console.log("Finished");
  }
}