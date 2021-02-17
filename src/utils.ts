type Coords = { x: number; y: number };

export function arrayMove<T>(arr: T[], previousIndex: number, newIndex: number): (T | undefined)[] {
  const array: (T | undefined)[] = arr.slice(0);
  if (newIndex >= array.length) {
    let k = newIndex - array.length;
    while (k-- + 1) {
      array.push(undefined);
    }
  }
  array.splice(newIndex, 0, array.splice(previousIndex, 1)[0]);
  return array;
}

export function arrayRemove<T>(arr: T[], previousIndex: number): T[] {
  const array = arr.slice(0);
  if (previousIndex >= array.length) return array;
  array.splice(previousIndex, 1);
  return array;
}

export function arrayInsert<T>(arr: T[], newIndex: number, value: T): T[] {
  const array = arr.slice(0);
  if (newIndex === array.length) {
    array.push(value);
  } else {
    array.splice(newIndex, 0, value);
  }
  return array;
}

export const events = {
  start: ['touchstart', 'mousedown'],
  move: ['touchmove', 'mousemove'],
  end: ['touchend', 'touchcancel', 'mouseup'],
};

export const vendorPrefix: string = (function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return ''; // server environment
  // fix for:
  //    https://bugzilla.mozilla.org/show_bug.cgi?id=548397
  //    window.getComputedStyle() returns null inside an iframe with display: none
  // in this case return an array with a fake mozilla style in it.
  const styles = window.getComputedStyle(document.documentElement, '') || ['-moz-hidden-iframe'];
  // @ts-ignore
  const pre = (Array.prototype.slice
    .call(styles)
    .join('')
    .match(/-(moz|webkit|ms)-/) ||
    // @ts-ignore
    (styles.OLink === '' && ['', 'o']))[1];

  switch (pre) {
    case 'ms':
      return 'ms';
    default:
      return pre && pre.length ? pre[0].toUpperCase() + pre.substr(1) : '';
  }
})();

export function closest(el: Node | null, fn: (el: Node) => boolean) {
  while (el) {
    if (fn(el)) return el;
    el = el.parentNode;
  }
}

