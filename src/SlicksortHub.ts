import Manager from './Manager';
import { getRectCenter, getDistance, getPointerOffset, isPointWithinRect, PointEvent } from './utils';

let containerIDCounter = 1;

export interface ContainerRef {
  id: string;
  group: string;
  accept: AcceptProp | null;
  block: string[];
  container: HTMLElement;
  newIndex: number;
  manager: Manager;
  sortableGhost: HTMLElement | null;

  // Custom fields
  isLeaf: boolean;
  leavesFieldName: string;
  rootUuid: string;
  

  handleDragIn(e: PointEvent, ghost: HTMLElement | null, helper: HTMLElement | null): void;
  handleDragOut(): void;
  handleDragEnd(): void;
  handleSortEnd(e: PointEvent): void;
  handleDropIn(payload: unknown): void;
  handleDropOut(): unknown;

  updatePosition(e: PointEvent): void;
  animateNodes(): void;
  autoscroll(): void;
}

type AcceptPropArgs = { source: ContainerRef; dest: ContainerRef; payload: unknown };
export type AcceptProp = boolean | string[] | ((args: AcceptPropArgs) => boolean);

/**
 * Always allow when dest === source
 * Defer to 'dest.accept()' if it is a function
 * Allow any group in the accept lists
 * Deny any group in the block list
 * Allow the same group by default, this can be overridden with the block prop
 */
function canAcceptElement(dest: ContainerRef, source: ContainerRef, payload: unknown): boolean {
  console.log('## canAcceptElement', { dest, source, payload});
  if (source.id === dest.id) return true;

  //! This is a bit hackish to prevent an existing list with leaves to be added to a leaf.
  if (dest.isLeaf && payload[dest.leavesFieldName] && Array.isArray(payload[dest.leavesFieldName]) && payload[dest.leavesFieldName].length > 0) {
    console.log("## can't accept");
    return false;
  } else {
    console.log("## Can accept", { isLeaf: dest.isLeaf, children: payload[dest.leavesFieldName], isArray: Array.isArray(payload[dest.leavesFieldName]), hasChildren: payload[dest.leavesFieldName]?.length > 0 });
  }


  if (dest.block && dest.block.includes(source.group)) return false;
  if (typeof dest.accept === 'function') {
    return dest.accept({ dest, source, payload });
  }
  if (typeof dest.accept === 'boolean') {
    return dest.accept;
  }
  if (dest.accept && dest.accept.includes(source.group)) return true;
  if (dest.group === source.group) return true;
  return false;
}


function printRefs(refs: ContainerRef[]): void {
  console.log("## REFS");
  for (let i = 0; i < refs.length; i++) {
    console.log(`${refs[i].id}`, refs[i]);
  }
}


function findClosestDest(
  { x, y }: { x: number; y: number },
  refs: ContainerRef[],
  currentDest: ContainerRef,
  payload: unknown
): ContainerRef | null {
  // Quickly check if we are within the bounds of the current destination and currentDest is a leaf level list.
  // console.log(`findClosestDest ${currentDest.id} - ${currentDest.container.className}`);
  if (isPointWithinRect({ x, y }, currentDest.container.getBoundingClientRect()) && currentDest.isLeaf) {
     return currentDest;
  }
  // console.log(`continue searhing`);

  let closest = null;
  let minDistance = Infinity;
  // printRefs(refs);
  let root = null;
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];

    
    if (ref.rootUuid === payload.uuid) {
      // console.log("not eligible dest.");
    } else {

      const rect = ref.container.getBoundingClientRect();
      // console.log(`checking ref ${ref.id}]`);
      if (isPointWithinRect({ x, y }, rect)) {
        // Check for leaf, return a leaf over root.
        if (ref.isLeaf) {
          // console.log("leaf found", { payloadUuid: payload.uuid, refUuid: ref.rootUuid});
          // If we are within another destination, stop here
          return ref;
        } else {
          // console.log("root found");
          root = ref;
        }
      }

      const center = getRectCenter(rect);
      const distance = getDistance(x, y, center.x, center.y);
      if (distance < minDistance) {
        closest = ref;
        minDistance = distance;
      }
    }
    
  }

  // if root, but not leaf was found return it.
  if (root) {
    return root;
  }

  // Try to guess the closest destination
  return closest;
}

export default class SlicksortHub {
  public helper: HTMLElement | null = null;
  public ghost: HTMLElement | null = null;

  private refs: ContainerRef[] = [];
  private source: ContainerRef | null = null;
  private dest: ContainerRef | null = null;

  getId(): string {
    return '' + containerIDCounter++;
  }

  isSource({ id }: ContainerRef): boolean {
    return this.source?.id === id;
  }

  getSource(): ContainerRef | null {
    return this.source;
  }

  isDest({ id }: ContainerRef): boolean {
    return this.dest?.id === id;
  }

  getDest(): ContainerRef | null {
    return this.dest;
  }

  addContainer(ref: ContainerRef): void {
    // console.log("hub add container", ref);
    this.refs.push(ref);
  }

  removeContainer(ref: ContainerRef): void {
    this.refs = this.refs.filter((c) => c.id !== ref.id);
  }

  sortStart(ref: ContainerRef): void {
    // console.log('--sortStart');
    this.source = ref;
    this.dest = ref;
  }


  handleSortMove(e: PointEvent, payload: unknown): void {
    // console.log('--sort move', {e, payload});
    const dest = this.dest;
    const source = this.source;
    
    if (!dest || !source) return;

    const refs = this.refs;
    const pointer = getPointerOffset(e, 'client');
    const newDest = findClosestDest(pointer, refs, dest, payload) || dest;
    // console.log(`handleSortMove ${newDest.container.className} (${refs.length})`, { e, dest, newDest, payload, source});

    
    // console.log("???", { isDiff: dest.id !== newDest.id, canAccept: canAcceptElement(newDest, source, payload) });
    if (dest.id !== newDest.id && canAcceptElement(newDest, source, payload)) {
      this.dest = newDest;
      dest.handleDragOut();
      newDest.handleDragIn(e, this.ghost, this.helper);
    }
    if (dest.id !== this.source?.id) {
      this.dest?.updatePosition(e);
      this.dest?.animateNodes();
      this.dest?.autoscroll();
    }
  }

  handleSortEnd(): void {
    // console.log("handleSortEnd", { source: this.source.id, dest: this.dest.id });
    if (this.source?.id === this.dest?.id) return;
    // console.log("procceed to handleDropOut", { source: this.source});
    const payload = this.source?.handleDropOut();
    // console.log("procceed to handleDropIn", { dest: this.dest, payload});
    this.dest?.handleDropIn(payload);
    this.reset();
  }

  reset(): void {    
    // console.log('--reset');
    this.source = null;
    this.dest = null;
    this.helper = null;
    this.ghost = null;
  }

  cancel(): void {    
    // console.log('--cancel');
    this.dest?.handleDragEnd();
    this.reset();
  }
}
