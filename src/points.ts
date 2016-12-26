

function sqr(a: number) { return a * a; }

export class Point {

	constructor(public readonly x: number, public readonly y: number) {
	}

	public distance(other: Point = Zero): number {
		var dx = this.x - other.x;
		var dy = this.y - other.y;
		return Math.sqrt(sqr(dx) + sqr(dy));
	}

	public minus(other: Point): Point {
		return new Point(this.x - other.x, this.y - other.y);
	}

	public plus(other: Point): Point {
		return new Point(this.x + other.x, this.y + other.y);
	}

	public equals(other: Point) {
		return this.x === other.x && this.y === other.y;
	}

	public getPointCloserTo(dest: Point, dist: number): Point {
		if (this.equals(dest)) return this;

		var p = dest.minus(this);
		const angle = Math.atan2(p.x, p.y);

		var result = new Point(this.x + Math.sin(angle) * dist, this.y + Math.cos(angle) * dist);
		return result;
	}
}

export const Zero = new Point(0, 0);
