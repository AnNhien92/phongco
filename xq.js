// Xiangqi rules engine. Board: 10 rows x 9 cols, row 0 = black side (top), row 9 = red side (bottom).
// Red pieces uppercase, black lowercase: K/k tướng, A/a sĩ, B/b tượng, N/n mã, R/r xe, C/c pháo, P/p tốt.
(function (root) {
  const INIT = [
    'rnbakabnr', '.........', '.c.....c.', 'p.p.p.p.p', '.........',
    '.........', 'P.P.P.P.P', '.C.....C.', '.........', 'RNBAKABNR'
  ];
  function initBoard() { return INIT.map(r => r.split('').map(ch => ch === '.' ? '' : ch)); }
  const isRed = p => p && p === p.toUpperCase();
  const side = p => (p ? (isRed(p) ? 'r' : 'b') : null);
  const inB = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
  const inPalace = (r, c, s) => c >= 3 && c <= 5 && (s === 'r' ? r >= 7 : r <= 2);
  function pseudo(b, r, c) {
    const p = b[r][c]; if (!p) return [];
    const s = side(p), t = p.toUpperCase(), out = [];
    const push = (rr, cc) => { if (inB(rr, cc) && side(b[rr][cc]) !== s) out.push([rr, cc]); };
    if (t === 'K') { for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const rr = r+dr, cc = c+dc; if (inPalace(rr, cc, s)) push(rr, cc); } }
    else if (t === 'A') { for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) { const rr = r+dr, cc = c+dc; if (inPalace(rr, cc, s)) push(rr, cc); } }
    else if (t === 'B') {
      for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const rr = r+dr, cc = c+dc; if (!inB(rr, cc)) continue;
        if (s === 'r' ? rr < 5 : rr > 4) continue;
        if (b[r+dr/2][c+dc/2]) continue; push(rr, cc);
      }
    } else if (t === 'N') {
      for (const [lr, lc, moves] of [[1,0,[[2,1],[2,-1]]],[-1,0,[[-2,1],[-2,-1]]],[0,1,[[1,2],[-1,2]]],[0,-1,[[1,-2],[-1,-2]]]]) {
        if (!inB(r+lr, c+lc) || b[r+lr][c+lc]) continue;
        for (const [dr, dc] of moves) push(r+dr, c+dc);
      }
    } else if (t === 'R' || t === 'C') {
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let rr = r+dr, cc = c+dc, jumped = false;
        while (inB(rr, cc)) {
          const q = b[rr][cc];
          if (t === 'R') { if (!q) out.push([rr, cc]); else { if (side(q) !== s) out.push([rr, cc]); break; } }
          else {
            if (!jumped) { if (!q) out.push([rr, cc]); else jumped = true; }
            else if (q) { if (side(q) !== s) out.push([rr, cc]); break; }
          }
          rr += dr; cc += dc;
        }
      }
    } else if (t === 'P') {
      const f = s === 'r' ? -1 : 1; push(r+f, c);
      const crossed = s === 'r' ? r <= 4 : r >= 5;
      if (crossed) { push(r, c+1); push(r, c-1); }
    }
    return out;
  }
  function findKing(b, s) { const k = s === 'r' ? 'K' : 'k'; for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) if (b[r][c] === k) return [r, c]; return null; }
  function inCheck(b, s) {
    const k = findKing(b, s); if (!k) return true;
    const o = findKing(b, s === 'r' ? 'b' : 'r');
    if (o && o[1] === k[1]) { // flying general
      let clear = true; const [a, z] = [Math.min(k[0], o[0]), Math.max(k[0], o[0])];
      for (let r = a+1; r < z; r++) if (b[r][k[1]]) { clear = false; break; }
      if (clear) return true;
    }
    for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) {
      const p = b[r][c]; if (!p || side(p) === s) continue;
      for (const [rr, cc] of pseudo(b, r, c)) if (rr === k[0] && cc === k[1]) return true;
    }
    return false;
  }
  function apply(b, f, t) { const n = b.map(row => row.slice()); n[t[0]][t[1]] = n[f[0]][f[1]]; n[f[0]][f[1]] = ''; return n; }
  function legalFrom(b, r, c) { const s = side(b[r][c]); return pseudo(b, r, c).filter(t => !inCheck(apply(b, [r, c], t), s)); }
  function hasMoves(b, s) { for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) if (side(b[r][c]) === s && legalFrom(b, r, c).length) return true; return false; }
  function isLegal(b, f, t, s) { if (side(b[f[0]][f[1]]) !== s) return false; return legalFrom(b, f[0], f[1]).some(m => m[0] === t[0] && m[1] === t[1]); }
  root.XQ = { initBoard, side, isRed, legalFrom, isLegal, apply, inCheck, hasMoves };
})(typeof window !== 'undefined' ? window : globalThis);
