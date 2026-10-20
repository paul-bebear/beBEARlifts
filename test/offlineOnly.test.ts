import "mocha";
import { expect } from "chai";
import { OfflineOnly_isRequestAllowed } from "../src/utils/offlineOnly";

const origin = "https://bebearlifts.vercel.app";

describe("OfflineOnly_isRequestAllowed", () => {
  it("allows same-origin absolute and relative URLs", () => {
    expect(OfflineOnly_isRequestAllowed(`${origin}/programdata/index.json?v=1`, origin)).to.equal(true);
    expect(OfflineOnly_isRequestAllowed("/externalimages/exercises/a.png", origin)).to.equal(true);
  });

  it("blocks the upstream API, analytics and error reporting hosts", () => {
    expect(OfflineOnly_isRequestAllowed("https://api3.liftosaur.com/api/event", origin)).to.equal(false);
    expect(OfflineOnly_isRequestAllowed("https://www.liftosaur.com/programdata/index.json", origin)).to.equal(false);
    expect(OfflineOnly_isRequestAllowed("https://api.rollbar.com/api/1/item/", origin)).to.equal(false);
    expect(OfflineOnly_isRequestAllowed("https://api.offline.invalid/api/log", origin)).to.equal(false);
  });

  it("blocks a different port or scheme on the same host", () => {
    expect(OfflineOnly_isRequestAllowed("http://bebearlifts.vercel.app/app", origin)).to.equal(false);
    expect(OfflineOnly_isRequestAllowed("https://bebearlifts.vercel.app:8443/app", origin)).to.equal(false);
  });

  it("allows the Spotify API and login hosts and nothing else on spotify.com", () => {
    expect(OfflineOnly_isRequestAllowed("https://api.spotify.com/v1/me/player/currently-playing", origin)).to.equal(
      true
    );
    expect(OfflineOnly_isRequestAllowed("https://accounts.spotify.com/api/token", origin)).to.equal(true);
    expect(OfflineOnly_isRequestAllowed("https://open.spotify.com/track/1", origin)).to.equal(false);
    expect(OfflineOnly_isRequestAllowed("http://api.spotify.com/v1/me", origin)).to.equal(false);
  });

  it("allows this app's Supabase project and no other Supabase project", () => {
    expect(
      OfflineOnly_isRequestAllowed("https://qvqwvuuwfueccrmzwyct.supabase.co/rest/v1/posts?select=*", origin)
    ).to.equal(true);
    expect(OfflineOnly_isRequestAllowed("https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/token", origin)).to.equal(
      true
    );
    expect(OfflineOnly_isRequestAllowed("https://abcdefghijklmnopqrst.supabase.co/rest/v1/posts", origin)).to.equal(
      false
    );
    expect(OfflineOnly_isRequestAllowed("http://qvqwvuuwfueccrmzwyct.supabase.co/rest/v1/posts", origin)).to.equal(
      false
    );
  });

  it("allows data and blob URLs used for in-memory files", () => {
    expect(OfflineOnly_isRequestAllowed("data:text/plain,hello", origin)).to.equal(true);
    expect(OfflineOnly_isRequestAllowed(`blob:${origin}/2b6e0c8a`, origin)).to.equal(true);
  });
});
