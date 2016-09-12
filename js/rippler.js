window.Rippler = function Rippler () {
	var domElem = null;
	var width = 0;
	var height = 0;
	var svg = null;
	var rad = 16;
	var diameter = 2 * rad;
	var toggles = null;
	var transforms = null;
	var clickCount = 0;
	var clickSrc = [null];
	var subInterval = 45;
	var lastRotation = {};
	var COLORS  = ['#aec7e8',
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
					'#9edae5', 
					'#1f77b4'];

	function init(target) {

		if (typeof target === "string") {
			target = document.querySelector(target);
			if (!target) { return; }
		}
		domElem = target;
		_resizeRender();
		
		domElem.addEventListener('click', _handleClick, true);
		domElem.addEventListener('transitionend', _transitionHandler, true);
		window.addEventListener('resize', _resizeRender);
	}

	function _resizeRender() {
		var boundingRect = domElem.getBoundingClientRect();
		width = boundingRect.width;
		height = boundingRect.height;
		_initCircles();
	}

	function _initCircles() {
		domElem.innerHTML = "";
		var numWide = Math.floor(width / diameter);
		var numTall = Math.floor(height / diameter);
		var frag = document.createDocumentFragment();
		var circle;

		toggles = new Array(numTall);
		circles = new Array(numTall);
		transforms = new Array(numTall);
		for (var i = 0; i < numTall; ++i) {
			circles[i] = new Array(numWide);
			toggles[i] = new Array(numWide);
			transforms[i] = new Array(numWide);
			for (var j = 0; j < numWide; ++j) {
				circle = circles[i][j] = _makeCircle(i, j);
				frag.appendChild(circle);
			}
		}

		domElem.appendChild(frag);
	}

	function _getCoordinates(node) {
		return {
			x: ~~node.getAttribute('data-x'),
			y: ~~node.getAttribute('data-y')
		};
	}

	function _handleClick(e) {
		e.preventDefault();
		e.stopPropagation();
		var node = e.target;
		if (!node.classList.contains('card')) {
			return;
		}
		var coords = _getCoordinates(node);
		clickCount++;
		clickSrc.push(coords);
		toggles[coords.y][coords.x] = clickCount;
		_startRipple(coords, clickCount);
	}

	function _collectNeighbors(x, y) {
		var count = toggles[y][x];
		var neighbors = [], nextY, nextX, neighborCount;
		for (var i = -1; i <= 1; ++i) {
			nextY = y + i;
			if (nextY < 0 || nextY >= circles.length) { 
				continue; 
			}
			for (var j = -1; j <= 1; ++j) {
				nextX = j + x;
				if (j == 0 && i == 0|| nextX < 0 || nextX >= circles[nextY].length) {
					continue;
				}
				neighborCount = toggles[nextY][nextX];
				if (!neighborCount || neighborCount < count) {
					toggles[nextY][nextX] = count;
					neighbors.push({
						y: nextY,
						x: nextX
					});
				}
			}
		}
		return neighbors;
	}

	function _rippleOut(node) {
		var coords = _getCoordinates(node);
		var count = toggles[coords.y][coords.x];
		var neighbors = _collectNeighbors(coords.x, coords.y);
		
		for (var i = 0; i < neighbors.length; ++i) {
			_startRipple(neighbors[i], count);
		}
	}

	function _makeKey(coords) {
		return coords.x + "," + coords.y;
	}

	function _bumpYRotation(coords) {
		var key = _makeKey(coords);
		lastRotation[key] = lastRotation[key] || 0;
		lastRotation[key] = lastRotation[key] + subInterval;
		return lastRotation[key];
	}

	function _startRipple(coords, count) {
		var node = circles[coords.y][coords.x];
		_updateTransform(node, coords, count);
	}

	function _calcZRotation(coords, count) {
		var src = clickSrc[count];
		var deltaY = coords.y - src.y;
		var deltaX = coords.x - src.x;
		return Math.atan2(deltaY * diameter, deltaX * diameter) * 180 / Math.PI; 
	}

	function _getLastYRotation(coords) {
		return lastRotation[_makeKey(coords)];
	}

	function _transitionHandler(e) {
		e.preventDefault();
		e.stopPropagation();
		var node = e.target;
		var coords = _getCoordinates(node);
		var count = toggles[coords.y][coords.x];
		var lastRotation = _getLastYRotation(coords)
		if (lastRotation % 360 == 0) {
			return;
		}

		var colorIdx = Math.floor((lastRotation - 90) / 180) % COLORS.length;
		var color = COLORS[colorIdx];
		
		_rippleOut(node);

		_updateTransform(node, coords, count);
		node.style['background-color'] = color;
	}

	function _updateTransform(node, coords, count) {
		var lastTransform = transforms[coords.y][coords.x];
		var zRotation = lastTransform.zRotation = _calcZRotation(coords, count);
		var yRotation = lastTransform.yRotation = _bumpYRotation(coords);
		var transform = 'translate3d(' + lastTransform.x + ',' + lastTransform.y +',0) rotate(' + zRotation + 'deg) rotateY(' + yRotation  + 'deg)';
		node.style.transform = node.style['-webkit-transform'] = transform;
	}

	function _makeCircle(row, col) {
		var circle = _createDomElement('div', ['card']);
		circle.setAttribute('data-x', col);
		circle.setAttribute('data-y', row);
		var transformJSON = {
			rotateY: 0,
			rotateZ: 0
		};
		var left = transformJSON.x = (diameter * col) + 'px';
		var top =  transformJSON.y = (diameter * row) + 'px';
		transforms[row][col] = transformJSON;
		var transform = 'translate3d(' + left + ',' + top +',0) rotate(0) rotateY(0)';
		circle.style.transform = circle.style['-webkit-transform'] = transform;
		return circle;
	}

	function _createDomElement(type, classes) {
		var node = document.createElement('div');
		for (var i = 0; i < classes.length; ++i) {
			node.classList.add(classes[i]);
		}
		return node;
	}

	return {
		init: init
	}
}