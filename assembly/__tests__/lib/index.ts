export function describe(description: string, routine: () => void): void {
  routine();
}

export function expect(left: string): Expectation {
  return new Expectation(left);
}

class Expectation {
  public left: string;

  constructor(left: string) {
    this.left = left;
  }
  toBe(right: string): void {
    console.log("  (expected) -> " + right);
    console.log("  (received) -> " + this.left);
    if (this.left != right) {
      process.exit(1);
    }
  }
}
