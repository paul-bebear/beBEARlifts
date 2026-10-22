import "mocha";
import { expect } from "chai";
import {
  INote,
  Notes_canEditCheckIn,
  Notes_checkIn,
  Notes_days,
  Notes_empty,
  Notes_firstLine,
  Notes_forDay,
  Notes_links,
  Notes_new,
  Notes_parse,
  Notes_preview,
  Notes_remove,
  Notes_save,
  Notes_scoresLine,
  Notes_toMarkdown,
  Notes_updateCheckIn,
} from "../src/models/notes";

function note(id: string, day: string, createdAt: number, title: string, body: string = ""): INote {
  return { ...Notes_new(id, day, createdAt), title, body };
}

describe("Notes", () => {
  it("parses a stored log and drops broken entries", () => {
    const log = Notes_parse({
      notes: [
        { id: "a", day: "2026-10-22", createdAt: 5, kind: "note", title: "Legs", body: "Heavy" },
        { id: "b", day: "2026-10-22", createdAt: 6, kind: "checkIn", energy: 4, soreness: 9, mood: 2, body: "ok" },
        { id: "", day: "2026-10-22", createdAt: 1 },
        { id: "c", day: "Oct 22", createdAt: 1 },
        { id: "d", day: "2026-10-22" },
      ],
    });
    expect(log.notes.map((n) => n.id)).to.eql(["a", "b"]);
    expect(log.notes[0].updatedAt).to.equal(5);
    expect(log.notes[1]).to.include({ kind: "checkIn", energy: 4, mood: 2 });
    expect(log.notes[1].soreness).to.equal(undefined);
  });

  it("returns an empty log for anything that is not a log", () => {
    expect(Notes_parse(undefined)).to.eql(Notes_empty());
    expect(Notes_parse("text")).to.eql(Notes_empty());
  });

  it("keeps scores only on a check-in", () => {
    const log = Notes_parse({ notes: [{ id: "a", day: "2026-10-22", createdAt: 1, kind: "note", energy: 3 }] });
    expect(log.notes[0].energy).to.equal(undefined);
  });

  it("lists a day's notes newest first, without the check-in", () => {
    let log = Notes_empty();
    log = Notes_save(log, note("a", "2026-10-22", 1, "First"), 1);
    log = Notes_save(log, note("b", "2026-10-22", 3, "Third"), 3);
    log = Notes_save(log, note("c", "2026-10-21", 2, "Other day"), 2);
    log = Notes_updateCheckIn(log, { day: "2026-10-22", newId: "k", now: 4, field: "mood", value: 5 });
    expect(Notes_forDay(log, "2026-10-22").map((n) => n.id)).to.eql(["b", "a"]);
    expect(Notes_days(log)).to.eql(["2026-10-21", "2026-10-22"]);
  });

  it("updates a note in place and stamps updatedAt", () => {
    let log = Notes_save(Notes_empty(), note("a", "2026-10-22", 1, "Draft"), 1);
    log = Notes_save(log, { ...log.notes[0], title: "Final" }, 9);
    expect(log.notes).to.have.length(1);
    expect(log.notes[0]).to.include({ title: "Final", createdAt: 1, updatedAt: 9 });
  });

  it("removes a note saved blank, and leaves the log alone when it was never stored", () => {
    let log = Notes_save(Notes_empty(), note("a", "2026-10-22", 1, "Draft"), 1);
    log = Notes_save(log, { ...log.notes[0], title: "  ", body: "\n" }, 2);
    expect(log.notes).to.eql([]);
    const empty = Notes_empty();
    expect(Notes_save(empty, Notes_new("x", "2026-10-22", 1), 1)).to.equal(empty);
  });

  it("deletes a note by id", () => {
    const log = Notes_save(Notes_empty(), note("a", "2026-10-22", 1, "Draft"), 1);
    expect(Notes_remove(log, "a").notes).to.eql([]);
  });

  it("keeps one check-in a day and toggles a score off when tapped twice", () => {
    let log = Notes_updateCheckIn(Notes_empty(), { day: "2026-10-22", newId: "k1", now: 1, field: "energy", value: 4 });
    log = Notes_updateCheckIn(log, { day: "2026-10-22", newId: "k2", now: 2, field: "mood", value: 2 });
    log = Notes_updateCheckIn(log, { day: "2026-10-22", newId: "k3", now: 3, reflection: "Slept badly" });
    expect(log.notes).to.have.length(1);
    expect(log.notes[0]).to.include({ id: "k1", kind: "checkIn", energy: 4, mood: 2, body: "Slept badly" });
    log = Notes_updateCheckIn(log, { day: "2026-10-22", newId: "k4", now: 4, field: "energy", value: 4 });
    expect(Notes_checkIn(log, "2026-10-22")?.energy).to.equal(undefined);
  });

  it("drops the check-in once every score and the reflection are cleared", () => {
    let log = Notes_updateCheckIn(Notes_empty(), { day: "2026-10-22", newId: "k", now: 1, field: "energy", value: 4 });
    log = Notes_updateCheckIn(log, { day: "2026-10-22", newId: "k", now: 2, field: "energy", value: 4 });
    expect(log.notes).to.eql([]);
  });

  it("lets only today's check-in change", () => {
    expect(Notes_canEditCheckIn("2026-10-22", "2026-10-22")).to.equal(true);
    expect(Notes_canEditCheckIn("2026-10-21", "2026-10-22")).to.equal(false);
  });

  it("shows the title, else the first body line without Markdown marks", () => {
    expect(Notes_firstLine(note("a", "2026-10-22", 1, " Legs "))).to.equal("Legs");
    expect(Notes_firstLine(note("a", "2026-10-22", 1, "", "\n## **Big** day with [[Squat]]\nmore"))).to.equal(
      "Big day with Squat"
    );
    expect(Notes_firstLine(note("a", "2026-10-22", 1, "", " "))).to.equal("Untitled note");
  });

  it("previews the lines after the first line", () => {
    expect(Notes_preview(note("a", "2026-10-22", 1, "", "Head\n- one\n- two"))).to.equal("one two");
    expect(Notes_preview(note("a", "2026-10-22", 1, "Title", "Head\n- one"))).to.equal("Head one");
  });

  it("parses [[title]] links once each, ignoring case", () => {
    expect(Notes_links("Felt [[Squat]] go up. [[squat]] again, then [[ Sleep ]] and [[]] and [[a\nb]]")).to.eql([
      "Squat",
      "Sleep",
    ]);
  });

  it("writes the scores line and a note as Markdown", () => {
    const checkIn: INote = { ...Notes_new("k", "2026-10-22", 1), kind: "checkIn", energy: 4, mood: 5 };
    expect(Notes_scoresLine(checkIn)).to.equal("Energy 4/5 · Mood 5/5");
    expect(Notes_toMarkdown(note("a", "2026-10-22", 1, "Legs", "Heavy squats\n"))).to.equal("### Legs\n\nHeavy squats");
    expect(Notes_toMarkdown(note("a", "2026-10-22", 1, "", ""))).to.equal("### Untitled note");
  });
});
