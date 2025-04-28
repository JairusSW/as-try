try {
  // Do something
  abort("Failed to execute!", "test.ts");
  console.log("This should not execute");
} catch (e) {
  console.log("Got an error: " + e.toString());
} finally {
  console.log("Gracefully shutting down...");
  process.exit(0);
}