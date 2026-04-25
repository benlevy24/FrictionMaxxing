import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing } from '../theme';

// ── Types & configs ───────────────────────────────────────────────────────────

const W = 'w', B = 'b';

// Difficulty:
//   easy   — standard start, AI plays randomly
//   medium — standard start, AI gets 2 free moves before you can go
//   hard   — you start without your queen, AI uses minimax
const CONFIGS = {
  easy:   { aiPreMoves: 0, noQueenStart: false, aiDepth: 0 },
  medium: { aiPreMoves: 2, noQueenStart: false, aiDepth: 1 },
  hard:   { aiPreMoves: 2, noQueenStart: true,  aiDepth: 2 },
};

const SYMBOLS = {
  w: { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙' },
  b: { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟' },
};

const PIECE_VAL = { P:1, N:3, B:3.2, R:5, Q:9, K:0 };

const CELL = Math.floor((Dimensions.get('window').width - 32) / 8);

// ── Board initialization ──────────────────────────────────────────────────────

function pc(type, color) { return { type, color }; }

function initialBoard(noQueenStart) {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  b[0] = ['R','N','B','Q','K','B','N','R'].map(t => pc(t, B));
  b[1] = Array(8).fill(null).map(() => pc('P', B));
  b[6] = Array(8).fill(null).map(() => pc('P', W));
  b[7] = ['R','N','B','Q','K','B','N','R'].map(t => pc(t, W));
  if (noQueenStart) b[7][3] = null; // hard mode: player has no queen
  return b;
}

// ── Move generation ───────────────────────────────────────────────────────────

function inB(r, c) { return r>=0 && r<8 && c>=0 && c<8; }

function getRawMoves(board, r, c, ep) {
  const p = board[r][c];
  if (!p) return [];
  const { type, color } = p;
  const opp = color===W ? B : W;
  const moves = [];

  const addM = (tr, tc, extra={}) => {
    if (inB(tr,tc)) moves.push({ from:[r,c], to:[tr,tc], ...extra });
  };

  const slide = (dr, dc) => {
    let [nr,nc] = [r+dr, c+dc];
    while (inB(nr,nc)) {
      if (board[nr][nc]) {
        if (board[nr][nc].color===opp) addM(nr, nc, { cap: board[nr][nc] });
        break;
      }
      addM(nr, nc);
      nr+=dr; nc+=dc;
    }
  };

  switch (type) {
    case 'P': {
      const dir = color===W ? -1 : 1;
      const home = color===W ? 6 : 1;
      if (inB(r+dir,c) && !board[r+dir][c]) {
        addM(r+dir, c, { promo: r+dir===0||r+dir===7 });
        if (r===home && !board[r+2*dir][c]) addM(r+2*dir, c, { dp: true });
      }
      for (const dc of [-1,1]) {
        const [nr,nc] = [r+dir, c+dc];
        if (!inB(nr,nc)) continue;
        if (board[nr][nc]?.color===opp)
          addM(nr, nc, { cap: board[nr][nc], promo: nr===0||nr===7 });
        else if (ep && ep[0]===nr && ep[1]===nc)
          addM(nr, nc, { ep: true, cap: board[r][nc] });
      }
      break;
    }
    case 'N':
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        if (inB(r+dr,c+dc) && board[r+dr][c+dc]?.color!==color)
          addM(r+dr, c+dc, board[r+dr][c+dc] ? { cap: board[r+dr][c+dc] } : {});
      break;
    case 'B': [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => slide(dr,dc)); break;
    case 'R': [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => slide(dr,dc)); break;
    case 'Q': [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); break;
    case 'K':
      for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        if (inB(r+dr,c+dc) && board[r+dr][c+dc]?.color!==color)
          addM(r+dr, c+dc, board[r+dr][c+dc] ? { cap: board[r+dr][c+dc] } : {});
      break;
  }
  return moves;
}

function applyMove(board, move) {
  const b = board.map(r=>[...r]);
  const [fr,fc] = move.from, [tr,tc] = move.to;
  const p = b[fr][fc];
  if (move.ep) b[fr][tc] = null;                       // en passant capture
  b[tr][tc] = move.promo ? pc('Q', p.color) : p;       // auto-promote to queen
  b[fr][fc] = null;
  if (move.castle==='K') { const row=p.color===W?7:0; b[row][5]=b[row][7]; b[row][7]=null; }
  if (move.castle==='Q') { const row=p.color===W?7:0; b[row][3]=b[row][0]; b[row][0]=null; }
  return b;
}

function epTarget(move) {
  if (!move.dp) return null;
  const [fr] = move.from, [tr,tc] = move.to;
  return [(fr+tr)/2, tc];
}

function updateCR(cr, move, board) {
  const r = {...cr};
  const p = board[move.from[0]][move.from[1]];
  const [fr,fc] = move.from, [tr,tc] = move.to;
  if (p?.type==='K') { r[p.color+'K']=false; r[p.color+'Q']=false; }
  if (p?.type==='R') {
    if (fr===7&&fc===7) r.wK=false; if (fr===7&&fc===0) r.wQ=false;
    if (fr===0&&fc===7) r.bK=false; if (fr===0&&fc===0) r.bQ=false;
  }
  // Rook captured at starting square
  if (tr===7&&tc===7) r.wK=false; if (tr===7&&tc===0) r.wQ=false;
  if (tr===0&&tc===7) r.bK=false; if (tr===0&&tc===0) r.bQ=false;
  return r;
}

function findKing(board, color) {
  for (let r=0;r<8;r++) for (let c=0;c<8;c++)
    if (board[r][c]?.type==='K' && board[r][c]?.color===color) return [r,c];
  return null;
}

function isAttacked(board, r, c, byColor) {
  for (let pr=0;pr<8;pr++) for (let pc2=0;pc2<8;pc2++) {
    if (board[pr][pc2]?.color!==byColor) continue;
    if (getRawMoves(board,pr,pc2).some(m=>m.to[0]===r&&m.to[1]===c)) return true;
  }
  return false;
}

function inCheck(board, color) {
  const k = findKing(board, color);
  return k ? isAttacked(board, k[0], k[1], color===W?B:W) : false;
}

function getLegal(board, color, cr, ep) {
  const opp = color===W?B:W;
  const pseudo = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++)
    if (board[r][c]?.color===color) pseudo.push(...getRawMoves(board,r,c,ep));

  // Castling
  const row = color===W?7:0;
  if (cr[color+'K'] && !board[row][5] && !board[row][6]
      && !inCheck(board,color)
      && !isAttacked(board,row,5,opp) && !isAttacked(board,row,6,opp))
    pseudo.push({ from:[row,4], to:[row,6], castle:'K' });
  if (cr[color+'Q'] && !board[row][3] && !board[row][2] && !board[row][1]
      && !inCheck(board,color)
      && !isAttacked(board,row,3,opp) && !isAttacked(board,row,2,opp))
    pseudo.push({ from:[row,4], to:[row,2], castle:'Q' });

  return pseudo.filter(m => !inCheck(applyMove(board,m), color));
}

// ── AI ────────────────────────────────────────────────────────────────────────

function evalB(board) {
  let s=0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p=board[r][c]; if (!p) continue;
    const v=PIECE_VAL[p.type]??0;
    s += p.color===B ? v : -v;
  }
  return s;
}

