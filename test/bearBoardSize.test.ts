import "mocha";
import { expect } from "chai";
import { BearArt_sprite } from "../src/models/bearArt";
import { BearBoardSize_layout, BearBoardSize_maxLines, BearBoardSize_rowRatio } from "../src/models/bearBoardSize";
import { BearScene_gymArt, BearScene_layout } from "../src/models/bearScene";

function boardAt(width: number): ReturnType<typeof BearBoardSize_layout> {
  const sprite = BearArt_sprite("female", "brown", 1, "normal");
  return BearBoardSize_layout(BearScene_layout(width, BearScene_gymArt, 1, 0, sprite).board);
}

describe("BearBoardSize_layout", () => {
  [375, 393, 440].forEach((width) => {
    it(`fits eight rows inside the ink area at ${width} pt`, () => {
      const size = boardAt(width);
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
