

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


function turn(p1: Point, p2: Point, p3: Point): number {
	const a = p1.x; const b = p1.y; 
	const c = p2.x; const d = p2.y;
	const e = p3.x; const f = p3.y;
	const A = (f - b) * (c - a);
	const B = (d - b) * (e - a);
	return (A > B + Number.MIN_VALUE) ? 1 : (A + Number.MIN_VALUE < B) ? -1 : 0;
}

export function isIntersect(aStart: Point, aEnd: Point, bStart: Point, bEnd: Point): boolean {
	return (turn(aStart, bStart, bEnd) != turn(aEnd, bStart, bEnd)) && (turn(aStart, aEnd, bStart) != turn(aStart, aEnd, bEnd));
}
