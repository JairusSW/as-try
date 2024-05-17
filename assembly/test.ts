let __TRY_CATCH_ERRORS: boolean = false;
let __TRY_FAIL: boolean = false;
let __TRY_ERROR: u64 = 0;

try {
    console.log("try");
    __TRY_FAIL = true;
} catch (e) {
    console.log("hello");
    console.log("error");
} finally {
    console.log("finally");
}

/*
@global let __TRY_CATCH_ERRORS: boolean = false;
@global let __TRY_FAIL: boolean = false;
@global let __TRY_ERROR: u64 = 0;

{
    __TRY_CATCH_ERRORS = true;
    console.log("try");
    __TRY_CATCH_ERRORS = false;
}
if (__TRY_FAIL) {
    const e = changetype<string>(__TRY_ERROR);
    console.log("error");
    console.log(e);
}
{
    console.log("finally");
}
*/