function alphabeta(board, depth, alpha, beta, isMax, cr, ep) {
  const color = isMax ? B : W;
  const moves = getLegal(board, color, cr, ep);
  if (depth===0 || !moves.length) {
    if (!moves.length) return inCheck(board,color) ? (isMax?-999:999) : 0;
    return evalB(board);
  }
  if (isMax) {
    let best=-Infinity;
    for (const m of moves) {
      const nb=applyMove(board,m);
      best=Math.max(best, alphabeta(nb,depth-1,alpha,beta,false,updateCR(cr,m,board),epTarget(m)));
      alpha=Math.max(alpha,best); if (beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for (const m of moves) {
      const nb=applyMove(board,m);
      best=Math.min(best, alphabeta(nb,depth-1,alpha,beta,true,updateCR(cr,m,board),epTarget(m)));
      beta=Math.min(beta,best); if (beta<=alpha) break;
    }
    return best;
  }
}

function getAIMove(board, depth, cr, ep) {
  const moves = getLegal(board, B, cr, ep);
  if (!moves.length) return null;
  if (depth===0) return moves[Math.floor(Math.random()*moves.length)];
  let best=-Infinity, bestMove=moves[0];
  for (const m of moves) {
    const s = alphabeta(applyMove(board,m), depth-1, -Infinity, Infinity, false, updateCR(cr,m,board), epTarget(m));
    if (s>best) { best=s; bestMove=m; }
  }
  return bestMove;
}

// ── Taunts ────────────────────────────────────────────────────────────────────

const CHECK_TAUNTS = ['check.', 'check. good luck.', 'king exposed.'];
const MOVE_TAUNTS  = ['interesting.', 'bold.', 'hm.', 'sure.'];

function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChessGame({ onComplete, difficulty = 'medium' }) {
  const cfg = CONFIGS[difficulty] ?? CONFIGS.medium;
  const initB = () => initialBoard(cfg.noQueenStart);
  const initCR = { wK:true, wQ:true, bK:true, bQ:true };

  const [board, setBoard]   = useState(initB);
  const [cr, setCR]         = useState(initCR);
  const [ep, setEP]         = useState(null);
  const [selected, setSel]  = useState(null);
  const [legal, setLegal]   = useState([]);
  const [turn, setTurn]     = useState(() => cfg.aiPreMoves>0 ? 'ai_pre' : 'player');
  const [status, setStatus] = useState('playing'); // 'playing'|'check'|'checkmate'|'stalemate'
  const [taunt, setTaunt]   = useState(() =>
    cfg.noQueenStart && cfg.aiPreMoves>0 ? 'no queen. and they move first.' :
    cfg.noQueenStart ? 'playing without your queen.' :
    cfg.aiPreMoves>0 ? 'opponent gets a head start...' : 'your move.');

  // Refs so async timeouts always read latest state
  const bRef  = useRef(board);
  const crRef = useRef(cr);
  const epRef = useRef(ep);

  function syncAll(nb, ncr, nep) {
    bRef.current=nb; crRef.current=ncr; epRef.current=nep;
    setBoard(nb); setCR(ncr); setEP(nep);
  }

  // ── AI pre-moves (medium difficulty) ────────────────────────────────────
  useEffect(() => {
    if (turn !== 'ai_pre') return;
    let cancelled = false;

    function doPreMove(count) {
      if (cancelled) return;
      setTimeout(() => {
        if (cancelled) return;
        const move = getAIMove(bRef.current, 1, crRef.current, epRef.current);
        if (!move) { if (!cancelled) { setTurn('player'); setTaunt('your move.'); } return; }
        const nb = applyMove(bRef.current, move);
        const ncr = updateCR(crRef.current, move, bRef.current);
        const nep = epTarget(move);
        syncAll(nb, ncr, nep);
        if (count+1 >= cfg.aiPreMoves) {
          if (!cancelled) { setTurn('player'); setTaunt('your move. good luck.'); }
        } else {
          doPreMove(count+1);
        }
      }, 700);
    }

    doPreMove(0);
    return () => { cancelled = true; };
  }, [turn]);

  // ── AI regular turn ──────────────────────────────────────────────────────
  useEffect(() => {
    if (turn !== 'ai') return;
    let cancelled = false;
    setTimeout(() => {
      if (cancelled) return;
      const move = getAIMove(bRef.current, cfg.aiDepth, crRef.current, epRef.current);
      if (!move) {
        setTurn('done'); setStatus('checkmate'); setTaunt('somehow you won. okay.');
        return;
      }
      const nb = applyMove(bRef.current, move);
      const ncr = updateCR(crRef.current, move, bRef.current);
      const nep = epTarget(move);
      syncAll(nb, ncr, nep);

      const playerMoves = getLegal(nb, W, ncr, nep);
      if (!playerMoves.length) {
        const mate = inCheck(nb, W);
        setTurn('done');
        setStatus(mate ? 'checkmate' : 'stalemate');
        setTaunt(mate ? 'checkmate. brutal.' : 'stalemate. not your best.');
        return;
      }
      if (inCheck(nb, W)) { setStatus('check'); setTaunt(pick(CHECK_TAUNTS)); }
      else { setStatus('playing'); setTaunt(pick(MOVE_TAUNTS)); }
      setTurn('player');
    }, 700);
    return () => { cancelled = true; };
  }, [turn]);

  // ── Player move ──────────────────────────────────────────────────────────
  function handlePress(r, c) {
    if (turn !== 'player') return;
    const p = board[r][c];

    if (selected) {
      const move = legal.find(m => m.to[0]===r && m.to[1]===c);
      if (move) {
        const nb = applyMove(board, move);
        const ncr = updateCR(cr, move, board);
        const nep = epTarget(move);
        syncAll(nb, ncr, nep);
        setSel(null); setLegal([]);

        const aiMoves = getLegal(nb, B, ncr, nep);
        if (!aiMoves.length) {
          const mate = inCheck(nb, B);
          setTurn('done');
          setStatus(mate ? 'checkmate' : 'stalemate');
          setTaunt(mate ? 'checkmate. you actually won.' : 'stalemate.');
          return;
        }
        setTaunt('thinking...'); setTurn('ai');
        return;
      }
    }

    if (p?.color===W) {
      setSel([r,c]);
      setLegal(getLegal(board, W, cr, ep).filter(m => m.from[0]===r && m.from[1]===c));
    } else {
      setSel(null); setLegal([]);
    }
  }

  const dests = new Set(legal.map(m => `${m.to[0]},${m.to[1]}`));
  const isDone = turn==='done';
  const playerWon = isDone && status==='checkmate' && inCheck(board, B);

  // Count material
  let wMat=0, bMat=0;
  board.forEach(row=>row.forEach(p=>{
    if (!p||p.type==='K') return;
    const v=PIECE_VAL[p.type]??0;
    if (p.color===W) wMat+=v; else bMat+=v;
  }));

  return (
    <View style={styles.container}>
      <AppText variant="subheading" style={styles.title}>♔ chess</AppText>

      {/* Material balance */}
      <View style={styles.countsRow}>
        <AppText variant="caption" style={{ color: colors.danger }}>AI: {bMat}pts</AppText>
        <AppText variant="caption" style={{ color: colors.textDisabled }}>
          {cfg.noQueenStart ? 'no queen mode' : cfg.aiPreMoves>0 ? 'head start mode' : ''}
        </AppText>
        <AppText variant="caption" style={{ color: colors.primary }}>you: {wMat}pts</AppText>
      </View>

      {/* Board */}
      <View style={styles.board}>
        {board.map((row, r) => (
          <View key={r} style={styles.boardRow}>
            {row.map((cell, c) => {
              const light = (r+c)%2===0;
              const isSel = selected && selected[0]===r && selected[1]===c;
              const isDest = dests.has(`${r},${c}`);
              const isCheckKing = cell?.type==='K' && cell?.color===W && status==='check';
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    { width:CELL, height:CELL },
                    light ? styles.lightSq : styles.darkSq,
                    isSel && styles.selSq,
                    isDest && styles.destSq,
                    isCheckKing && styles.checkSq,
                  ]}
                  onPress={() => handlePress(r, c)}
                  activeOpacity={0.8}
                >
                  {cell && (
                    <AppText style={[
                      styles.piece,
                      { fontSize: CELL*0.72 },
                      cell.color===W ? styles.wPiece : styles.bPiece,
                    ]}>
                      {SYMBOLS[cell.color][cell.type]}
                    </AppText>
                  )}
                  {isDest && !cell && (
                    <View style={[styles.moveDot, { width:CELL*0.28, height:CELL*0.28, borderRadius:CELL*0.14 }]} />
                  )}
                  {isDest && cell && (
                    <View style={[styles.capRing, { width:CELL-4, height:CELL-4, borderRadius:(CELL-4)/2 }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <AppText variant="caption" style={styles.taunt} numberOfLines={2}>
        {taunt}
      </AppText>

      <View style={styles.actions}>
        {!isDone && <Button label="give up" variant="ghost" onPress={onComplete} />}
        {isDone && (
          <Button
            label={playerWon ? 'escape' : 'just let me through'}
            variant={playerWon ? 'primary' : 'ghost'}
            onPress={onComplete}
          />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  title: { textAlign: 'center' },
  countsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  board: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  boardRow: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightSq: { backgroundColor: '#F0D9B5' },
  darkSq:  { backgroundColor: '#B58863' },
  selSq:   { backgroundColor: '#7FC97F' },
  destSq:  { backgroundColor: '#7FC97F55' },
  checkSq: { backgroundColor: '#FF5555' },
  piece: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
  wPiece: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bPiece: {
    color: '#1A1A1A',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  moveDot: {
    backgroundColor: 'rgba(50,180,50,0.65)',
    position: 'absolute',
  },
  capRing: {
    borderWidth: 3,
    borderColor: 'rgba(50,180,50,0.65)',
    position: 'absolute',
  },
  taunt: {
    textAlign: 'center',
    color: colors.textSub,
    minHeight: 36,
    marginTop: spacing.xs,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
