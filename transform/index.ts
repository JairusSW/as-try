import { Transform } from "assemblyscript/dist/transform.js";
import {
    Parser,
    Node,
    Tokenizer,
    Source,
    SourceKind,
    CommonFlags,
    NodeKind,

    TryStatement,
    FunctionDeclaration,
    CallExpression,
    IdentifierExpression
} from "assemblyscript/dist/assemblyscript.js";

import { BaseVisitor } from "visitor-as/dist/index.js";

class TryCatchVisitor extends BaseVisitor {
    private stopNextVisit = false;
    visitFunctionDeclaration(node: FunctionDeclaration): void {
        if (node.name.text === "__try_abort") this.stopNextVisit = true;
    }
    visitCallExpression(node: CallExpression): void {
        if (this.stopNextVisit) {
            this.stopNextVisit = false;
            return;
        }

        if ((node.expression as IdentifierExpression).text != "abort") return;
        node.expression = Node.createIdentifierExpression(
            "__try_abort",
            node.range,
            false
        );
    }
    visitSource(node: Source): void {
        super.visitSource(node);
    }
}
export default class TryCatchTransform extends Transform {
    afterParse(parser: Parser): void | Promise<void> {
        const visitor = new TryCatchVisitor();
        for (const source of parser.sources) {
            let hasTryStmt = false;
            if (source.isLibrary) continue;
            for (let i = 0; i < source.statements.length; i++) {
                const stmt = source.statements[i]!;
                if (stmt.kind === NodeKind.Try) {
                    hasTryStmt = true;
                    const tryStmt = stmt as TryStatement;

                    const tryStmts = tryStmt.bodyStatements;
                    const catchStmts = tryStmt.catchStatements;
                    const finallyStmts = tryStmt.finallyStatements;

                    const catchVar = tryStmt.catchVariable;

                    if (catchStmts) {
                        const catch_on = parser.parseStatement(
                            new Tokenizer(
                                new Source(
                                    SourceKind.User,
                                    "__try_catch_transforms.ts",
                                    "__TRY_CATCH_ERRORS = true"
                                )
                            )
                        );
                        tryStmts.unshift(catch_on!);

                        const catch_off = parser.parseStatement(
                            new Tokenizer(
                                new Source(
                                    SourceKind.User,
                                    "__try_catch_transforms.ts",
                                    "__TRY_CATCH_ERRORS = false"
                                )
                            )
                        );

                        tryStmts.push(catch_off!);
                    }

                    const tryBlock = Node.createBlockStatement(
                        tryStmts,
                        source.range
                    );

                    if (catchVar) {
                        catchStmts?.unshift(
                            Node.createVariableStatement(
                                null,
                                [
                                    Node.createVariableDeclaration(
                                        catchVar,
                                        null,
                                        CommonFlags.Let,
                                        null,
                                        Node.createIdentifierExpression(
                                            "__TRY_ERROR",
                                            source.range,
                                            false
                                        ),
                                        source.range
                                    )
                                ],
                                source.range
                            )
                        )
                        /*catchStmts?.push(
                            Node.createBinaryExpression(
                                Token.Equals,
                                Node.createIdentifierExpression(
                                    "__TRY_ERROR",
                                    source.range,
                                    false
                                ),
                                Node.createFalseExpression(
                                    source.range
                                ),
                                source.range
                            )
                        )*/
                    }
                    const catchBlock = catchStmts ? Node.createIfStatement(
                        Node.createIdentifierExpression(
                            "__TRY_FAIL",
                            source.range,
                            false),
                        Node.createBlockStatement(
                            catchStmts,
                            source.range
                        ),
                        null,
                        source.range
                    ) : null;

                    const finallyBlock = finallyStmts ? Node.createBlockStatement(
                        finallyStmts,
                        source.range
                    ) : null;

                    let placement = i;
                    source.statements.splice(i, 1, tryBlock);
                    if (catchBlock) source.statements.splice(++placement, 0, catchBlock);
                    if (finallyBlock) source.statements.splice(++placement, 0, finallyBlock);
                }

                visitor.visitSource(source);
            }
            if (hasTryStmt) {
                hasTryStmt = false;
                const tokenizer = new Tokenizer(
                    new Source(
                        SourceKind.User,
                        source.normalizedPath,
                        `@inline function __try_abort(message: string, fileName: string | null = null, lineNumber: i32 = 0, columnNumber: i32 = 0): void {
                            if (!__TRY_CATCH_ERRORS) abort(message, fileName, lineNumber, columnNumber);
                            __TRY_ERROR = message;
                            __TRY_FAIL = true;
                        }`
                    )
                );
                const parser = new Parser();
                parser.currentSource = source;

                source.statements.unshift(parser.parseTopLevelStatement(tokenizer)!);
            }
        }
    }
}