import { BearScene_boardInkBottom, BearScene_dashboardRect, IBearBox } from "./bearScene";

export const BearBoardSize_maxLines = 8;
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

export function BearBoardSize_layout(board: IBearBox): IBearBoardSize {
  const pad = board.width * padShare;
  const [, boardTop, , boardBottom] = BearScene_dashboardRect;
  const inkHeight = board.height * ((BearScene_boardInkBottom - boardTop) / (boardBottom - boardTop));
  const height = inkHeight - pad;
  const fitsEightRows = height / (BearBoardSize_maxLines * BearBoardSize_rowRatio);
  const lineSize = Math.max(minSize, halfPointFloor(Math.min(inkHeight * inkShare, fitsEightRows)));
  return { pad, width: board.width - 2 * pad, height, lineSize };
}
