
export class CodeGen {
    private ctxVariable: string;
    private code: string[];
    constructor(ctxVariable: string) {
        this.ctxVariable = ctxVariable;
        this.code = [];
        this.init();
    }

    private stringifyParam = (param: any): string => {
        switch (typeof param) {
            case "string": {
                return `'${param}'`
            }
        }

        return param.toString();
    }

    public init = () => {
        const code = [
            '// Initialize canvas\n',
            'const id = crypto.randomUUID();\n',
            'const canvas = document.createElement("canvas");\n',
            'canvas.setAttribute("id", id);\n',
            'canvas.setAttribute("width", 800);\n',
            'canvas.setAttribute("height", 800);\n',
            'const ctx = canvas.getContext("2d");\n',
            '\n',
            '// Begin generation\n'
        ];

        this.code.push(...code);
    }

    public append = () => {
        const code = [
            'return canvas.toDataURL();\n'
        ];

        this.code.push(...code);
    }

    public func = (name: string, ...params: any[]) => {
        let line = `${this.ctxVariable}.${name}(`;
        line += params.map(this.stringifyParam).join(', ');
        line += ');\n';

        this.code.push(line);
    }

    public vars = (name: string, value: any) => {
        let line = `${this.ctxVariable}.${name} = ${this.stringifyParam(value)};\n`;

        this.code.push(line);
    }

    public toString = (): string => {
        this.append();
        return `(function () {\n\n${this.code.join('')}\n})()`;
    }
}