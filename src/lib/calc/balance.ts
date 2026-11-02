/**
 * Reparto con **doble restricción**: cada gasto suma exactamente su monto y el
 * total de cada persona es el que resulta del mayor resto sobre el total del
 * hogar. Se resuelve como un problema de transporte en centavos (redondeo
 * controlado): se parte de las cuotas exactas, se redondea hacia abajo y los
 * centavos sobrantes se asignan con un flujo máximo, respetando filas y
 * columnas a la vez.
 *
 * Si la estructura de participación hace imposible cumplir ambas a la vez
 * (componentes separados), devuelve `null` y quien llama usa el reparto por
 * gasto.
 */
import { largestRemainder } from "./money";

export interface BalanceRow {
  id: string;
  /** Monto del gasto en centavos. */
  total: number;
  participants: { id: string; weight: number }[];
}

export interface BalanceResult {
  byExpense: Record<string, Record<string, number>>;
  byMember: Record<string, number>;
  /** Total ideal (mayor resto sobre el total general) por persona. */
  ideal: Record<string, number>;
}

interface Edge {
  to: number;
  cap: number;
  rev: number;
}

function addEdge(graph: Edge[][], u: number, v: number, cap: number): Edge {
  const forward: Edge = { to: v, cap, rev: graph[v].length };
  const backward: Edge = { to: u, cap: 0, rev: graph[u].length };
  graph[u].push(forward);
  graph[v].push(backward);
  return forward;
}

/** Flujo máximo (Edmonds–Karp) sobre una red pequeña con capacidades enteras. */
function maxFlow(graph: Edge[][], source: number, sink: number): number {
  const n = graph.length;
  let flow = 0;
  for (;;) {
    const fromNode = new Array<number>(n).fill(-1);
    const fromEdge = new Array<number>(n).fill(-1);
    const queue = [source];
    fromNode[source] = source;
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (let i = 0; i < graph[u].length; i += 1) {
        const e = graph[u][i];
        if (e.cap > 0 && fromNode[e.to] === -1) {
          fromNode[e.to] = u;
          fromEdge[e.to] = i;
          queue.push(e.to);
        }
      }
    }
    if (fromNode[sink] === -1) break;

    let push = Infinity;
    for (let v = sink; v !== source; v = fromNode[v]) {
      push = Math.min(push, graph[fromNode[v]][fromEdge[v]].cap);
    }
    for (let v = sink; v !== source; v = fromNode[v]) {
      const u = fromNode[v];
      const e = graph[u][fromEdge[v]];
      e.cap -= push;
      graph[v][e.rev].cap += push;
    }
    flow += push;
  }
  return flow;
}

export function balanceToIdeal(rows: BalanceRow[], memberIds: string[]): BalanceResult | null {
  const grand = rows.reduce((sum, r) => sum + r.total, 0);
  if (rows.length === 0 || memberIds.length === 0) return null;

  // 1. Cuotas exactas por celda (solo participantes) y total exacto por persona.
  const exactTotal: Record<string, number> = {};
  for (const id of memberIds) exactTotal[id] = 0;

  const floorCells: Record<string, number>[] = [];
  let usesAll = true;
  for (const row of rows) {
    const active = row.participants.filter((p) => memberIds.includes(p.id));
    if (active.length === 0) {
      usesAll = false;
      floorCells.push({});
      continue;
    }
    const W = active.reduce((a, p) => a + p.weight, 0);
    const cells: Record<string, number> = {};
    for (const p of active) {
      const share = W > 0 ? (row.total * p.weight) / W : row.total / active.length;
      exactTotal[p.id] += share;
      cells[p.id] = Math.floor(share + 1e-9);
    }
    floorCells.push(cells);
  }
  if (!usesAll) return null;

  // 2. Total ideal por persona (mayor resto sobre el total general).
  const idealParts = largestRemainder(grand, memberIds.map((id) => exactTotal[id]));
  const ideal: Record<string, number> = {};
  memberIds.forEach((id, i) => {
    ideal[id] = idealParts[i];
  });

  // 3. Déficits por fila y columna.
  const rowDeficit = rows.map((row, i) => {
    const placed = Object.values(floorCells[i]).reduce((a, b) => a + b, 0);
    return row.total - placed;
  });
  const colDeficit: Record<string, number> = {};
  for (const id of memberIds) colDeficit[id] = ideal[id];
  rows.forEach((_, i) => {
    for (const [id, value] of Object.entries(floorCells[i])) {
      colDeficit[id] -= value;
    }
  });
  if (rowDeficit.some((d) => d < 0) || memberIds.some((id) => colDeficit[id] < 0)) {
    return null;
  }

  // 4. Flujo máximo para colocar los centavos restantes.
  const R = rows.length;
  const M = memberIds.length;
  const source = 0;
  const sink = R + M + 1;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  const INF = grand + 1;

  rows.forEach((_, i) => {
    if (rowDeficit[i] > 0) addEdge(graph, source, 1 + i, rowDeficit[i]);
  });
  const colNode = new Map<string, number>();
  memberIds.forEach((id, j) => colNode.set(id, 1 + R + j));

  const flowEdges: { row: number; member: string; edge: Edge }[] = [];
  rows.forEach((row, i) => {
    for (const p of row.participants) {
      const node = colNode.get(p.id);
      if (node === undefined) continue;
      const edge = addEdge(graph, 1 + i, node, INF);
      flowEdges.push({ row: i, member: p.id, edge });
    }
  });
  memberIds.forEach((id) => {
    const need = colDeficit[id];
    if (need > 0) addEdge(graph, colNode.get(id)!, sink, need);
  });

  const needed = rowDeficit.reduce((a, b) => a + b, 0);
  if (maxFlow(graph, source, sink) !== needed) return null;

  // 5. Construir la matriz final.
  const byExpense: Record<string, Record<string, number>> = {};
  const byMember: Record<string, number> = {};
  for (const id of memberIds) byMember[id] = 0;

  rows.forEach((row, i) => {
    const amounts: Record<string, number> = { ...floorCells[i] };
    for (const f of flowEdges) {
      if (f.row !== i) continue;
      const used = INF - f.edge.cap;
      if (used > 0) amounts[f.member] = (amounts[f.member] ?? 0) + used;
    }
    byExpense[row.id] = amounts;
    for (const [id, value] of Object.entries(amounts)) byMember[id] += value;
  });

  // 6. Verificación (por si acaso): filas y columnas exactas.
  const rowsOk = rows.every(
    (row) => Object.values(byExpense[row.id]).reduce((a, b) => a + b, 0) === row.total
  );
  const colsOk = memberIds.every((id) => byMember[id] === ideal[id]);
  if (!rowsOk || !colsOk) return null;

  return { byExpense, byMember, ideal };
}
