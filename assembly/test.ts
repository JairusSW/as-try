try {
    // Do something
    abort("Failed to execute!");
} catch (e) {
    console.log("Got an error: " + e);
} finally {
    console.log("Gracefully shutting down...");
}