export function limit(min: number, max: number, value: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getCSSPixelValue(stringValue: string): number {
  if (stringValue.substr(-2) === 'px') {
    return parseFloat(stringValue);
  }
  return 0;
}

export function getElementMargin(element: HTMLElement) {
  const style = window.getComputedStyle(element);

  return {
    top: getCSSPixelValue(style.marginTop),
    right: getCSSPixelValue(style.marginRight),
    bottom: getCSSPixelValue(style.marginBottom),
    left: getCSSPixelValue(style.marginLeft),
  };
}

export function getPointerOffset(e: MouseEvent | TouchEvent, reference: 'client' | 'page' = 'page') {
  const x = `${reference}X` as 'clientX' | 'pageX';
  const y = `${reference}Y` as 'clientY' | 'pageY';

  return {
    x: (e as TouchEvent).touches ? (e as TouchEvent).touches[0][x] : (e as MouseEvent)[x],
    y: (e as TouchEvent).touches ? (e as TouchEvent).touches[0][y] : (e as MouseEvent)[y],
  };
}

function offsetParents(node: HTMLElement) {
  var nodes = [node];
  for (; node; node = node.offsetParent as HTMLElement) {
    nodes.unshift(node);
  }
  return nodes;
}

export function commonOffsetParent(node1: HTMLElement, node2: HTMLElement) {
  var parents1 = offsetParents(node1);
  var parents2 = offsetParents(node2);

  if (parents1[0] != parents2[0]) throw 'No common ancestor!';

  for (var i = 0; i < parents1.length; i++) {
    if (parents1[i] != parents2[i]) return parents1[i - 1];
  }
}

export function getEdgeOffset(
  node: HTMLElement,
  container: HTMLElement,
  offset = { top: 0, left: 0 }
): { top: number; left: number } {
  // Get the actual offsetTop / offsetLeft value, no matter how deep the node is nested
  if (node) {
    const nodeOffset = {
      top: offset.top + node.offsetTop,
      left: offset.left + node.offsetLeft,
    };
    if (node.offsetParent !== container.offsetParent) {
      return getEdgeOffset(node.offsetParent as HTMLElement, container, nodeOffset);
    } else {
      return nodeOffset;
    }
  }
  return { top: 0, left: 0 };
}

export function cloneNode(node: HTMLElement) {
  const fields = node.querySelectorAll('input, textarea, select') as NodeListOf<HTMLInputElement>;
  const clonedNode = node.cloneNode(true) as HTMLElement;
  const clonedFields = [...clonedNode.querySelectorAll('input, textarea, select')] as HTMLInputElement[]; // Convert NodeList to Array

  clonedFields.forEach((field, index) => {
    if (field.type !== 'file' && fields[index]) {
      field.value = fields[index].value;
    }
  });

  return clonedNode;
}

export function getLockPixelOffsets(lockOffset: number | number[], width: number, height: number) {
  if (!Array.isArray(lockOffset)) {
    lockOffset = [lockOffset, lockOffset];
  }

  if (lockOffset.length !== 2) {
    throw new Error(
      `lockOffset prop of SortableContainer should be a single value or an array of exactly two values. Given ${lockOffset}`
    );
  }

  const [minLockOffset, maxLockOffset] = lockOffset;

  return [getLockPixelOffset(minLockOffset, width, height), getLockPixelOffset(maxLockOffset, width, height)];
}

export function getLockPixelOffset(lockOffset: number, width: number, height: number) {
  let offsetX = lockOffset;
  let offsetY = lockOffset;
  let unit = 'px';

  if (typeof lockOffset === 'string') {
    const match = /^[+-]?\d*(?:\.\d*)?(px|%)$/.exec(lockOffset);

    if (match === null) {
      throw new Error(
        `lockOffset value should be a number or a string of a number followed by "px" or "%". Given ${lockOffset}`
      );
    }

    offsetX = offsetY = parseFloat(lockOffset);
    unit = match[1];
  }

  if (!isFinite(offsetX) || !isFinite(offsetY)) {
    throw new Error(`lockOffset value should be a finite. Given ${lockOffset}`);
  }

  if (unit === '%') {
    offsetX = (offsetX * width) / 100;
    offsetY = (offsetY * height) / 100;
  }

  return {
    x: offsetX,
    y: offsetY,
  };
}

export function getDistance(x1: number, y1: number, x2: number, y2: number) {
  const x = x1 - x2;
  const y = y1 - y2;
  return Math.sqrt(x * x + y * y);
}

export function getRectCenter(clientRect: ClientRect) {
  return {
    x: clientRect.left + clientRect.width / 2,
    y: clientRect.top + clientRect.height / 2,
  };
}

export function resetTransform(nodes: { node: HTMLElement; edgeOffset: Coords | null }[] = []) {
  for (let i = 0, len = nodes.length; i < len; i++) {
    const node = nodes[i];
    const el = node.node;

    if (!el) return;

    // Clear the cached offsetTop / offsetLeft value
    node.edgeOffset = null;

    // Remove the transforms / transitions
    // @ts-ignore
    el.style[`${vendorPrefix}Transform`] = '';
    // @ts-ignore
    el.style[`${vendorPrefix}TransitionDuration`] = '';
  }
}

function withinBounds(pos: number, top: number, bottom: number) {
  const upper = Math.max(top, bottom);
  const lower = Math.min(top, bottom);
  return lower <= pos && pos <= upper;
}

export function isPointWithinRect({ x, y }: Coords, { top, left, width, height }: ClientRect) {
  const withinX = withinBounds(x, left, left + width);
  const withinY = withinBounds(y, top, top + height);
  return withinX && withinY;
}