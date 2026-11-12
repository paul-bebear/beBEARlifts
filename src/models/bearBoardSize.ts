import { IBearBox } from "./bearScene";

export const BearBoardSize_maxLines = 9;
export const BearBoardSize_rowRatio = 1.45;
const padShare = 0.04;
const inkShare = 0.085;
const minSize = 8;

export interface IBearBoardSize {
  pad: number;
  width: number;
  height: number;
  lineSize: number;
}

function halfPointFloor(value: number): number {
  return Math.floor(value * 2) / 2;
}

// The cabin's whiteboard is blank all the way down, so all of the box takes ink.
export function BearBoardSize_layout(board: IBearBox): IBearBoardSize {
  const pad = board.width * padShare;
  const height = board.height - pad;
  const fitsAllRows = height / (BearBoardSize_maxLines * BearBoardSize_rowRatio);
  const lineSize = Math.max(minSize, halfPointFloor(Math.min(board.height * inkShare, fitsAllRows)));
  return { pad, width: board.width - 2 * pad, height, lineSize };
}
