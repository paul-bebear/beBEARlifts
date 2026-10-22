import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { IMusicPollEffects, MusicPoll_catchUp, MusicPoll_nowPlaying } from "../src/models/musicPoll";
import { IMusicLog, MusicLog_empty, MusicLog_session } from "../src/models/musicLog";
import { ISpotifyTrack } from "../src/models/spotifyTracks";

const workout = { id: 1000, startTime: 1000 };
const track: ISpotifyTrack = {
  id: "t1",
  uri: "spotify:track:t1",
  name: "Eye of the Tiger",
  artists: "Survivor",
  durationMs: 240000,
};

function fakes(overrides: Partial<IMusicPollEffects> = {}): IMusicPollEffects & { log: () => IMusicLog } {
  let log = MusicLog_empty();
  return {
    isVisible: () => true,
    hasTokens: sinon.stub().resolves(true),
    nowPlaying: sinon.stub().resolves({ track, progressMs: 5000, isPlaying: true }),
    history: sinon.stub().resolves([{ track, startedAt: 2000, endedAt: 242000 }]),
    update: sinon.spy(async (fn: (l: IMusicLog) => IMusicLog) => {
      log = fn(log);
    }),
    isStopped: () => false,
    now: () => 60000,
    warn: sinon.spy(),
    log: () => log,
    ...overrides,
  };
}

describe("MusicPoll_nowPlaying", () => {
  it("records the playing song in the workout's session", async () => {
    const effects = fakes();
    await MusicPoll_nowPlaying(workout, effects);
    expect(MusicLog_session(effects.log(), workout.id)?.current?.track.id).to.equal("t1");
  });

  it("does not read the tokens or call Spotify while the app is hidden", async () => {
    const effects = fakes({ isVisible: () => false });
    await MusicPoll_nowPlaying(workout, effects);
    sinon.assert.notCalled(effects.hasTokens as sinon.SinonStub);
    sinon.assert.notCalled(effects.nowPlaying as sinon.SinonStub);
  });

  it("does not call Spotify without tokens", async () => {
    const effects = fakes({ hasTokens: sinon.stub().resolves(false) });
    await MusicPoll_nowPlaying(workout, effects);
    sinon.assert.notCalled(effects.nowPlaying as sinon.SinonStub);
  });

  it("writes nothing when the tracker stopped while Spotify answered", async () => {
    const effects = fakes({ isStopped: () => true });
    await MusicPoll_nowPlaying(workout, effects);
    sinon.assert.notCalled(effects.update as sinon.SinonSpy);
  });

  it("warns instead of throwing when Spotify fails", async () => {
    const effects = fakes({ nowPlaying: sinon.stub().rejects(new Error("offline")) });
    await MusicPoll_nowPlaying(workout, effects);
    sinon.assert.calledOnceWithExactly(
      effects.warn as sinon.SinonSpy,
      "Spotify poll failed",
      sinon.match.instanceOf(Error)
    );
  });
});

describe("MusicPoll_catchUp", () => {
  it("merges the history first and then polls the playing song", async () => {
    const effects = fakes();
    await MusicPoll_catchUp(workout, effects);
    sinon.assert.callOrder(effects.history as sinon.SinonStub, effects.nowPlaying as sinon.SinonStub);
    expect((effects.update as sinon.SinonSpy).callCount).to.equal(2);
  });

  it("still polls the playing song when the history fails", async () => {
    const effects = fakes({ history: sinon.stub().rejects(new Error("429")) });
    await MusicPoll_catchUp(workout, effects);
    sinon.assert.calledOnceWithExactly(
      effects.warn as sinon.SinonSpy,
      "Spotify history failed",
      sinon.match.instanceOf(Error)
    );
    sinon.assert.calledOnce(effects.nowPlaying as sinon.SinonStub);
  });

  it("does nothing while the app is hidden", async () => {
    const effects = fakes({ isVisible: () => false });
    await MusicPoll_catchUp(workout, effects);
    sinon.assert.notCalled(effects.history as sinon.SinonStub);
    sinon.assert.notCalled(effects.nowPlaying as sinon.SinonStub);
  });
});
