// Bot cờ tướng: alpha-beta + iterative deepening + quiescence. Chạy trong Web Worker.
// Nhận {board: string[10][9] ('' hoặc ký tự), side:'r'|'b', ms}, trả {from:[r,c], to:[r,c], depth, score}
const VAL = { K: 6000, R: 900, C: 460, N: 420, B: 200, A: 200, P: 100 };
const PST_P = [ // tốt đỏ (nhìn từ phía đỏ, hàng 0 = sát cung đen)
  [0, 3, 6, 9, 12, 9, 6, 3, 0],
  [18, 36, 56, 80, 120, 80, 56, 36, 18],
  [14, 26, 42, 60, 80, 60, 42, 26, 14],
  [10, 20, 30, 34, 40, 34, 30, 20, 10],
  [6, 12, 18, 18, 20, 18, 18, 12, 6],
  [2, 0, 8, 0, 8, 0, 8, 0, 2],
  [0, 0, -2, 0, 4, 0, -2, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]];
const PST_N = [
  [4, 8, 16, 12, 4, 12, 16, 8, 4], [4, 10, 28, 16, 8, 16, 28, 10, 4], [12, 14, 16, 20, 18, 20, 16, 14, 12],
  [8, 24, 18, 24, 20, 24, 18, 24, 8], [6, 16, 14, 18, 16, 18, 14, 16, 6], [4, 12, 16, 14, 12, 14, 16, 12, 4],
  [2, 6, 8, 6, 10, 6, 8, 6, 2], [4, 2, 8, 8, 4, 8, 8, 2, 4], [0, 2, 4, 4, -2, 4, 4, 2, 0], [0, -4, 0, 0, 0, 0, 0, -4, 0]];
const PST_R = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14], [16, 20, 18, 24, 26, 24, 18, 20, 16], [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12], [12, 14, 12, 18, 18, 18, 12, 14, 12], [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [6, 10, 8, 14, 14, 14, 8, 10, 6], [4, 8, 6, 14, 12, 14, 6, 8, 4], [8, 4, 8, 16, 8, 16, 8, 4, 8], [-2, 10, 6, 14, 12, 14, 6, 10, -2]];
const PST_C = [
  [6, 4, 0, -10, -12, -10, 0, 4, 6], [2, 2, 0, -4, -14, -4, 0, 2, 2], [2, 2, 0, -10, -8, -10, 0, 2, 2],
  [0, 0, -2, 4, 10, 4, -2, 0, 0], [0, 0, 0, 2, 8, 2, 0, 0, 0], [-2, 0, 4, 2, 6, 2, 4, 0, -2],
  [0, 0, 0, 2, 4, 2, 0, 0, 0], [4, 0, 8, 6, 10, 6, 8, 0, 4], [0, 2, 4, 6, 6, 6, 4, 2, 0], [0, 0, 2, 6, 6, 6, 2, 0, 0]];
