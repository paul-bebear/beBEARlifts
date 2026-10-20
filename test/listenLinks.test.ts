import "mocha";
import { expect } from "chai";
import { ListenLinks_normalize, ListenLinks_set } from "../src/models/listenLinks";

describe("ListenLinks", () => {
  it("keeps an https link as it is", () => {
    const url = "https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY?si=abc";
    expect(ListenLinks_normalize(`  ${url} `)).to.equal(url);
  });

  it("turns a spotify: URI into an open.spotify.com link", () => {
    expect(ListenLinks_normalize("spotify:show:5CfCWKI5pZ28U0uOzXkDHe")).to.equal(
      "https://open.spotify.com/show/5CfCWKI5pZ28U0uOzXkDHe"
    );
  });

  it("rejects text that is not a link, and plain http", () => {
    expect(ListenLinks_normalize("my cooldown playlist")).to.equal(undefined);
    expect(ListenLinks_normalize("http://example.com/x")).to.equal(undefined);
    expect(ListenLinks_normalize("spotify:user:abc")).to.equal(undefined);
  });

  it("sets and clears one kind without touching the others", () => {
    const links = ListenLinks_set({ mantra: "https://a" }, "cooldown", "https://b");
    expect(links).to.deep.equal({ mantra: "https://a", cooldown: "https://b" });
    expect(ListenLinks_set(links, "mantra", undefined)).to.deep.equal({ cooldown: "https://b" });
  });
});
