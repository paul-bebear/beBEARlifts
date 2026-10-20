import "mocha";
import { expect } from "chai";
import { MusicLog_empty, MusicLog_parse, MusicLog_putSession } from "../src/models/musicLog";

describe("MusicLog_parse", () => {
  it("keeps the saved playlist link of a session", () => {
    const playlistUrl = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";
    const log = MusicLog_putSession(MusicLog_empty(), { id: 1, startedAt: 0, plays: [], playlistUrl });
    const parsed = MusicLog_parse(JSON.parse(JSON.stringify(log)));
    expect(parsed.sessions[0].playlistUrl).to.equal(playlistUrl);
  });

  it("reads a session saved before playlist links existed", () => {
    const parsed = MusicLog_parse({ version: 1, sessions: [{ id: 1, startedAt: 0, plays: [] }] });
    expect(parsed.sessions[0]).to.deep.equal({ id: 1, startedAt: 0, plays: [] });
  });
});
