import { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY = 0, P = 1, A = 2, PK = 3, AK = 4; // P=player, A=AI, K=king

// Difficulty: player starts with fewer pieces as it gets harder
const CONFIGS = {
  easy:   { playerPieces: 12, aiPieces: 12, aiKings: 0 },
  medium: { playerPieces: 10, aiPieces: 12, aiKings: 0 },
  hard:   { playerPieces: 8,  aiPieces: 12, aiKings: 3 },
};

const CELL = Math.floor((Dimensions.get('window').width - 32) / 8);

// ── Board helpers ─────────────────────────────────────────────────────────────

function isDark(r, c) { return (r + c) % 2 === 1; }
function isP(v) { return v === P || v === PK; }
function isA(v) { return v === A || v === AK; }

function initBoard({ playerPieces, aiPieces, aiKings = 0 }) {
  const b = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
  // AI fills from row 0 down on dark squares; track positions to crown last N
  const aiPositions = [];
  for (let r = 0; r < 3 && aiPositions.length < aiPieces; r++)
    for (let c = 0; c < 8 && aiPositions.length < aiPieces; c++)
      if (isDark(r, c)) { b[r][c] = A; aiPositions.push([r, c]); }
  // Crown the last aiKings AI pieces placed (they end up deepest on the board)
  for (let i = aiPositions.length - aiKings; i < aiPositions.length; i++) {
    const [r, c] = aiPositions[i];
    b[r][c] = AK;
  }
  // Player fills from row 7 up on dark squares
  let n = 0;
  for (let r = 7; r >= 5 && n < playerPieces; r--)
    for (let c = 0; c < 8 && n < playerPieces; c++)
      if (isDark(r, c)) { b[r][c] = P; n++; }
  return b;
}

function pieceDirs(piece) {
  if (piece === PK || piece === AK) return [[-1,-1],[-1,1],[1,-1],[1,1]];
  if (piece === P)  return [[-1,-1],[-1,1]]; // player moves up
  return [[1,-1],[1,1]];                      // AI moves down
}

function getCaptures(board, r, c) {
  const piece = board[r][c];
  const enemy = isP(piece) ? isA : isP;
  const result = [];
  for (const [dr, dc] of pieceDirs(piece)) {
    const mr = r+dr, mc = c+dc, jr = r+2*dr, jc = c+2*dc;
    if (mr>=0&&mr<8&&mc>=0&&mc<8&&jr>=0&&jr<8&&jc>=0&&jc<8
        && enemy(board[mr][mc]) && board[jr][jc]===EMPTY) {
      result.push({ from:[r,c], to:[jr,jc], over:[mr,mc] });
    }
  }
  return result;
}

function getRegMoves(board, r, c) {
  const piece = board[r][c];
  const result = [];
  for (const [dr, dc] of pieceDirs(piece)) {
    const nr = r+dr, nc = c+dc;
    if (nr>=0&&nr<8&&nc>=0&&nc<8 && board[nr][nc]===EMPTY)
      result.push({ from:[r,c], to:[nr,nc] });
  }
  return result;
}

// Returns captures if any exist (mandatory), else regular moves
function getAllMoves(board, forAI) {
  const mine = forAI ? isA : isP;
  const caps = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (mine(board[r][c])) caps.push(...getCaptures(board, r, c));
  if (caps.length) return caps;
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (mine(board[r][c])) moves.push(...getRegMoves(board, r, c));
  return moves;
}

function applyMove(board, move) {
  const b = board.map(r => [...r]);
  const [fr, fc] = move.from, [tr, tc] = move.to;
  b[tr][tc] = b[fr][fc];
  b[fr][fc] = EMPTY;
  if (move.over) { const [or, oc] = move.over; b[or][oc] = EMPTY; }
  if (b[tr][tc] === P && tr === 0) b[tr][tc] = PK;
  if (b[tr][tc] === A && tr === 7) b[tr][tc] = AK;
  return b;
}

// ── AI (minimax depth 4 with alpha-beta) ──────────────────────────────────────

function evalBoard(board) {
  let s = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const v = board[r][c];
      if (v === A) s += 1; else if (v === AK) s += 1.6;
      else if (v === P) s -= 1; else if (v === PK) s -= 1.6;
    }
  return s;
}

