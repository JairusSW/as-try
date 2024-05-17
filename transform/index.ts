import {Tokenizer, Source, BlockStatement } from "assemblyscript/dist/assemblyscript";
import { Transform} from "assemblyscript/dist/transform.js";
import { IdentifierExpression, IfStatement, NodeKind, TryStatement } from "assemblyscript/dist/assemblyscript.js";
import { Parser } from "assemblyscript/dist/assemblyscript.js";
import { toString } from "visitor-as/dist/utils.js";
import { SimpleParser } from "visitor-as/dist/index.js";
import { SourceKind } from "types:assemblyscript/src/ast";
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

                    const tryBlock = SimpleParser.parseStatement(`{${tryStmts.map(v => toString(v) + "\n")}}`) as BlockStatement;
                    
                    const catchBlock = catchStmts ? new IfStatement(
                        new IdentifierExpression(
                            "__TRY_FAIL",
                            false,
                            stmt.range
                        ),
                        SimpleParser.parseStatement(`{let e = "hello";${catchStmts.map(v => toString(v) + ";")}}`) as BlockStatement,
                        null,
                        stmt.range
                    ) : null;
                    const finallyBlock = finallyStmts ? SimpleParser.parseStatement(`{${finallyStmts.map(v => toString(v) + "\n")}}`) as BlockStatement : null;

                    let placement = i;
                    source.statements.splice(i, 1, tryBlock);
                    console.log(`Catch Block: ${toString(catchBlock)}`)
                    if (catchBlock) source.statements.splice(++placement, 0, catchBlock);
                    if (finallyBlock) source.statements.splice(++placement, 0, finallyBlock);
                    console.log("Final file:")
                    for (const stmt of source.statements) {
                        console.log(toString(stmt));
                    }
                }
            }

            console.log(source.simplePath);
        }
    }
}