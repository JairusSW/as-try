It'll take some typical try/catch syntax like so:

```js
try {
    // Do something
    abort("Failed to execute!");
} catch (e) {
    console.log("Got an error: " + e);
} finally {
    console.log("Gracefully shutting down...");
    exit();
}
```

And transforms it into something along the lines of:

```js
@global let __TRY_CATCH_ERRORS: boolean = false;
@global let __TRY_FAIL: boolean = false;
@global let __TRY_ERROR: u64 = // Pointer to 8 bytes of memory

{
    __TRY_CATCH_ERRORS = true;
    // Do something
    __try_abort("Failed to execute!");
    __TRY_CATCH_ERRORS = false;
}

if (__TRY_FAIL) {
    // Catch Statements
    console.log("Got an error: " + __TRY_ERROR);
}

{
    // Finally Statements
    console.log("Gracefully shutting down...");
    exit();
}

@inline function __try_abort(message: string): void {
    if (!__TRY_CATCH_ERRORS) abort(message);
    __TRY_ERROR = message;
    __TRY_FAIL = true;
}
```