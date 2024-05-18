let __TRY_CATCH_ERRORS: boolean = false;
let __TRY_FAIL: boolean = false;
let __TRY_ERROR: string = ""
try {
    __TRY_CATCH_ERRORS = true;
    console.log("try");
} catch (e) {
        console.log("catch");
} finally {
    console.log("finally");
}

function __try_abort(message: string): void {
    if (!__TRY_CATCH_ERRORS) abort(message);
    __TRY_ERROR = message;
    __TRY_FAIL = true;
}