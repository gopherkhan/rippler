class Rippler {

	constructor() {
		this.XMLNS = "http://www.w3.org/2000/svg";
		this.domElem = null;
		this.width = 0;
		this.height = 0;
		this.svg = null;
		this.rad = 16;
		this.toggles = null;
		this.clickCount = 0;
		this.clickSrc = [null];
		this.subInterval = 45;
		this.lastRotation = {};
		this.COLORS  = ['#1f77b4',
						'#aec7e8',
						'#ff7f0e',
						'#ffbb78',
						'#2ca02c',
						'#98df8a',
						'#d62728',
						'#ff9896',
						'#9467bd',
						'#c5b0d5',
						'#8c564b',
						'#c49c94',
						'#e377c2',
						'#f7b6d2',
						'#7f7f7f',
						'#c7c7c7',
						'#bcbd22',
						'#dbdb8d',
						'#17becf',
						'#9edae5'];
	}

	init(domElem) {

		if (typeof domElem === "string") {
			domElem = document.querySelector(domElem);
			if (!domElem) { return; }
		}
		this.domElem = domElem;
		let boundingRect = domElem.getBoundingClientRect();
		this.width = boundingRect.width;
		this.height = boundingRect.height;

		// this.svg = this.createSVGElement('svg');
		// this.setSVGAttribute(this.svg, 'width', this.width + 'px');
		// this.setSVGAttribute(this.svg, 'height', this.height + 'px');
		// domElem.appendChild(this.svg);

		this.initCircles();

		domElem.addEventListener('click', this.handleClick.bind(this), true);
		domElem.addEventListener('transitionend', this.transitionHandler.bind(this), true);
	}

	initCircles() {
		var diameter = 2 * this.rad;
		var numWide = Math.floor(this.width / diameter);
		var numTall = Math.floor(this.height / diameter);
		var frag = document.createDocumentFragment();

		this.toggles = new Array(numTall);
		this.circles = new Array(numTall);
		for (var i = 0; i < numTall; ++i) {
			this.circles[i] = new Array(numWide);
			this.toggles[i] = new Array(numWide);
			for (var j = 0; j < numWide; ++j) {
				let circle = this.circles[i][j] = this.makeCircle(i, j);
				frag.appendChild(circle);
			}
		}

		this.domElem.appendChild(frag);
	}

	getCoordinates(node) {
		return {
			x: ~~node.getAttribute('data-x'),
			y: ~~node.getAttribute('data-y')
		};
	}

	handleClick(e) {
		e.preventDefault();
		e.stopPropagation();
		let node = e.target;
		if (!node.classList.contains('card')) {
			return;
		}
		let coords = this.getCoordinates(node);
		this.clickCount++;
		this.clickSrc.push(coords);
		this.toggles[coords.y][coords.x] = this.clickCount;
		this.startRipple(coords, this.clickCount);
	}

	collectNeighbors(x, y) {
		let count = this.toggles[y][x];
		let neighbors = [];
		for (let i = -1; i <= 1; ++i) {
			let nextY = y + i;
			if (nextY < 0 || nextY >= this.circles.length) { 
				continue; 
			}
			for (let j = -1; j <= 1; ++j) {
				let nextX = j + x;
				if (j == 0 && i == 0|| nextX < 0 || nextX >= this.circles[nextY].length) {
					continue;
				}
				let neighborCount = this.toggles[nextY][nextX];
				if (!neighborCount || neighborCount < count) {
					this.toggles[nextY][nextX] = count;
					neighbors.push({
						y: nextY,
						x: nextX
					});
				}
			}
		}
		return neighbors;
	}

	rippleOut(node) {
		let coords = this.getCoordinates(node);
		let count = this.toggles[coords.y][coords.x];
		let neighbors = this.collectNeighbors(coords.x, coords.y);
		neighbors.forEach(
			function(neighbor) {
				this.startRipple(neighbor, count);
			}, this);
	}

	bumpYRotation(coords) {
		let key = coords.x + "," + coords.y;
		this.lastRotation[key] = this.lastRotation[key] || 0;
		this.lastRotation[key] = this.lastRotation[key] + this.subInterval;
		return this.lastRotation[key];
	}

	startRipple(coords, count) {
		let xRotation = this.bumpYRotation(coords);  
		let zRotation = this.calcZRotation(coords, count);
		let transform = 'translate3d(0,0,0) rotate(' + zRotation + 'deg) rotateY(' + xRotation  + 'deg)';
		let node = this.circles[coords.y][coords.x];
		node.style.transform = node.style['-webkit-transform'] = transform;
	}

	calcZRotation(coords, count) {
		let src = this.clickSrc[count];
		let deltaY = coords.y - src.y;
		let deltaX = coords.x - src.x;
		let diameter = this.rad * 2;
		return Math.atan2(deltaY * diameter, deltaX * diameter) * 180 / Math.PI; 
	}

	getLastYRotation(coords) {
		let key = coords.x + "," + coords.y;
		return this.lastRotation[key];
	}

	transitionHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		let node = e.target;
		let coords = this.getCoordinates(node);
		let count = this.toggles[coords.y][coords.x];
		let lastRotation = this.getLastYRotation(coords)
		if (lastRotation % 360 == 0) {
			return;
		}

		let colorIdx = Math.floor((lastRotation - 90) / 180) % this.COLORS.length;
		let color = this.COLORS[colorIdx];
		
		this.rippleOut(node);

		let zRotation = this.calcZRotation(coords, count);
		let yRotation = this.bumpYRotation(coords);
		let transform = 'translate3d(0,0,0) rotate(' + zRotation + 'deg) rotateY(' + yRotation  + 'deg)';
		node.style.transform = node.style['-webkit-transform'] = transform;
		node.style['background-color'] = color;
	}

	makeCircle(row, col) {
		let circle = this.createDomElement('div', ['card']);//this.createSVGElement('circle');
		circle.setAttribute('data-x', col);
		circle.setAttribute('data-y', row);
		let diameter = this.rad * 2;
		circle.style.left = (diameter * col) + 'px';
		circle.style.top = (diameter * row) + 'px'; 
		// this.setSVGAttribute(circle, 'r', this.rad);
		// this.setSVGAttribute(circle, 'cx', diameter * col + this.rad);
		// this.setSVGAttribute(circle, 'cy', diameter * row + this.rad);
		return circle;
	}

	// translateNode(node) {

	// }

	createDomElement(type, classes) {
		let node = document.createElement('div');
		for (let str of classes) {
			node.classList.add(str);
		}
		return node;
	}

	// createSVGElement(type) {
	// 	return document.createElementNS(this.XMLNS, type);
	// }

	// setSVGAttribute(node, attr, value) {
	// 	node.setAttributeNS(null, attr, value);
	// }

	// rotateNode(someNode) {
	// 	rotateX(angle)
	// }

	// click() {

	// }
}