const PST = { P: PST_P, N: PST_N, R: PST_R, C: PST_C };
let B; // B[r*9+c] = char or ''
const red = p => p >= 'A' && p <= 'Z';
const sideOf = p => (p ? (red(p) ? 'r' : 'b') : null);
function evalBoard(s) {
  let sc = 0;
  for (let i = 0; i < 90; i++) {
    const p = B[i]; if (!p) continue;
    const t = p.toUpperCase(), r = (i / 9) | 0, c = i % 9;
    let v = VAL[t];
    const tbl = PST[t]; if (tbl) v += red(p) ? tbl[r][c] : tbl[9 - r][8 - c];
    sc += red(p) ? v : -v;
  }
  return s === 'r' ? sc : -sc;
}
function inPal(r, c, s) { return c >= 3 && c <= 5 && (s === 'r' ? r >= 7 : r <= 2); }
function gen(s, capsOnly) {
  const out = [];
  for (let i = 0; i < 90; i++) {
    const p = B[i]; if (!p || sideOf(p) !== s) continue;
    const r = (i / 9) | 0, c = i % 9, t = p.toUpperCase();
    const add = (rr, cc) => { if (rr < 0 || rr > 9 || cc < 0 || cc > 8) return; const q = B[rr * 9 + cc]; if (q && sideOf(q) === s) return; if (capsOnly && !q) return; out.push([i, rr * 9 + cc, q ? VAL[q.toUpperCase()] * 10 - VAL[t] : 0]); };
    if (t === 'K') { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inPal(r + a, c + b, s)) add(r + a, c + b); }
    else if (t === 'A') { for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (inPal(r + a, c + b, s)) add(r + a, c + b); }
    else if (t === 'B') { for (const [a, b] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) { const rr = r + a, cc = c + b; if (rr < 0 || rr > 9 || cc < 0 || cc > 8) continue; if (s === 'r' ? rr < 5 : rr > 4) continue; if (B[(r + a / 2) * 9 + c + b / 2]) continue; add(rr, cc); } }
    else if (t === 'N') { for (const [lr, lc, mv] of [[1, 0, [[2, 1], [2, -1]]], [-1, 0, [[-2, 1], [-2, -1]]], [0, 1, [[1, 2], [-1, 2]]], [0, -1, [[1, -2], [-1, -2]]]]) { const rr = r + lr, cc = c + lc; if (rr < 0 || rr > 9 || cc < 0 || cc > 8 || B[rr * 9 + cc]) continue; for (const [a, b] of mv) add(r + a, c + b); } }
    else if (t === 'R' || t === 'C') {
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let rr = r + a, cc = c + b, jumped = false;
        while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) {
          const q = B[rr * 9 + cc];
          if (t === 'R') { if (!q) { if (!capsOnly) out.push([i, rr * 9 + cc, 0]); } else { if (sideOf(q) !== s) out.push([i, rr * 9 + cc, VAL[q.toUpperCase()] * 10 - VAL[t]]); break; } }
          else { if (!jumped) { if (!q) { if (!capsOnly) out.push([i, rr * 9 + cc, 0]); } else jumped = true; } else if (q) { if (sideOf(q) !== s) out.push([i, rr * 9 + cc, VAL[q.toUpperCase()] * 10 - VAL[t]]); break; } }
          rr += a; cc += b;
        }
      }
    } else if (t === 'P') { const f = s === 'r' ? -1 : 1; add(r + f, c); if (s === 'r' ? r <= 4 : r >= 5) { add(r, c + 1); add(r, c - 1); } }
  }
  return out;
}
function attacked(s) { // vua bên s có bị chiếu?
  const k = s === 'r' ? 'K' : 'k'; let ki = -1; for (let i = 0; i < 90; i++) if (B[i] === k) { ki = i; break; }
  if (ki < 0) return true;
  const r = (ki / 9) | 0, c = ki % 9, o = s === 'r' ? 'b' : 'r';
  const is = (i, t) => { const p = B[i]; return p && sideOf(p) === o && p.toUpperCase() === t; };
  // xe, pháo, tướng đối mặt
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let rr = r + a, cc = c + b, screens = 0;
    while (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8) {
      const i = rr * 9 + cc, p = B[i];
      if (p) {
        if (screens === 0) { if (is(i, 'R') || (b === 0 && is(i, 'K'))) return true; screens = 1; }
        else { if (is(i, 'C')) return true; break; }
      }
      rr += a; cc += b;
    }
  }
  // mã
  for (const [lr, lc, mv] of [[1, 1, [[2, 1], [1, 2]]], [1, -1, [[2, -1], [1, -2]]], [-1, 1, [[-2, 1], [-1, 2]]], [-1, -1, [[-2, -1], [-1, -2]]]]) {
    const er = r + lr, ec = c + lc; if (er < 0 || er > 9 || ec < 0 || ec > 8 || B[er * 9 + ec]) continue; // chân mã (từ góc nhìn vua)
    for (const [a, b] of mv) { const rr = r + a, cc = c + b; if (rr >= 0 && rr <= 9 && cc >= 0 && cc <= 8 && is(rr * 9 + cc, 'N')) return true; }
  }
  // tốt
  const f = s === 'r' ? -1 : 1; // tốt đối phương tấn công từ phía trước vua
  if (r + f >= 0 && r + f <= 9 && is((r + f) * 9 + c, 'P')) return true;
  if (c > 0 && is(r * 9 + c - 1, 'P')) return true; if (c < 8 && is(r * 9 + c + 1, 'P')) return true;
  return false;
}
let nodes = 0, deadline = 0, stop = false;
const MATE = 100000;
function q(s, alpha, beta, d) {
  const stand = evalBoard(s); if (stand >= beta) return stand; if (stand > alpha) alpha = stand; if (d <= 0) return alpha;
  const mv = gen(s, true).sort((x, y) => y[2] - x[2]); const o = s === 'r' ? 'b' : 'r';
  for (const [f, t] of mv) {
    const cap = B[t], pc = B[f]; B[t] = pc; B[f] = '';
    if (attacked(s)) { B[f] = pc; B[t] = cap; continue; }
    const v = cap && cap.toUpperCase() === 'K' ? MATE : -q(o, -beta, -alpha, d - 1);
    B[f] = pc; B[t] = cap;
    if (v >= beta) return v; if (v > alpha) alpha = v;
  }
  return alpha;
}
function search(s, depth, alpha, beta, ply) {
  if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true;
  if (stop) return 0;
  if (depth <= 0) return q(s, alpha, beta, 4);
  const o = s === 'r' ? 'b' : 'r';
  const mv = gen(s, false).sort((x, y) => y[2] - x[2]);
  let best = -MATE + ply, legal = 0;
  for (const [f, t] of mv) {
    const cap = B[t], pc = B[f]; B[t] = pc; B[f] = '';
    if (attacked(s)) { B[f] = pc; B[t] = cap; continue; }
    legal++;
    const inChk = attacked(o);
    const v = -search(o, depth - 1 + (inChk && ply < 6 ? 1 : 0), -beta, -alpha, ply + 1);
    B[f] = pc; B[t] = cap;
    if (stop) return 0;
    if (v > best) best = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
  }
  if (!legal) return -MATE + ply; // bị chiếu bí / hết nước (cờ tướng: thua)
  return best;
}
function think(board, s, ms, noise) {
  B = []; for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) B.push(board[r][c] || '');
  deadline = Date.now() + ms; stop = false; nodes = 0;
  const o = s === 'r' ? 'b' : 'r';
  let root = gen(s, false).filter(([f, t]) => { const cap = B[t], pc = B[f]; B[t] = pc; B[f] = ''; const ok = !attacked(s); B[f] = pc; B[t] = cap; return ok; });
  if (!root.length) return null;
  let bestMove = root[0], bestDepth = 0, bestScore = 0;
  for (let d = 1; d <= 12; d++) {
    const scored = [];
    let alpha = -MATE - 1;
    for (const m of root) {
      const [f, t] = m; const cap = B[t], pc = B[f]; B[t] = pc; B[f] = '';
      const v = -search(o, d - 1, -MATE - 1, -alpha + (noise || 0), 1);
      B[f] = pc; B[t] = cap;
      if (stop) break;
      scored.push([v + (noise ? Math.random() * noise : 0), m, v]); if (v > alpha) alpha = v;
    }
    if (stop && scored.length < root.length) break;
    scored.sort((a, b) => b[0] - a[0]);
    root = scored.map(x => x[1]); bestMove = scored[0][1]; bestScore = scored[0][2]; bestDepth = d;
    if (Math.abs(bestScore) > MATE - 100) break;
  }
  const [f, t] = bestMove;
  return { from: [(f / 9) | 0, f % 9], to: [(t / 9) | 0, t % 9], depth: bestDepth, score: bestScore, nodes };
}
if (typeof self !== 'undefined' && typeof window === 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = e => { const { board, side, ms, noise, id } = e.data; self.postMessage({ id, ...(think(board, side, ms, noise) || { none: true }) }); };
}
if (typeof module !== 'undefined') module.exports = { think };
