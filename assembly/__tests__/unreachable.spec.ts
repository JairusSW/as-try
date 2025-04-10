import { UnreachableState } from "../types/unreachable";
import { ExceptionState, Exception } from "../types/exception";
import { describe, expect } from "./lib";

describe("Should handle immediate unreachable call", () => {
  try {
    unreachable();
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should execute finally block", () => {
  let finallyExecuted = false;

  try {
    unreachable();
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  } finally {
    finallyExecuted = true;
  }

  expect(finallyExecuted.toString()).toBe("true");
});

describe("Should catch unreachable inside catch block", () => {
  try {
    try {
      unreachable();
    } catch (e) {
      unreachable();
    }
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should handle multiple unreachable calls", () => {
  try {
    unreachable();
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }

  try {
    unreachable();
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should handle unreachable in nested try/catch blocks", () => {
  try {
    try {
      unreachable();
    } catch (e) {
      expect(e.toString()).toBe("unreachable");
      unreachable();
    }
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should handle unreachable in finally block", () => {
  try {
    try {
      unreachable();
    } catch (e) {
      expect(e.toString()).toBe("unreachable");
    } finally {
      unreachable();
    }
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should handle no errors and execute finally block with unreachable", () => {
  try {
    try {
      // No error thrown here
    } finally {
      unreachable();
    }
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should handle unreachable without a message", () => {
  try {
    unreachable();
  } catch (e) {
    expect(e.toString()).toBe("unreachable");
  }
});

describe("Should catch unreachable in nested try block", () => {
  try {
    try {
      unreachable();
    } catch (e) {
      expect(e.toString()).toBe("unreachable");
    }
  } catch (e) {
    expect("Final Catch").toBe("unreachable");
  }
});
