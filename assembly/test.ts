let __TRY_CATCH_ERRORS: boolean = false;
let __TRY_FAIL: boolean = false;
let __TRY_ERROR: string = "";

try {
    // Do something
    abort("Failed to execute!");
} catch (e) {
    console.log("Got an error: " + e);
} finally {
    console.log("Gracefully shutting down...");
}