import { BlockStatement } from "assemblyscript/dist/assemblyscript.js";
import { Transform } from "assemblyscript/dist/transform.js";
import { TrueExpression, FalseExpression, IdentifierExpression, IfStatement, Token, BinaryExpression, NodeKind, TryStatement, Range } from "assemblyscript/dist/assemblyscript.js";
import { RangeTransform } from "visitor-as/dist/transformRange.js"
import { Parser } from "assemblyscript/dist/assemblyscript.js";
import { toString } from "visitor-as/dist/utils.js";
import { SimpleParser } from "visitor-as/dist/index.js";
import { CallExpression, Expression } from "types:assemblyscript/src/ast";
export default class TryCatchTransform extends Transform {
    afterParse(parser: Parser): void | Promise<void> {
        for (const source of parser.sources) {
            if (source.isLibrary) continue;
            for (let i = 0; i < source.statements.length; i++) {
                const stmt = source.statements[i]!;
                if (stmt.kind === NodeKind.Try) {
                    const tryStmt = stmt as TryStatement;
                    console.log(toString(tryStmt))

                    const tryStmts = tryStmt.bodyStatements;
                    const catchStmts = tryStmt.catchStatements;
                    const finallyStmts = tryStmt.finallyStatements;
                    //const catchVar = tryStmt.catchVariable;
                    console.dir(tryStmts[0], { depth: 3 });
                    const t = new BinaryExpression(
                        Token.Equals,
                        new IdentifierExpression(
                            "__TRY_CATCH_ERRORS",
                            false,
                            new Range(113, 131)
                        ),
                        new TrueExpression(new Range(134, 138)),
                        new Range(113, 138)
                    );
                    console.dir(t, { depth: 3 });
                    tryStmts.unshift(t);/*
                    tryStmts.push(new BinaryExpression(
                        Token.Equals,
                        new IdentifierExpression(
                            "__TRY_CATCH_ERRORS",
                            false,
                            new Range(0, 0)
                        ),
                        new FalseExpression(new Range(0, 0)),
                        new Range(113, 138)
                    ));*/
                    const tryBlock = new BlockStatement(tryStmts, new Range(0, 0));

                    const catchBlock = catchStmts ? new BlockStatement(catchStmts, new Range(0, 0)) : null;
                    const finallyBlock = finallyStmts ? new BlockStatement(finallyStmts, new Range(0, 0)) as BlockStatement : null;

                    let placement = i;
                    source.statements.splice(i, 1, tryBlock);
                    console.log(`Catch Block: ${toString(catchBlock)}`)
                    if (catchBlock) source.statements.splice(++placement, 0, catchBlock);
                    if (finallyBlock) source.statements.splice(++placement, 0, finallyBlock);
                    console.log("Final file:")
                    for (const stmt of source.statements) {
                        console.log(toString(stmt));
                    }
                } else if (stmt.kind === NodeKind.Call) {
                    console.log(toString(stmt))
                }
            }

            console.log(source.simplePath);
        }
    }
}