window.Rippler = function Rippler() {
  const COLORS = [
    '#FCD581',
    '#935FA7',
    '#EB8258',
    '#9B489B',
    '#82FF9E',
    '#88958D',
    '#0075C4',
    '#7CB4B8'
  ];

  const rad = 16;
  const diameter = 2 * rad;
  const subInterval = 45;

  let clickCount = 0;
  let clickSrc = [null];
  let domElem = null;
  let height = 0;
  let lastRotation = {};
  let toggles = null;
  let transforms = null;
  let width = 0;


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

  function _bumpYRotation(coords) {
    const key = _makeKey(coords);
    lastRotation[key] = lastRotation[key] || 0;
    lastRotation[key] = (lastRotation[key] + subInterval) % 180;
    return lastRotation[key];
  }

  function _calcZRotation(coords, count) {
    const src = clickSrc[count];
    const deltaY = coords.y - src.y;
    const deltaX = coords.x - src.x;
    return Math.atan2(deltaY * diameter, deltaX * diameter) * 180 / Math.PI;
  }

  function _collectNeighbors(x, y) {
    const count = toggles[y][x];
    let neighbors = [], nextY, nextX, neighborCount;
    for (let i = -1; i <= 1; ++i) {
      nextY = y + i;
      if (nextY < 0 || nextY >= cards.length) {
        continue;
      }
      for (let j = -1; j <= 1; ++j) {
        nextX = j + x;
        if (j == 0 && i == 0 || nextX < 0 || nextX >= cards[nextY].length) {
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

  function _createDomElement(type, classes) {
    const node = document.createElement('div');
    for (let i = 0; i < classes.length; ++i) {
      node.classList.add(classes[i]);
    }
    return node;
  }

  function _getCoordinates(node) {
    return {
      x: ~~node.getAttribute('data-x'),
      y: ~~node.getAttribute('data-y')
    };
  }

  function _getLastYRotation(coords) {
    return lastRotation[_makeKey(coords)];
  }

  function _handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const node = e.target;
    if (!node.classList.contains('card')) {
      return;
    }
    const coords = _getCoordinates(node);
    clickCount++;
    clickSrc.push(coords);
    toggles[coords.y][coords.x] = clickCount;
    _startRipple(coords, clickCount);
  }

  function _initCards() {
    domElem.innerHTML = "";
    const numWide = Math.floor(width / diameter);
    const numTall = Math.floor(height / diameter);
    const frag = document.createDocumentFragment();
    let card;

    toggles = new Array(numTall);
    cards = new Array(numTall);
    transforms = new Array(numTall);
    for (let i = 0; i < numTall; ++i) {
      cards[i] = new Array(numWide);
      toggles[i] = new Array(numWide);
      transforms[i] = new Array(numWide);
      for (let j = 0; j < numWide; ++j) {
        card = cards[i][j] = _makeCard(i, j);
        frag.appendChild(card);
      }
    }

    domElem.appendChild(frag);
  }

  function _makeCard(row, col) {
    const card = _createDomElement('div', ['card']);
    card.setAttribute('data-x', col);
    card.setAttribute('data-y', row);
    const transformJSON = {
      rotateY: 0,
      rotateZ: 0
    };
    const left = transformJSON.x = `${(diameter * col)}px`;
    const top = transformJSON.y = `${(diameter * row)}px`;
    transforms[row][col] = transformJSON;
    const transform = `translate3d(${left},${top}, 0) rotate(0) rotateY(0)`;
    card.style.transform = card.style['-webkit-transform'] = card.style['-moz-transform'] = transform;
    return card;
  }

  function _makeKey(coords) {
    return `${coords.x},${coords.y}`;
  }

  function _resizeRender() {
    const boundingRect = domElem.getBoundingClientRect();
    width = boundingRect.width;
    height = boundingRect.height;
    _initCards();
  }

  function _rippleOut(node) {
    const coords = _getCoordinates(node);
    const count = toggles[coords.y][coords.x];
    const neighbors = _collectNeighbors(coords.x, coords.y);

    for (let i = 0; i < neighbors.length; ++i) {
      _startRipple(neighbors[i], count);
    }
  }


  function _startRipple(coords, count) {
    const node = cards[coords.y][coords.x];
    _updateTransform(node, coords, count);
  }

  function _transitionHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const node = e.target;
    const coords = _getCoordinates(node);
    const count = toggles[coords.y][coords.x];
    const lastRotation = _getLastYRotation(coords);

    if (lastRotation % 180 == 0) {
      return;
    }

    const colorIdx = toggles[coords.y][coords.x] % COLORS.length;
    const color = COLORS[colorIdx];

    _rippleOut(node);

    _updateTransform(node, coords, count);
    node.style['background-color'] = color;
  }

  function _updateTransform(node, coords, count) {
    const lastTransform = transforms[coords.y][coords.x];
    const zRotation = lastTransform.zRotation = _calcZRotation(coords, count);
    const yRotation = lastTransform.yRotation = _bumpYRotation(coords);
    const transform = `translate3d(${lastTransform.x},${lastTransform.y
      }, 0) rotate(${zRotation}deg) rotateY(${yRotation}deg)`;
    node.style.transform = node.style['-webkit-transform'] = node.style['-moz-transform'] = transform;
  }

  return {
    init: init
  }
}
