import type { DOMElement } from "ink";

const isDOMElement = (node: unknown): node is DOMElement =>
  node !== null &&
  typeof node === "object" &&
  "nodeName" in node &&
  "childNodes" in node &&
  Array.isArray((node as DOMElement).childNodes);

const findDeepest = (
  node: DOMElement,
  absoluteX: number,
  absoluteY: number,
  clickX: number,
  clickY: number,
): DOMElement | null => {
  const yoga = node.yogaNode;
  if (!yoga) return null;

  const nodeLeft = absoluteX + yoga.getComputedLeft();
  const nodeTop = absoluteY + yoga.getComputedTop();
  const nodeWidth = yoga.getComputedWidth();
  const nodeHeight = yoga.getComputedHeight();

  const withinBounds =
    clickX >= nodeLeft &&
    clickX < nodeLeft + nodeWidth &&
    clickY >= nodeTop &&
    clickY < nodeTop + nodeHeight;

  if (!withinBounds) return null;

  for (const child of node.childNodes) {
    if (isDOMElement(child)) {
      const deeper = findDeepest(child, nodeLeft, nodeTop, clickX, clickY);
      if (deeper) return deeper;
    }
  }

  return node;
};

export const hitTest = (root: DOMElement, clickX: number, clickY: number): DOMElement | null => {
  return findDeepest(root, 0, 0, clickX, clickY);
};
