export class TransformContext {
    public x0: number = 0;
    public y0: number = 0;

    private lastX: number[] = [];
    private lastY: number[] = [];

    public beginTransform() {
        this.lastX.push(this.x0);
        this.lastY.push(this.y0);

        this.x0 = 0;
        this.y0 = 0;
    }

    public translate = (x: number, y: number) => {
        this.x0 = x;
        this.y0 = y;
    }

    public endTransform() {
        this.x0 = this.lastX.pop() ?? 0;
        this.y0 = this.lastY.pop() ?? 0;
    }
}