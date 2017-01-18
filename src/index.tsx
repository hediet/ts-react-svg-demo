import * as React from "react";
import * as ReactDOM from "react-dom";
import * as classNames from "classnames";
import { observable, computed, autorun, IObservableArray } from "mobx";
import { observer } from "mobx-react";
import DevTools from 'mobx-react-devtools'; 
import { Motion, spring } from 'react-motion';

import { Point, isIntersect } from "./points";
import { DragBehavior, DragOperation } from "./dragging";

import "./style.scss";

class MyNode {
	constructor(public text: string) {}
	@observable position: Point = new Point(0, 0);
}

class Model {

	constructor() {
		// update intersections between selection and points
		autorun(() => {
			if (this.selection) {
				const points = (this.selection.points as IObservableArray<Point>);
				
				this.links.forEach(link => {

					let lastPoint: null|Point = null;
					link.marked = points.some(point => {
						if (lastPoint != null) {
							if (isIntersect(link.source.position, link.target.position, lastPoint, point))
								return true;
						}
						lastPoint = point;
						return false;
					});
				});
			}
		});
	}

	@observable nodes: MyNode[] = [];
	@observable links: MyLink[] = [];
	@observable newLink: MyNewLink|null = null;
	@observable selectedLink: MyLink|null = null;
	@observable selection: Selection|null = null;
}

class MyNewLink {
	constructor(public source: MyNode) {}
	@observable position: Point = new Point(0, 0);
	@observable possibleTarget: MyNode|null = null;
}

class MyLink {
	@observable marked: boolean;
	constructor(public readonly source: MyNode, public readonly target: MyNode) {}
}

class Selection {
	@observable points: Point[] = [];
}


// some example model
var model = new Model();
var n1 = new MyNode("1"); n1.position = new Point(50, 50);
var n2 = new MyNode("2"); n2.position = new Point(150, 50);
var n3 = new MyNode("3"); n3.position = new Point(50, 150);
model.links.push(new MyLink(n1, n2), new MyLink(n2, n3));
model.nodes.push(n1, n2, n3);


const moveNodeDragBehavior = new DragBehavior<MyNode>();
const addLinkDragBehavior = new DragBehavior<MyNewLink>();
const selectEdgesDragBehavior = new DragBehavior<any>();

interface SvgContext {
	mouseToSvgCoordinates(mousePos: Point): Point;
}

function onMouseEnterLeave(handler: (enter: boolean) => void): { 
	onMouseEnter: React.EventHandler<React.MouseEvent<SVGElement>>, 
	onMouseLeave: React.EventHandler<React.MouseEvent<SVGElement>> } {
	return { onMouseEnter: () => handler(true), onMouseLeave: () => handler(false) };
}

@observer
class Node extends React.Component<{ node: MyNode, svgContext: SvgContext }, {}> {
	mouseDown(e: React.MouseEvent<any>) {
		e.stopPropagation();
		e.preventDefault();

		if (e.button == 0) {
			const op = moveNodeDragBehavior.start(this.props.node).endOnMouseUp(e.button);
			op.onDrag.sub(e => {
				const p = this.props.svgContext.mouseToSvgCoordinates(e.mousePos);
				e.data.position = p;
			});
		}
		else if (e.button == 2) {
			const link = new MyNewLink(this.props.node);

			const op = addLinkDragBehavior.start(link).endOnMouseUp(e.button);
			op.onDrag.sub(e => {
				model.newLink = link;
				const p = this.props.svgContext.mouseToSvgCoordinates(e.mousePos);
				e.data.position = p;
			});
			op.onEnd.sub(e => {
				model.newLink = null;
				if (e.data.possibleTarget !== null) {
					model.links.push(new MyLink(e.data.source, e.data.possibleTarget));
				}
			});
		}
	}

	mouseEnterExit(enter: boolean) {
		var op = addLinkDragBehavior.getActiveOperation();
		if (op) {
			op.data.possibleTarget = enter ? this.props.node : null;
		}
	}

	render() {
		const n = this.props.node;
		return (
			<g className={classNames("node", addLinkDragBehavior.testActiveData(d => n === d.source || n === d.possibleTarget) && "highlighted")} 
				transform={`translate(${n.position.x}, ${n.position.y})`} 
				onMouseDown={e => this.mouseDown(e)} {...onMouseEnterLeave(e => this.mouseEnterExit(e)) }>
				<circle r="10" fill="blue" />
				<text dy=".35em" fill="white">
					{n.text}
				</text>
			</g>
		);
	}
}

@observer
class Link extends React.Component<{ link: MyLink }, {}> {

