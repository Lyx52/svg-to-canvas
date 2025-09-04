export enum TokenType {
    MoveTo = 'M',
    DeltaMoveTo = 'm',
    HorizontalLine = 'H',
    DeltaHorizontalLine = 'h',
    DeltaLineTo = 'l',
    LineTo = 'L',
    VerticalLine = 'V',
    DeltaVerticalLine = 'v',
    RelativeCubicBezierCurve = 'c',
    CubicBezierCurve = 'C',
    CloseSubpath = 'z'
}

export interface IToken {
    type: TokenType;
    value?: (string|number)[]|undefined;
}

export class DrawnLexer {
    private buffer: string;
    private pointer: number;
    private tokens: IToken[];
    constructor(drawn: string) {
        this.buffer = drawn;
        this.pointer = 0;
        this.tokens = [];
    }

    public parse = () => {
        let char = this.pop();
        while (char) {
            switch(char) {
                case 'M': {
                    this.pushToken(TokenType.MoveTo, this.values(this.readNumber(), this.discard(',', ' '), this.readNumber()));
                } break;
                case 'm': {
                    this.pushToken(TokenType.DeltaMoveTo, this.values(this.readNumber(), this.discard(',', ' '), this.readNumber()));
                } break;
                case 'H': {
                    this.pushToken(TokenType.HorizontalLine, this.values(this.readNumber()));
                } break;
                case 'h': {
                    this.pushToken(TokenType.DeltaHorizontalLine, this.values(this.readNumber()));
                } break;

                case 'l': {
                    this.pushToken(TokenType.DeltaLineTo, this.values(this.readNumber(), this.discard(',', ' '), this.readNumber()));
                } break;

                case 'L': {
                    this.pushToken(TokenType.LineTo, this.values(this.readNumber(), this.discard(',', ' '), this.readNumber()));
                } break;

                case 'v': {
                    this.pushToken(TokenType.DeltaVerticalLine, this.values(this.readNumber()));
                } break;

                case 'V': {
                    this.pushToken(TokenType.VerticalLine, this.values(this.readNumber()));
                } break;

                case 'c': {
                    this.pushToken(TokenType.RelativeCubicBezierCurve, this.values(
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber()
                    ));
                } break;

                case 'C': {
                    this.pushToken(TokenType.CubicBezierCurve, this.values(
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber(),
                        this.discard(',', ' '),
                        this.readNumber()
                    ));
                } break;
                case 'Z':
                case 'z': {
                    this.pushToken(TokenType.CloseSubpath);
                } break;
                case ' ':

                    break;
                default: {
                    throw new Error(`Unrecognized token type '${char}'`);
                } break;
            }

            char = this.pop();
        }

        return this.tokens;
    }

    private values = (...arr: (number|string|undefined)[]): (string|number)[] => {
        return arr.filter(v => v !== undefined)
    }

    private discard = (...consume: string[]) => {
        if (consume.includes(this.peek() ?? '')) {
            this.pop();
        }

        return undefined;
    }

    public readNumber = () => {
        let buffer = "";

        let current = this.peek();
        if (current === '-') {
            buffer += this.pop();
            current = this.peek();
        }

        let hasDot = false;

        while (current && (this.isNumeric(current) || this.isDot(current))) {
            if (hasDot && this.isDot(current)) {
                break;
            }

            hasDot = hasDot || this.isDot(current);

            buffer += this.pop();
            current = this.peek();
        }

        return parseFloat(buffer);
    }

    private pushToken = (type: TokenType, value: (string|number)[]|undefined = undefined) => {
        this.tokens.push({
            type: type,
            value: value
        });
    }

    private peek = (): string|undefined => {
        return this.buffer[this.pointer];
    }

    private pop = (): string|undefined => {
        return this.buffer[this.pointer++];
    }

    private isNumeric = (char: string) => {
        return /\d/.test(char);
    }

    private isDot = (char: string) => {
        return char === '.';
    }

    private isAlpha = (char: string) => {
        return /[a-zA-Z]/.test(char);
    }

    private isComma = (char: string) => {
        return char === ',', ' ';
    }

    private isMinus = (char: string) => {
        return char === '-';
    }
}