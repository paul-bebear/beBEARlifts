import { IBearBoardLine } from "./bearBoard";
import { IBearBox } from "./bearScene";

export const BearBoardSize_rowRatio = 1.45;
// Measured on the owner's iPhone screenshot at 2.147 px per point: 30 characters took 425 px at 13.5 pt.
export const BearBoardSize_charWidth = 0.49;
export const BearBoardSize_checkboxWidth = 2.2;
export const BearBoardSize_columnGap = 1;
const padShare = 0.04;
const inkShare = 0.085;
const minSize = 8;

export interface IBearBoardColumn {
  x: number;
  width: number;
}

export interface IBearBoardColumns {
  left: IBearBoardLine[];
  right: IBearBoardLine[];
}

export interface IBearBoardSize {
  pad: number;
  width: number;
  height: number;
  lineSize: number;
  left: IBearBoardColumn;
  right: IBearBoardColumn;
}

function halfPointFloor(value: number): number {
  return Math.floor(value * 2) / 2;
}

export function BearBoardSize_columns(lines: readonly IBearBoardLine[]): IBearBoardColumns {
  return {
    left: lines.filter((line) => line.target === "plus"),
    right: lines.filter((line) => line.target !== "plus"),
  };
}

export function BearBoardSize_lineEm(line: IBearBoardLine): number {
  const box = line.target === "plus" ? BearBoardSize_checkboxWidth : 0;
  return line.text.length * BearBoardSize_charWidth + box;
}

function columnEm(lines: readonly IBearBoardLine[]): number {
  return lines.reduce((widest, line) => Math.max(widest, BearBoardSize_lineEm(line)), 0);
}

export function BearBoardSize_layout(board: IBearBox, lines: readonly IBearBoardLine[]): IBearBoardSize {
  const pad = board.width * padShare;
  const width = board.width - 2 * pad;
  const height = board.height - 2 * pad;
  const columns = BearBoardSize_columns(lines);
  const leftEm = columnEm(columns.left);
  const rightEm = columnEm(columns.right);
  const gapEm = leftEm > 0 && rightEm > 0 ? BearBoardSize_columnGap : 0;
  const rows = Math.max(columns.left.length, columns.right.length, 1);
  const heightLimit = height / (rows * BearBoardSize_rowRatio);
  const widthLimit = width / Math.max(leftEm + gapEm + rightEm, 1);
  const lineSize = Math.max(minSize, halfPointFloor(Math.min(board.height * inkShare, heightLimit, widthLimit)));
  return {
    pad,
    width,
    height,
    lineSize,
    left: { x: 0, width: leftEm * lineSize },
    right: { x: (leftEm + gapEm) * lineSize, width: rightEm * lineSize },
  };
}
