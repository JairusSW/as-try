import { AbortState } from "../types/abort";
import { ExceptionState, Exception } from "../types/exception";
import { describe, expect } from "./lib";

describe("Should handle immediate abort call", () => {
  try {
    abort("This should abort");
  } catch (e) {
    expect(e.toString()).toBe("This should abort");
  }
});

describe("Should execute finally block", () => {
  let finallyExecuted = false;

  try {
    abort("This should abort");
  } catch (e) {
    expect(e.toString()).toBe("This should abort");
  } finally {
    finallyExecuted = true;
  }

  expect(finallyExecuted.toString()).toBe("true");
});

describe("Should catch abort inside catch block", () => {
  try {
    try {
      abort("This should abort");
    } catch (e) {
      abort("Abort from catch block");
    }
  } catch (e) {
    expect(e.toString()).toBe("Abort from catch block");
  }
});

describe("Should handle multiple abort calls", () => {
  try {
    abort("First abort");
  } catch (e) {
    expect(e.toString()).toBe("First abort");
  }

  try {
    abort("Second abort");
  } catch (e) {
    expect(e.toString()).toBe("Second abort");
  }
});

describe("Should handle abort in nested try/catch blocks", () => {
  try {
    try {
      abort("Inner abort");
    } catch (e) {
      expect(e.toString()).toBe("Inner abort");
      abort("Outer abort");
    }
  } catch (e) {
    expect(e.toString()).toBe("Outer abort");
  }
});

describe("Should handle abort in finally block", () => {
  try {
    try {
      abort("Abort in try block");
    } catch (e) {
      expect(e.toString()).toBe("Abort in try block");
    } finally {
      abort("Abort in finally block");
    }
  } catch (e) {
    expect(e.toString()).toBe("Abort in finally block");
  }
});

describe("Should handle no errors and execute finally block with abort", () => {
  try {
    try {
      // No error thrown here
    } finally {
      abort("Abort in finally");
    }
  } catch (e) {
    expect(e.toString()).toBe("Abort in finally");
  }
});

describe("Should handle abort without a message", () => {
  try {
    abort();
  } catch (e) {
    expect(e.toString()).toBe("abort");
  }
});

describe("Should catch abort in nested try block", () => {
  try {
    try {
      abort("Abort inside nested try");
    } catch (e) {
      expect(e.toString()).toBe("Abort inside nested try");
    }
  } catch (e) {
    // This block should not be reached
    expect("Final Catch").toBe("This should not execute");
  }
});