import { __AbortState } from "./types/abort";
import { __ExceptionState, __Exception } from "./types/exception";
import { describe, expect } from "./__tests__/lib";

describe("Should handle immediate abort call", () => {
  do {
    __ExceptionState.Failed = false;
    __AbortState.abort("This should abort");
    break;
  } while (false);

  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: This should abort");
      __ExceptionState.Failed = false;
    }
  }
});

describe("Should execute finally block", () => {
  let finallyExecuted = false;
  do {
    __ExceptionState.Failed = false;
    __AbortState.abort("This should abort");
    break;
  } while (false);
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: This should abort");
      __ExceptionState.Failed = false;
    }
    {
      finallyExecuted = true;
    }
  }
  expect(finallyExecuted.toString()).toBe("true");
});
describe("Should catch abort inside catch block", () => {
  {
    __ExceptionState.Failed = false;
    {
      __ExceptionState.Failed = false;
      __AbortState.abort("This should abort");
      return;
      return;
    }
    if (__ExceptionState.Failed) {
      {
        let e = new __Exception(__ExceptionState.Type);
        __AbortState.abort("Abort from catch block");
        return;
        __ExceptionState.Failed = false;
      }
    }
  }
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: Abort from catch block");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should handle multiple abort calls", () => {
  do {
    __ExceptionState.Failed = false;
    __AbortState.abort("First abort");
    break;
  } while (false);
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: First abort");
      __ExceptionState.Failed = false;
    }
  }
  do {
    __ExceptionState.Failed = false;
    __AbortState.abort("Second abort");
    break;
  } while (false);
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: Second abort");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should handle abort in nested try/catch blocks", () => {
  {
    __ExceptionState.Failed = false;
    {
      __ExceptionState.Failed = false;
      __AbortState.abort("Inner abort");
      return;
      return;
    }
    if (__ExceptionState.Failed) {
      {
        let e = new __Exception(__ExceptionState.Type);
        expect(e.toString()).toBe("abort: Inner abort");
        __AbortState.abort("Outer abort");
        return;
        __ExceptionState.Failed = false;
      }
    }
  }
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: Outer abort");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should handle abort in finally block", () => {
  {
    __ExceptionState.Failed = false;
    {
      __ExceptionState.Failed = false;
      __AbortState.abort("Abort in try block");
      return;
      return;
    }
    if (__ExceptionState.Failed) {
      {
        let e = new __Exception(__ExceptionState.Type);
        expect(e.toString()).toBe("abort: Abort in try block");
        __ExceptionState.Failed = false;
      }
      {
        __AbortState.abort("Abort in finally block");
        return;
      }
    }
  }
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: Abort in finally block");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should handle no errors and execute finally block with abort", () => {
  {
    __ExceptionState.Failed = false;
    {
      __ExceptionState.Failed = false;
    }
    if (__ExceptionState.Failed) {
      {
        __AbortState.abort("Abort in finally");
        return;
      }
    }
  }
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort: Abort in finally");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should handle abort without a message", () => {
  do {
    __ExceptionState.Failed = false;
    __AbortState.abort();
    break;
  } while (false);
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect(e.toString()).toBe("abort");
      __ExceptionState.Failed = false;
    }
  }
});
describe("Should catch abort in nested try block", () => {
  {
    __ExceptionState.Failed = false;
    {
      __ExceptionState.Failed = false;
      __AbortState.abort("Abort inside nested try");
      return;
      return;
    }
    if (__ExceptionState.Failed) {
      {
        let e = new __Exception(__ExceptionState.Type);
        expect(e.toString()).toBe("abort: Abort inside nested try");
        __ExceptionState.Failed = false;
      }
    }
  }
  if (__ExceptionState.Failed) {
    {
      let e = new __Exception(__ExceptionState.Type);
      expect("Final Catch").toBe("abort: This should not execute");
      __ExceptionState.Failed = false;
    }
  }
});
