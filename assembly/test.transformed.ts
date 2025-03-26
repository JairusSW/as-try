import {
  AbortState,
  Exception,
  ExceptionState,
  ExceptionType
} from "./types"
{
  __try_abort("Failed to execute!");
  if (!ExceptionState.Failed) {
    console.log("This should not execute");
  }
}
{
  let e = new Exception(ExceptionType.Abort);
  console.log("Got an error: " + e.toString());
}
{
  console.log("Gracefully shutting down...");
  process.exit(0);
}
function __try_abort(msg: string | null = null, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
  ExceptionState.Failed = true;
  AbortState.msg = msg;
  AbortState.fileName = fileName;
  AbortState.lineNumber = lineNumber;
  AbortState.columnNumber = columnNumber;
}