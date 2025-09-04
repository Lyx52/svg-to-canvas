import './style.css'
import {CodeGen, type IGradientStop} from "./codegen.ts";
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
                console.log(token.value)
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
                ctx.translate(ctx.x0 + dx2, ctx.y0 + dy2);
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
                ctx.translate(dx2, dy2);
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

const parseCommonAttributes = (attributes: NamedNodeMap, codeGen: CodeGen, ctx: TransformContext) => {
    for (const attrib of attributes) {
        switch (attrib.name) {
            case 'fill': {
                if (attrib.value.startsWith('url')) {
                    const id = attrib.value
                        .replace(/url\(/, '')
                        .replace(/^#/, '')
                        .replace(/\)$/, '');

                    codeGen.vars('fillStyle', codeGen.getGradientVar(id), true);
                } else {
                    codeGen.vars('fillStyle', attrib.value);
                }
            } break;
        }
    }
}

const parseDefs = (elems: HTMLCollection, codeGen: CodeGen, ctx: TransformContext) => {
    for (const elem of elems) {
        switch (elem.tagName) {
            case 'linearGradient': {
                // ctx.createLinearGradient(x1, y1, x2, y2)
                const id = elem.getAttribute('id')!;
                const x1 = Number(elem.getAttribute('x1') ?? 0);
                const y1 = Number(elem.getAttribute('y1') ?? 0);
                const x2 = Number(elem.getAttribute('x2') ?? 0);
                const y2 = Number(elem.getAttribute('y2') ?? 0);
                const stops = [];
                for (const stop of elem.querySelectorAll('stop')) {
                    stops.push({
                        stopColor: stop.getAttribute('stop-color'),
                        offset: Number(stop.getAttribute('offset') ?? 0),
                    } as IGradientStop)
                }
                codeGen.linearGradient(id, x1, y1, x2, y2, ...stops);


                console.log(elem)
            } break;
        }
    }
}

const parse = (element: Element|null|undefined, codeGen: CodeGen, ctx: TransformContext) => {
    if (!element) {
        return;
    }

    switch (element.tagName) {
        case 'svg': {
            for (const attrib of element.attributes) {
                switch (attrib.name) {
                    case 'width': {
                        codeGen.width = Number(attrib.value);
                    } break;
                    case 'height': {
                        codeGen.height = Number(attrib.value);
                    } break;
                }
            }
            const defs = element.querySelectorAll('defs');
            for (const def of defs) {
                parseDefs(def.children, codeGen, ctx);
                def.remove();
            }
            parseCommonAttributes(element.attributes, codeGen, ctx);
        } break;
        case 'g': {

        } break;
        case 'path': {
            codeGen.func('beginPath');
            for (const attrib of element.attributes) {
                switch (attrib.name) {
                    case 'd': {
                        for (const command of parseDrawn(attrib.value, ctx)) {
                            codeGen.func(command.command, command.params ?? []);
                        }
                    } break;
                }
            }

            parseCommonAttributes(element.attributes, codeGen, ctx);
            codeGen.func('fill');
            codeGen.func('closePath');
        }
    }

    for (const child of element.children) {
        parse(child, codeGen, ctx);
    }
}

(async () => {
    const ctx = getContext('canvas');

    if (!ctx) {
        return;
    }
    const codegen = new CodeGen();
    const transform = new TransformContext();

    const xml = await getSvg('/public/large.svg');
    parse(xml, codegen, transform);
    console.log(codegen.toString())
    const result = eval(codegen.toString());
    document.getElementById('xxx')?.setAttribute('src', result);
})();