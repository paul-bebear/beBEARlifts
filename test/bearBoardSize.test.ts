import "mocha";
import { expect } from "chai";
import { BearBoardSize_layout, BearBoardSize_maxLines, BearBoardSize_rowRatio } from "../src/models/bearBoardSize";
import { BearHouse_art } from "../src/models/bearHouse";
import { BearScene_layout } from "../src/models/bearScene";

function boardAt(width: number): ReturnType<typeof BearBoardSize_layout> {
  return BearBoardSize_layout(BearScene_layout(width, BearHouse_art).board);
}

describe("BearBoardSize_layout", () => {
  it("counts the whole cabin whiteboard as ink, so its ink ends at the board's bottom edge", () => {
    const [, top, , bottom] = BearHouse_art.board;
    expect(BearHouse_art.inkBottom).to.equal(bottom);
    const scene = BearScene_layout(1024, BearHouse_art);
    const size = boardAt(1024);
    expect(size.pad + size.height).to.be.closeTo(bottom - top, 1e-9);
    expect(scene.board.height).to.equal(bottom - top);
  });

  [375, 393, 440].forEach((width) => {
    it(`fits nine rows inside the board at ${width} pt`, () => {
      const size = boardAt(width);
      expect(BearBoardSize_maxLines).to.equal(9);
      expect(size.lineSize * BearBoardSize_rowRatio * BearBoardSize_maxLines).to.be.at.most(size.height);
    });
  });

  it("gives the sizes the 393 pt phone needs", () => {
    expect(boardAt(375).lineSize).to.equal(11.5);
    expect(boardAt(393).lineSize).to.equal(12);
    expect(boardAt(440).lineSize).to.equal(13.5);
  });

  it("lets the text go below 11 pt on a small board instead of overflowing", () => {
    const size = BearBoardSize_layout({ left: 0, top: 0, width: 200, height: 137 });
    expect(size.lineSize).to.be.below(11);
    expect(size.lineSize * BearBoardSize_rowRatio * BearBoardSize_maxLines).to.be.at.most(size.height);
  });
});
