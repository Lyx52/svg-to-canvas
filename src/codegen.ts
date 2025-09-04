export interface IGradientStop {
    offset?: number;
    stopColor: string;
}
export class CodeGen {
    private ctxVariable: string;
    private code: string[];
    private gradients: Record<string, string>;
    public width: number;
    public height: number;
    constructor(ctxVariable: string = 'ctx', width: number = 800, height: number = 800) {
        this.ctxVariable = ctxVariable;
        this.width = width;
        this.height = height;
        this.code = [];
        this.gradients = {};
    }

    private stringifyParam = (param: any): string => {
        switch (typeof param) {
            case "string": {
                return `'${param}'`
            }
        }

        return param.toString();
    }

    public initialCode = (): string[] => {
        return [
            '// Initialize canvas\n',
            'const id = crypto.randomUUID();\n',
            'const canvas = document.createElement("canvas");\n',
            'canvas.setAttribute("id", id);\n',
            `canvas.setAttribute("width", ${this.width});\n`,
            `canvas.setAttribute("height", ${this.width});\n`,
            `const ${this.ctxVariable} = canvas.getContext("2d");\n`,
            '\n',
            '// Begin generation\n'
        ];
    }

    public lastCode = () => {
        return [
            'return canvas.toDataURL();\n'
        ];
    }

    public func = (name: string, ...params: any[]) => {
        let line = `${this.ctxVariable}.${name}(`;
        line += params.map(this.stringifyParam).join(', ');
        line += ');\n';

        this.code.push(line);
    }

    public linearGradient = (id: string, x1: number, y1: number, x2: number, y2: number, ...stops: IGradientStop[]) => {
        let line = `const gradient_${id} = ${this.ctxVariable}.createLinearGradient(${x1}, ${y1}, ${x2}, ${y2});\n`;

        stops.forEach(stop => {
            line += `gradient_${id}.addColorStop(${stop.offset ?? 0}, '${stop.stopColor}');\n`;
        });

        this.gradients[id] = `gradient_${id}`;
        this.code.push(line);
    }

    public getGradientVar = (id: string) => {
        return this.gradients[id];
    }

    public vars = (name: string, value: any, ignoreStringify: boolean = false) => {
        let line = `${this.ctxVariable}.${name} = ${ignoreStringify ? value : this.stringifyParam(value)};\n`;

        this.code.push(line);
    }

    public toString = (): string => {
        const code = [
            ...this.initialCode(),
            ...this.code,
            ...this.lastCode()
        ];
        return `(function () {\n\n${code.join('')}\n})()`;
    }
}