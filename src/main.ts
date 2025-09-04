import './style.css'
import {CodeGen} from "./codegen.ts";
import {DrawnLexer, TokenType} from "./lexer.ts";
import {TransformContext} from "./transform.ts";

interface ISvgCommand {
    command: string;
    params?: any[];
}

const getContext = (canvasId: string): CanvasRenderingContext2D|null => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement|null;
    if (!canvas) {
        return null;
    }

    return canvas.getContext("2d");
}

const getSvg = async (link: string): Promise<Element|null> => {
    const res = await fetch(link);
    const svg = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");

    return doc.querySelector('svg');
}

const parseDrawn = (drawn: string, ctx: TransformContext): ISvgCommand[] => {
    const lexer = new DrawnLexer(drawn);
    const tokens = lexer.parse();
    const commands = [];

    for (const token of tokens) {
        switch (token.type) {
            case TokenType.MoveTo: {
                const y= Number(token.value?.pop());
                const x= Number(token.value?.pop());

                commands.push({
                    command: "moveTo",
                    params: [x, y],
                } as ISvgCommand);
                ctx.translate(x, y);

            } break;

            case TokenType.DeltaMoveTo: {
                const dy= Number(token.value?.pop());
                const dx= Number(token.value?.pop());

                commands.push({
                    command: "moveTo",
                    params: [ctx.x0 + dx, ctx.y0 + dy],
                } as ISvgCommand);
                ctx.translate(ctx.x0 + dx, ctx.y0 + dy);

            } break;
            case TokenType.HorizontalLine: {
                const x= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [x, ctx.y0],
                } as ISvgCommand);

                ctx.translate(x, ctx.y0);
                commands.push({ command: "stroke" });
            } break;
            case TokenType.DeltaHorizontalLine: {
                const dx= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [ctx.x0 + dx, ctx.y0],
                } as ISvgCommand);

                ctx.translate(ctx.x0 + dx, ctx.y0);
                commands.push({ command: "stroke" });
            } break;
            case TokenType.LineTo: {
                const y= Number(token.value?.pop());
                const x= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [x, y],
                } as ISvgCommand);

                ctx.translate(x, y);
                commands.push({ command: "stroke" });
            } break;
            case TokenType.DeltaLineTo: {
                const dy= Number(token.value?.pop());
                const dx= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [ctx.x0 + dx, ctx.y0 + dy],
                } as ISvgCommand);

                ctx.translate(ctx.x0 + dx, ctx.y0 + dy);
                commands.push({ command: "stroke" });
            } break;

            case TokenType.VerticalLine: {
                const y= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [ctx.x0, y],
                } as ISvgCommand);

                ctx.translate(ctx.x0, y);
                commands.push({ command: "stroke" });
            } break;

            case TokenType.DeltaVerticalLine: {
                const dy= Number(token.value?.pop());

                commands.push({
                    command: "lineTo",
                    params: [ctx.x0, ctx.y0 + dy],
                } as ISvgCommand);

                ctx.translate(ctx.x0, ctx.y0 + dy);
                commands.push({ command: "stroke" });
            } break;

            case TokenType.RelativeCubicBezierCurve: {
                const dy2= Number(token.value?.pop());
                const dx2= Number(token.value?.pop());

                const dy1= Number(token.value?.pop());
                const dx1= Number(token.value?.pop());

                const dy= Number(token.value?.pop());
                const dx= Number(token.value?.pop());

                commands.push({
                    command: "bezierCurveTo",
                    params: [
                        ctx.x0 + dx, ctx.y0 + dy,
                        ctx.x0 + dx1, ctx.y0 + dy1,
                        ctx.x0 + dx2, ctx.y0 + dy2,
                    ],
                } as ISvgCommand);

                commands.push({ command: "stroke" });
            } break;

            case TokenType.CubicBezierCurve: {
                const dy2= Number(token.value?.pop());
                const dx2= Number(token.value?.pop());

                const dy1= Number(token.value?.pop());
                const dx1= Number(token.value?.pop());

                const dy= Number(token.value?.pop());
                const dx= Number(token.value?.pop());

                commands.push({
                    command: "bezierCurveTo",
                    params: [
                        dx, dy,
                        dx1, dy1,
                        dx2, dy2,
                    ],
                } as ISvgCommand)

                commands.push({ command: "stroke" });
            } break;
            case TokenType.CloseSubpath:
                console.log("??? close subpath ???");
                break;
            default: {
                throw new Error(`Unknown token type ${token.type}`);
            }
        }
    }

    return commands;
}


const parse = (element: Element, codeGen: CodeGen, ctx: TransformContext) => {
    switch (element.tagName) {
        case 'path': {
            codeGen.func('beginPath');
            for (const attrib of element.attributes) {
                switch (attrib.name) {
                    case 'd': {
                        for (const command of parseDrawn(attrib.value, ctx)) {
                            codeGen.func(command.command, command.params ?? []);
                        }
                    } break;
                    case 'fill': {
                        codeGen.vars('fillStyle', attrib.value);
                    } break;
                }
            }


            codeGen.func('fill');
            codeGen.func('closePath');
        }
    }

    return '';
}

(async () => {
    const ctx = getContext('canvas');

    if (!ctx) {
        return;
    }

    // ctx.beginPath();
    // ctx.fillStyle = '#000000';
    // ctx.translate(25, 25)
    // ctx.fillRect(0, 0, 50, 50);
    // ctx.translate(25, 30)
    // ctx.fillRect(0, 0, 50, 50);
    //
    // ctx.restore();
    // ctx.resetTransform();
    // ctx.beginPath();
    // ctx.fillStyle = '#fff';
    // ctx.fillRect(0, 0, 50, 50);
    // ctx.restore();
    //
    // ctx.bezierCurveTo()
    const codegen = new CodeGen('ctx');
    const transform = new TransformContext();

    const xml = await getSvg('/public/icon.svg');
    for (const elem of xml?.querySelector('g')?.children ?? []) {
        parse(elem, codegen, transform);
    }
    console.log(codegen.toString())
    const result = eval(codegen.toString());
    document.getElementById('xxx')?.setAttribute('src', result);
})();