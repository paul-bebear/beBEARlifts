import "mocha";
import { expect } from "chai";
import {
  CubNumber_empty,
  CubNumber_fromRows,
  CubNumber_label,
  CubNumber_mine,
  CubNumber_needsFetch,
  CubNumber_parse,
  CubNumber_plate,
  CubNumber_shareText,
  ICubState,
} from "../src/models/cubNumber";

const now = new Date(2026, 9, 28, 12).getTime();
const hourMs = 3600000;
const me = { userId: "u1" };
const numbered: ICubState = { version: 1, userId: "u1", number: 412, fetchedAt: now };

describe("CubNumber", () => {
  it("labels a number, also the owner's 0", () => {
    expect(CubNumber_label(412)).to.equal("Cub 412");
    expect(CubNumber_label(0)).to.equal("Cub 0");
  });

  it("parses a stored state and drops a broken one to empty", () => {
    expect(CubNumber_parse(JSON.parse(JSON.stringify(numbered)))).to.deep.equal(numbered);
    expect(CubNumber_parse(undefined)).to.deep.equal(CubNumber_empty());
    expect(CubNumber_parse({ number: 3 })).to.deep.equal(CubNumber_empty());
    expect(CubNumber_parse({ userId: "u1", number: -1, fetchedAt: "x" })).to.deep.equal({
      version: 1,
      userId: "u1",
      number: undefined,
      fetchedAt: undefined,
    });
    expect(CubNumber_parse({ userId: "u1", number: 1.5 }).number).to.equal(undefined);
  });

  it("shows the number on the plate only for the user it was fetched for", () => {
    expect(CubNumber_plate(numbered, me)).to.equal("412");
    expect(CubNumber_plate({ ...numbered, number: 0 }, me)).to.equal("0");
    expect(CubNumber_plate(numbered, { userId: "u2" })).to.equal("?");
    expect(CubNumber_plate(numbered, undefined)).to.equal("?");
    expect(CubNumber_plate(CubNumber_empty(), me)).to.equal("?");
    expect(CubNumber_mine(numbered, { userId: "u2" })).to.equal(undefined);
  });

  it("fetches for a new user, a missing number and a number older than 24 hours", () => {
    expect(CubNumber_needsFetch(numbered, undefined, now)).to.equal(false);
    expect(CubNumber_needsFetch(numbered, me, now + 23 * hourMs)).to.equal(false);
    expect(CubNumber_needsFetch(numbered, me, now + 25 * hourMs)).to.equal(true);
    expect(CubNumber_needsFetch(numbered, { userId: "u2" }, now)).to.equal(true);
    expect(CubNumber_needsFetch({ version: 1, userId: "u1" }, me, now)).to.equal(true);
    expect(CubNumber_needsFetch(CubNumber_empty(), me, now)).to.equal(true);
  });

  it("reads the user's own row from an answer that also holds friends' rows", () => {
    const rows = [
      { user_id: "u9", number: 7 },
      { user_id: "u1", number: 412 },
    ];
    expect(CubNumber_fromRows(rows, "u1", now)).to.deep.equal(numbered);
    expect(CubNumber_fromRows([{ user_id: "u1", number: 0 }], "u1", now).number).to.equal(0);
  });

  it("keeps no number and no fetch time when the answer has no row for the user", () => {
    const missing = { version: 1, userId: "u1" };
    expect(CubNumber_fromRows([], "u1", now)).to.deep.equal(missing);
    expect(CubNumber_fromRows([{ user_id: "u9", number: 7 }], "u1", now)).to.deep.equal(missing);
    expect(CubNumber_fromRows({ message: "error" }, "u1", now)).to.deep.equal(missing);
    expect(CubNumber_fromRows([{ user_id: "u1", number: "412" }], "u1", now)).to.deep.equal(missing);
    expect(CubNumber_needsFetch(CubNumber_fromRows([], "u1", now), me, now)).to.equal(true);
  });

  it("writes the share card text with the handle when there is one", () => {
    expect(CubNumber_shareText(412, "paul")).to.deep.equal({ title: "I'm Cub 412 on beBEAR", handle: "@paul" });
    expect(CubNumber_shareText(0, undefined)).to.deep.equal({ title: "I'm Cub 0 on beBEAR", handle: undefined });
  });
});
