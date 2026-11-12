import "mocha";
import { expect } from "chai";
import { IBearBoardLine } from "../src/models/bearBoard";
import {
  BearBoardSize_checkboxWidth,
  BearBoardSize_charWidth,
  BearBoardSize_columnGap,
  BearBoardSize_columns,
  BearBoardSize_layout,
  BearBoardSize_lineEm,
  BearBoardSize_rowRatio,
} from "../src/models/bearBoardSize";
import { BearHouse_art } from "../src/models/bearHouse";
import { BearScene_layout } from "../src/models/bearScene";

function line(id: IBearBoardLine["id"], text: string, target: IBearBoardLine["target"]): IBearBoardLine {
  return { id, text, isDone: false, target };
}

const todo: IBearBoardLine[] = [
  line("train", "Train · Push", "plus"),
  line("food", "Eat · 0 of 2,800 kcal", "plus"),
  line("weighIn", "Weigh-in · Wednesday", "plus"),
];
const withGoal: IBearBoardLine[] = [
  ...todo,
  line("streak", "Streak · 0 days", "streak"),
  line("goal", "Goal: build muscle", "goal"),
  line("goalSince", "Since Oct 21 · 73 kg", "goal"),
  line("weight", "74.1 kg · +1.1 in 30 d", "bear"),
  line("level", "Level 4 · 34,173 kg to go", "bear"),
  line("lifted", "Lifted 45,827 kg", "bear"),
];
const withoutGoal: IBearBoardLine[] = [
  ...todo,
  line("streak", "Streak · 0 days", "streak"),
  line("goal", "Goal: tap to set one", "goal"),
  line("weight", "Weight · not logged yet", "bear"),
  line("level", "Level 1 · 2,000 kg to go", "bear"),
  line("lifted", "Lifted 0 kg", "bear"),
];

function boardAt(width: number): ReturnType<typeof BearScene_layout>["board"] {
  return BearScene_layout(width, BearHouse_art).board;
}

describe("BearBoardSize_columns", () => {
  it("puts the checkbox lines on the left and the rest on the right, in order", () => {
    const columns = BearBoardSize_columns(withGoal);
    expect(columns.left.map((l) => l.id)).to.deep.equal(["train", "food", "weighIn"]);
    expect(columns.right.map((l) => l.id)).to.deep.equal(["streak", "goal", "goalSince", "weight", "level", "lifted"]);
  });

  it("gives the right column four lines when no goal is set", () => {
    expect(BearBoardSize_columns(withoutGoal).right.map((l) => l.id)).to.deep.equal([
      "streak",
      "goal",
      "weight",
      "level",
      "lifted",
    ]);
  });
});

describe("BearBoardSize_lineEm", () => {
  it("counts 0.49 em per character, and 2.2 em more for a checkbox line", () => {
    expect(BearBoardSize_lineEm(line("lifted", "x".repeat(30), "bear"))).to.be.closeTo(30 * 0.49, 1e-9);
    expect(BearBoardSize_lineEm(line("train", "x".repeat(30), "plus"))).to.be.closeTo(30 * 0.49 + 2.2, 1e-9);
    expect(BearBoardSize_charWidth).to.equal(0.49);
    expect(BearBoardSize_checkboxWidth).to.equal(2.2);
  });
});

describe("BearBoardSize_layout", () => {
  [375, 393, 440].forEach((width) => {
    it(`fits both columns and the gap inside the ink width at ${width} pt`, () => {
      const size = BearBoardSize_layout(boardAt(width), withGoal);
      expect(size.left.x).to.equal(0);
      expect(size.right.x).to.be.closeTo(size.left.width + BearBoardSize_columnGap * size.lineSize, 1e-9);
      expect(size.right.x + size.right.width).to.be.at.most(size.width);
    });

    it(`keeps the last row one pad above the bottom of the board at ${width} pt`, () => {
      const board = boardAt(width);
      for (const lines of [withGoal, withoutGoal]) {
        const size = BearBoardSize_layout(board, lines);
        const rows = Math.max(...Object.values(BearBoardSize_columns(lines)).map((l) => l.length));
        const lastRowBottom = size.pad + rows * size.lineSize * BearBoardSize_rowRatio;
        expect(lastRowBottom).to.be.at.most(board.height - size.pad);
      }
    });
  });

  it("sets the letter size by the width limit, and the sizes the three phones get", () => {
    expect(BearBoardSize_layout(boardAt(375), withGoal).lineSize).to.equal(12.5);
    expect(BearBoardSize_layout(boardAt(393), withGoal).lineSize).to.equal(13);
    expect(BearBoardSize_layout(boardAt(440), withGoal).lineSize).to.equal(14.5);
  });

  it("makes the letters at least 14.5 pt at 440 pt, up from 13.5 pt in one column", () => {
    expect(BearBoardSize_layout(boardAt(440), withGoal).lineSize).to.be.at.least(14.5);
    expect(BearBoardSize_layout(boardAt(440), withoutGoal).lineSize).to.be.at.least(14.5);
  });

  it("sizes each column to its longest line", () => {
    const size = BearBoardSize_layout(boardAt(440), withGoal);
    expect(size.left.width).to.be.closeTo(size.lineSize * ("Eat · 0 of 2,800 kcal".length * 0.49 + 2.2), 1e-9);
    expect(size.right.width).to.be.closeTo(size.lineSize * ("Level 4 · 34,173 kg to go".length * 0.49), 1e-9);
  });

  it("lets the text go below 11 pt on a small board instead of overflowing", () => {
    const small = { left: 0, top: 0, width: 260, height: 140 };
    const size = BearBoardSize_layout(small, withGoal);
    expect(size.lineSize).to.be.below(11);
    expect(size.right.x + size.right.width).to.be.at.most(size.width);
    expect(size.pad + 6 * size.lineSize * BearBoardSize_rowRatio).to.be.at.most(small.height - size.pad);
  });

  it("counts the whole cabin whiteboard as ink, so its ink ends at the board's bottom edge", () => {
    const [, top, , bottom] = BearHouse_art.board;
    expect(BearHouse_art.inkBottom).to.equal(bottom);
    const board = boardAt(1024);
    expect(board.height).to.equal(bottom - top);
    const size = BearBoardSize_layout(board, withGoal);
    expect(size.pad + size.height + size.pad).to.be.closeTo(board.height, 1e-9);
  });
});