function minimax(board, depth, isMax, alpha, beta) {
  const moves = getAllMoves(board, isMax);
  if (depth === 0 || moves.length === 0) return evalBoard(board);
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) {
      best = Math.max(best, minimax(applyMove(board, m), depth-1, false, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      best = Math.min(best, minimax(applyMove(board, m), depth-1, true, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestAIMove(board) {
  const moves = getAllMoves(board, true);
  if (!moves.length) return null;
  let best = -Infinity, bestMove = moves[0];
  for (const m of moves) {
    const s = minimax(applyMove(board, m), 3, false, -Infinity, Infinity);
    if (s > best) { best = s; bestMove = m; }
  }
  return bestMove;
}

// ── Taunts ────────────────────────────────────────────────────────────────────

const AI_TAUNTS = ['taken.', 'that piece is mine now.', 'classic.', 'i saw that coming.', 'outplayed.'];
const WIN_TAUNTS = ['all gone.', 'board cleared. brutal.', 'no more pieces. sorry.'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckersGame({ onComplete, difficulty = 'medium' }) {
  const cfg = CONFIGS[difficulty] ?? CONFIGS.medium;
  const [board, setBoard] = useState(() => initBoard(cfg));
  const boardRef = useRef(null);
  const [selected, setSelected] = useState(null);      // [r,c] | null
  const [forceFrom, setForceFrom] = useState(null);    // [r,c] — mid-multiCapture
  const [turn, setTurn] = useState('player');           // 'player' | 'ai' | 'done'
  const [taunt, setTaunt] = useState('your move.');

  // Keep boardRef in sync
  function updateBoard(b) { boardRef.current = b; setBoard(b); }

  // ── Valid destinations for selected piece ─────────────────────────────────
  const validDests = (() => {
    if (!selected || turn !== 'player') return new Set();
    const [sr, sc] = selected;
    if (!isP(board[sr]?.[sc])) return new Set();
    const hasCaps = getAllMoves(board, false).some(m => m.over);
    const pieceMoves = hasCaps ? getCaptures(board, sr, sc) : getRegMoves(board, sr, sc);
    if (forceFrom && !(forceFrom[0]===sr && forceFrom[1]===sc)) return new Set();
    return new Set(pieceMoves.map(m => `${m.to[0]},${m.to[1]}`));
  })();

  // ── Execute a player move ────────────────────────────────────────────────
  function executePlayerMove(move) {
    const nb = applyMove(board, move);
    const [tr, tc] = move.to;

    // Multi-capture: if capture and more captures available, stay on same piece
    if (move.over) {
      const moreCaps = getCaptures(nb, tr, tc);
      if (moreCaps.length > 0) {
        updateBoard(nb);
        setSelected([tr, tc]);
        setForceFrom([tr, tc]);
        return;
      }
    }

    setSelected(null);
    setForceFrom(null);

    // Check win: AI has no pieces or no moves
    const aiCount = nb.flat().filter(isA).length;
    if (aiCount === 0 || getAllMoves(nb, true).length === 0) {
      updateBoard(nb);
      setTurn('done');
      setTaunt('board cleared. you can leave.');
      return;
    }

    // AI turn
    updateBoard(nb);
    setTurn('ai');
    setTaunt('thinking...');
    setTimeout(() => {
      const b = boardRef.current ?? nb;
      let cur = b;
      let aiMove = getBestAIMove(cur);
      if (!aiMove) {
        setTurn('done');
        setTaunt('ai has no moves. somehow you win.');
        return;
      }
      // Execute AI move(s) including multi-capture chain
      cur = applyMove(cur, aiMove);
      let lastMove = aiMove;
      while (lastMove.over) {
        const more = getCaptures(cur, lastMove.to[0], lastMove.to[1]);
        if (!more.length) break;
        lastMove = more[0];
        cur = applyMove(cur, lastMove);
      }

      const playerCount = cur.flat().filter(isP).length;
      const playerMoves = getAllMoves(cur, false);
      updateBoard(cur);

      if (playerCount === 0 || playerMoves.length === 0) {
        setTurn('done');
        setTaunt(pick(WIN_TAUNTS));
      } else {
        setTaunt(lastMove.over ? pick(AI_TAUNTS) : 'your move.');
        setTurn('player');
      }
    }, 600);
  }

  // ── Cell tap ─────────────────────────────────────────────────────────────
  function handleCellPress(r, c) {
    if (turn !== 'player') return;

    // If mid-multiCapture, force the piece
    if (forceFrom) {
      if (selected && selected[0]===forceFrom[0] && selected[1]===forceFrom[1]) {
        const caps = getCaptures(board, forceFrom[0], forceFrom[1]);
        const move = caps.find(m => m.to[0]===r && m.to[1]===c);
        if (move) { executePlayerMove(move); return; }
      }
      setSelected([...forceFrom]);
      return;
    }

    // If piece selected, try to move to tapped square
    if (selected) {
      const [sr, sc] = selected;
      const hasCaps = getAllMoves(board, false).some(m => m.over);
      const pieceMoves = hasCaps ? getCaptures(board, sr, sc) : getRegMoves(board, sr, sc);
      const move = pieceMoves.find(m => m.to[0]===r && m.to[1]===c);
      if (move) { executePlayerMove(move); return; }
    }

    // Select a player piece
    if (isP(board[r][c])) { setSelected([r, c]); return; }

    // Tap empty/AI piece with nothing selected — deselect
    setSelected(null);
  }

  const pCount = board.flat().filter(isP).length;
  const aCount = board.flat().filter(isA).length;
  const isDone = turn === 'done';
  const playerWon = isDone && aCount === 0;

  return (
    <View style={styles.container}>
      <AppText variant="subheading" style={styles.title}>🏁 checkers</AppText>

      <View style={styles.countsRow}>
        <AppText variant="caption" style={{ color: colors.danger }}>AI: {aCount}</AppText>
        <AppText variant="caption" style={{ color: colors.textDisabled }}>
          {difficulty === 'easy' ? '12v12' : difficulty === 'medium' ? '10v12' : '8v12 · 3 kings'}
        </AppText>
        <AppText variant="caption" style={{ color: '#4A8A4A' }}>you: {pCount}</AppText>
      </View>

      {/* Board */}
      <View style={styles.board}>
        {board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const dark = isDark(r, c);
              const isSel = selected && selected[0]===r && selected[1]===c;
              const isDest = validDests.has(`${r},${c}`);
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cell,
                    { width: CELL, height: CELL },
                    dark ? styles.darkCell : styles.lightCell,
                    isSel && styles.selectedCell,
                    isDest && styles.destCell,
                  ]}
                  onPress={() => handleCellPress(r, c)}
                  activeOpacity={0.75}
                >
                  {cell !== EMPTY && (
                    <View style={[
                      styles.piece,
                      { width: CELL*0.68, height: CELL*0.68, borderRadius: CELL*0.34 },
                      isP(cell) ? styles.playerPiece : styles.aiPiece,
                      (cell===PK||cell===AK) && styles.king,
                    ]}>
                      {(cell===PK||cell===AK) &&
                        <AppText style={styles.crownText}>♛</AppText>}
                    </View>
                  )}
                  {isDest && cell===EMPTY && (
                    <View style={[styles.dot, { width: CELL*0.28, height: CELL*0.28, borderRadius: CELL*0.14 }]} />
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
        {!isDone && (
          <Button label="give up" variant="ghost" onPress={onComplete} />
        )}
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
  row: { flexDirection: 'row' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightCell: { backgroundColor: '#C8A98A' },
  darkCell:  { backgroundColor: '#3D2B1F' },
  selectedCell: { backgroundColor: '#5A8A4A' },
  destCell:  { backgroundColor: '#4A7A3A' },
  piece: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  playerPiece: {
    backgroundColor: '#4A8A4A',
    borderColor: '#7DC87D',
  },
  aiPiece: {
    backgroundColor: colors.danger,
    borderColor: '#FF8080',
  },
  king: {
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  crownText: {
    fontSize: 11,
    color: '#FFD700',
  },
  dot: {
    backgroundColor: 'rgba(90,180,90,0.7)',
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
