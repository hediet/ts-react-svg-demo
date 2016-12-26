import { observable, computed, autorun } from "mobx";
import { SimpleEventDispatcher } from "./events";
import { Point } from "./points";

export class DragBehavior<TData> {
	@observable private activeOperation: DragOperation<TData>|null;

	public start(data: TData): DragOperation<TData> {
		var op = new DragOperation<TData>(data);
		op.onEnd.sub(() => this.activeOperation = null);
		this.activeOperation = op;
		return op;
	}

	public isActive(): boolean { return this.activeOperation !== null; }
	public getActiveOperation(): DragOperation<TData>|null { return this.activeOperation; }

	public testActiveData(predicate: (data: TData) => boolean): boolean {
		if (!this.activeOperation) return false;
		
		return predicate(this.activeOperation.data);
	}

}

export class DragOperation<TData> {
	private dispose: any;
	private lastMousePos: Point;
	private _onDrag: SimpleEventDispatcher<{ mousePos: Point, data: TData }> = new SimpleEventDispatcher();
	private _onEnd: SimpleEventDispatcher<{ mousePos: Point, cancelled: boolean, data: TData }> = new SimpleEventDispatcher();

	constructor(public readonly data: TData) {
		let f2: any;
		window.addEventListener("mousemove", f2 = (e: MouseEvent) => {
			this.lastMousePos = new Point(e.clientX, e.clientY);
			this._onDrag.dispatch({ mousePos: this.lastMousePos, data: this.data });
		});

		this.dispose = () => {
			window.removeEventListener("mousemove", f2);
		};
	}

	public endOnMouseUp(button?: number) {
		let f1: any;
		window.addEventListener("mouseup", f1 = (e: MouseEvent) => {
			if (button === undefined || e.button === button)
				this.end();
		});
		var oldDispose = this.dispose;
		this.dispose = () => {
			oldDispose();
			window.removeEventListener("mouseup", f1);
		};

		return this;
	}

	public get onDrag() { return this._onDrag.asEvent(); }
	public get onEnd() { return this._onEnd.asEvent(); }

	private endOrCancelled(cancelled: boolean) {
		this.dispose();
		this._onEnd.dispatch({ mousePos: this.lastMousePos, cancelled: false, data: this.data });
	}

	public end(): void { this.endOrCancelled(false); }

	public cancel(): void { this.endOrCancelled(true); }
}