	render() {
		const l = this.props.link;
		const nodeRadius = 10;
		const arrowheadLength = 8;

		const start = l.source.position;
		const end = l.target.position;
		const updatedEnd = end.getPointCloserTo(start, arrowheadLength + nodeRadius);

		return (
			<g onMouseEnter={() => model.selectedLink = l} onMouseLeave={() => model.selectedLink = null}>
				
				<Motion style={{x: spring(l.marked ? 100 : 0)}}>
				{({x = 0}) => {
						const updatedEnd2 = start.getPointCloserTo(end, start.distance(end) * x / 100);
						return (<line className="highlightLink" 
							x1={start.x} y1={start.y} x2={updatedEnd2.x} y2={updatedEnd2.y} />);
					}
				}
				</Motion>

				<line className="link" markerEnd="url(#arrow)" 
					x1={start.x} y1={start.y} x2={updatedEnd.x} y2={updatedEnd.y} />
				
				<line className="link-grip" x1={start.x} y1={start.y} x2={updatedEnd.x} y2={updatedEnd.y} />
			</g>
		);
	}
}

@observer
class NewLink extends React.Component<{ link: MyNewLink }, {}> {
	render() {
		const l = this.props.link;
		return (
			<line className={classNames("newlink", "link", this.props.link.possibleTarget !== null && "connectToLink")} marker-end="url(#arrow)" 
				x1={l.source.position.x} y1={l.source.position.y} x2={l.position.x} y2={l.position.y} />
		);
	}
}

@observer
class GUI extends React.Component<{}, {}> {

	private svgContext: SvgContext = { mouseToSvgCoordinates: undefined! };

	private initializeContext(svg: SVGSVGElement) {
		if (!svg) {
			this.svgContext.mouseToSvgCoordinates = undefined!;
			return;
		}

		const pt = svg.createSVGPoint();

		this.svgContext.mouseToSvgCoordinates = (point: Point) => {
			 pt.x = point.x; pt.y = point.y;
			 var r = pt.matrixTransform(svg.getScreenCTM().inverse());
			 return new Point(r.x, r.y);
		};
	}

	private doubleClick(e: React.MouseEvent<SVGElement>) {
		var node = new MyNode("foo");
		node.position = new Point(e.clientX, e.clientY);
		model.nodes.push(node);
	}

	private click(e: React.MouseEvent<any>) {
		var op = addLinkDragBehavior.getActiveOperation();
		if (e.button == 0 && op) {
			var node = new MyNode("foo");
			node.position = op.data.position;
			model.nodes.push(node);
			op.data.possibleTarget = node;
			op.end();
		}
	}

	private mouseDown(e: React.MouseEvent<any>) {
		if (e.button == 2) {
			model.selection = new Selection();

			const op = selectEdgesDragBehavior.start(undefined);
			op.endOnMouseUp();
			//op.onEnd.subscribe(() => { model.selection = null; })
			op.onDrag.subscribe(({ mousePos }) => {
				const pt = this.svgContext.mouseToSvgCoordinates(mousePos);
				model.selection!.points.push(pt);
			});
		}
	}

	render() {

		let path: JSX.Element|null = null;
		if (model.selection) {
			const segments: string[] = [];
			if (model.selection.points.length > 0) {
				const firstPoint = model.selection.points[0];
				segments.push(`M ${firstPoint.x}, ${firstPoint.y}`);
				model.selection.points.forEach(p => {
					segments.push(`L ${p.x}, ${p.y}`);
				});
				path = (<path className={classNames("selection")} d={segments.join("\n")} />);
			}
		}
		return (
			<svg className="mySvg" ref={svg => this.initializeContext(svg as SVGSVGElement)} 
				onDoubleClick={(e) => this.doubleClick(e)}
				onMouseDown={e => this.mouseDown(e)}
				onClick={(e) => this.click(e)}
				onContextMenu={e => e.preventDefault()}>
				<defs>
					<marker id="arrow" viewBox="0 0 10 10" refX="0" refY="5" markerUnits="strokeWidth" markerWidth="8" markerHeight="8" orient="auto">
						<path d="M 0 0 L 10 5 L 0 10 z"></path>
					</marker>
				</defs>
				
				{ model.links.map(n => <Link link={n}/>) }
				{ model.nodes.map(n => <Node node={n} svgContext={this.svgContext}/>) }
				{ model.newLink !== null && <NewLink link={model.newLink} /> }
				{ path }
				
				
			</svg>
		);
	}
}

var target = document.createElement("div");
target.className = "main";
ReactDOM.render(<div className={"main"}><DevTools /><GUI /></div>, target);
document.body.appendChild(target);

