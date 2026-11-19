import "mocha";
import { expect } from "chai";
import {
  PullToRefresh_end,
  PullToRefresh_idle,
  PullToRefresh_isReady,
  PullToRefresh_move,
  PullToRefresh_start,
  PullToRefresh_threshold,
} from "../src/models/pullToRefresh";

describe("PullToRefresh", () => {
  it("refreshes after a long enough pull that starts at the top", () => {
    let state = PullToRefresh_start(0, 100);
    state = PullToRefresh_move(state, 100 + PullToRefresh_threshold);
    expect(PullToRefresh_end(state).refresh).to.equal(true);
    expect(PullToRefresh_end(PullToRefresh_move(PullToRefresh_start(0, 100), 130)).refresh).to.equal(false);
  });

  it("ignores a pull that starts below the top or moves up", () => {
    expect(PullToRefresh_end(PullToRefresh_move(PullToRefresh_start(40, 100), 400)).refresh).to.equal(false);
    expect(PullToRefresh_move(PullToRefresh_start(0, 300), 100).distance).to.equal(0);
  });

  it("clears the pull after it ends", () => {
    const state = PullToRefresh_move(PullToRefresh_start(0, 100), 100 + PullToRefresh_threshold);
    expect(PullToRefresh_isReady(state)).to.equal(true);
    expect(PullToRefresh_end(state).state).to.deep.equal(PullToRefresh_idle());
  });

  it("ignores moves when no pull started", () => {
    expect(PullToRefresh_move(PullToRefresh_idle(), 500)).to.deep.equal(PullToRefresh_idle());
  });
});
