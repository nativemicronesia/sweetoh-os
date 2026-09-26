export type LayerOrderDirection = "forward" | "backward" | "front" | "back";

/** Reorder only selected tracked layers while preserving both group and peer order. */
export function reorderLayers<T>(layers: readonly T[], selected: ReadonlySet<T>, direction: LayerOrderDirection): T[] {
  const order = [...layers];
  if (direction === "front") {
    const moving = order.filter((layer) => selected.has(layer));
    return [...order.filter((layer) => !selected.has(layer)), ...moving];
  }
  if (direction === "back") {
    const moving = order.filter((layer) => selected.has(layer));
    return [...moving, ...order.filter((layer) => !selected.has(layer))];
  }
  if (direction === "forward") {
    for (let i = order.length - 2; i >= 0; i--) if (selected.has(order[i]) && !selected.has(order[i + 1])) [order[i], order[i + 1]] = [order[i + 1], order[i]];
    return order;
  }
  for (let i = 1; i < order.length; i++) if (selected.has(order[i]) && !selected.has(order[i - 1])) [order[i], order[i - 1]] = [order[i - 1], order[i]];
  return order;
}
