export namespace AbortState {
  export let failed: boolean = false;
  export let msg: string | null = null;
  export let fileName: string | null = null;
  export let lineNumber: i32 = 0;
  export let columnNumber: i32 = 0;
}