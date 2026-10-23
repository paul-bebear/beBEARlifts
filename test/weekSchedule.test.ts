import "mocha";
import { expect } from "chai";
import {
  IScheduleProgram,
  WeekSchedule_dayCount,
  WeekSchedule_default,
  WeekSchedule_empty,
  WeekSchedule_follow,
  WeekSchedule_forProgram,
  WeekSchedule_move,
  WeekSchedule_moveDay,
  WeekSchedule_parse,
  WeekSchedule_resolve,
  WeekSchedule_save,
  WeekSchedule_startChoice,
  WeekSchedule_today,
  WeekSchedule_todayFor,
  WeekSchedule_upNextDay,
  WeekSchedule_weekday,
  WeekSchedule_workedOutToday,
} from "../src/models/weekSchedule";

const at = (day: string, hour: number = 12): number => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
};

// 2026-10-19 is a Monday, 2026-10-22 a Thursday.
const monday = at("2026-10-19");
const tuesday = at("2026-10-20");
const wednesday = at("2026-10-21");
const thursday = at("2026-10-22");
const friday = at("2026-10-23");
const sunday = at("2026-10-25");

function program(nextDay: number, ...weeks: string[][]): IScheduleProgram {
  return { nextDay, weeks: weeks.map((names) => ({ days: names.map((name) => ({ name })) })) };
}

const ulppl = ["Upper", "Lower 1", "Push", "Pull", "Lower 2"];

describe("WeekSchedule", () => {
  it("spreads the default days with rest between hard days", () => {
    expect(WeekSchedule_default(3)).to.deep.equal([0, null, 1, null, 2, null, null]);
    expect(WeekSchedule_default(4)).to.deep.equal([0, 1, null, 2, 3, null, null]);
    expect(WeekSchedule_default(5)).to.deep.equal([0, 1, null, 2, 3, 4, null]);
    expect(WeekSchedule_default(7)).to.deep.equal([0, 1, 2, 3, 4, 5, 6]);
    expect(WeekSchedule_default(0)).to.deep.equal([null, null, null, null, null, null, null]);
  });

  it("drops days the program lost and puts new days on the first free weekdays", () => {
    expect(WeekSchedule_resolve([0, 1, null, 2, 3, 4, null], 4)).to.deep.equal([0, 1, null, 2, 3, null, null]);
    expect(WeekSchedule_resolve([0, null, 1, null, 2, null, null], 4)).to.deep.equal([0, 3, 1, null, 2, null, null]);
    expect(WeekSchedule_resolve([0, 0, null, null, null, null, null], 1)).to.deep.equal([
      0,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("uses the default when no schedule is saved, and the saved one per program", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "a", [null, 0, null, null, null, null, 1]);
    expect(WeekSchedule_forProgram(log, "a", 2)).to.deep.equal([null, 0, null, null, null, null, 1]);
    expect(WeekSchedule_forProgram(log, "b", 2)).to.deep.equal(WeekSchedule_default(2));
  });

  it("moves a day onto a rest weekday, and swaps two days", () => {
    const slots = WeekSchedule_default(5);
    expect(WeekSchedule_move(slots, 3, 2)).to.deep.equal([0, 1, 2, null, 3, 4, null]);
    expect(WeekSchedule_move(slots, 0, 1)).to.deep.equal([1, 0, null, 2, 3, 4, null]);
    expect(slots).to.deep.equal(WeekSchedule_default(5));
  });

  it("saves a move from the default schedule and leaves other programs alone", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "other", [null, null, null, null, null, null, 0]);
    const moved = WeekSchedule_moveDay(log, "ulppl", 5, 3, 2);
    expect(moved.programs.ulppl).to.deep.equal([0, 1, 2, null, 3, 4, null]);
    expect(moved.programs.other).to.equal(log.programs.other);
    expect(log.programs.ulppl).to.equal(undefined);
  });

  it("parses a broken store to safe values", () => {
    expect(WeekSchedule_parse(undefined)).to.deep.equal(WeekSchedule_empty());
    const log = WeekSchedule_parse({ programs: { a: [0, "x", -1, 2.5, null, 1, 3], b: [0, 1], c: "no" } });
    expect(log.programs).to.deep.equal({ a: [0, null, null, null, null, 1, 3] });
  });

  it("counts Monday as weekday 0 and Sunday as 6", () => {
    expect(WeekSchedule_weekday(new Date(monday))).to.equal(0);
    expect(WeekSchedule_weekday(new Date(sunday))).to.equal(6);
  });

  it("counts the most days in any week", () => {
    expect(WeekSchedule_dayCount(program(1, ["A", "B"], ["A", "B", "C"]))).to.equal(3);
    expect(WeekSchedule_dayCount(program(1))).to.equal(0);
  });

  it("walks the owner's week: Upper Monday, Lower Tuesday, rest Wednesday, Push Thursday", () => {
    const slots = WeekSchedule_default(5);
    expect(WeekSchedule_today(program(1, ulppl), slots, monday)).to.deep.equal({
      kind: "day",
      weekday: 0,
      day: 1,
      name: "Upper",
    });
    expect(WeekSchedule_today(program(2, ulppl), slots, tuesday)).to.include({ kind: "day", name: "Lower 1" });
    expect(WeekSchedule_today(program(3, ulppl), slots, wednesday)).to.deep.equal({ kind: "rest", weekday: 2 });
    expect(WeekSchedule_today(program(3, ulppl), slots, thursday)).to.include({ kind: "day", day: 3, name: "Push" });
  });

  it("takes an earlier day from the next week once the calendar passed it", () => {
    const twoWeeks = program(4, ["A", "B", "C"], ["A2", "B2", "C2"]);
    const slots = WeekSchedule_default(3);
    expect(WeekSchedule_today(twoWeeks, slots, monday)).to.include({ day: 4, name: "A2" });
    const lastWeek = program(5, ["A", "B", "C"], ["A2", "B2", "C2"]);
    expect(WeekSchedule_today(lastWeek, slots, monday)).to.include({ day: 1, name: "A" });
  });

  it("finds today from the saved schedule of that program", () => {
    const log = WeekSchedule_save(WeekSchedule_empty(), "p", [null, null, null, 4, null, null, null]);
    expect(WeekSchedule_todayFor(log, { id: "p", ...program(1, ulppl) }, thursday)).to.include({ name: "Lower 2" });
    expect(WeekSchedule_todayFor(log, { id: "q", ...program(1, ulppl) }, thursday)).to.include({ name: "Push" });
  });

  it("calls a weekday rest when that week has no day at its place", () => {
    const short = program(1, ["A", "B"], ["A2", "B2", "C2"]);
    expect(WeekSchedule_today(short, [0, 1, 2, null, null, null, null], wednesday)).to.deep.equal({
      kind: "rest",
      weekday: 2,
    });
  });

  it("has no today for a program without days", () => {
    expect(WeekSchedule_today(program(1), WeekSchedule_default(0), monday)).to.deep.equal({
      kind: "none",
      weekday: 0,
    });
  });

  it("offers today's day first when it is not the next day", () => {
    const p = program(1, ulppl);
    const today = WeekSchedule_today(p, WeekSchedule_default(5), thursday);
    expect(WeekSchedule_startChoice(p, today, { workedOutToday: false, hasProgress: false })).to.deep.equal({
      kind: "today",
      day: 3,
      todayName: "Push",
      nextName: "Upper",
    });
    expect(WeekSchedule_upNextDay(p, today, false)).to.equal(3);
  });

  it("offers the next day as usual when it is today's day", () => {
    const p = program(3, ulppl);
    const today = WeekSchedule_today(p, WeekSchedule_default(5), thursday);
    expect(WeekSchedule_startChoice(p, today, { workedOutToday: false, hasProgress: false })).to.deep.equal({
      kind: "next",
    });
  });

  it("still offers the next day in order on a rest day", () => {
    const p = program(3, ulppl);
    const today = WeekSchedule_today(p, WeekSchedule_default(5), wednesday);
    expect(WeekSchedule_startChoice(p, today, { workedOutToday: false, hasProgress: false })).to.deep.equal({
      kind: "rest",
      nextName: "Push",
    });
    expect(WeekSchedule_upNextDay(p, today, false)).to.equal(3);
  });

  it("offers nothing new after today's workout or during one", () => {
    const p = program(4, ulppl);
    const today = WeekSchedule_today(p, WeekSchedule_default(5), thursday);
    expect(WeekSchedule_startChoice(p, today, { workedOutToday: true, hasProgress: false }).kind).to.equal("next");
    expect(WeekSchedule_startChoice(p, today, { workedOutToday: false, hasProgress: true }).kind).to.equal("next");
    expect(WeekSchedule_upNextDay(p, today, true)).to.equal(4);
  });

  it("knows a workout happened today by the local day", () => {
    expect(WeekSchedule_workedOutToday([{ startTime: at("2026-10-22", 7) }], thursday)).to.equal(true);
    expect(WeekSchedule_workedOutToday([{ startTime: at("2026-10-21", 23) }], thursday)).to.equal(false);
  });
  it("moves the next workout to today's planned day once a day", () => {
    const p = { ...program(4, ulppl), id: "p" };
    const fridayIsUpper = WeekSchedule_save(
      WeekSchedule_empty(),
      "p",
      WeekSchedule_move(WeekSchedule_default(5), 4, 0)
    );
    const step = WeekSchedule_follow(fridayIsUpper, p, { now: friday, workedOutToday: false, hasProgress: false });
    expect(step?.nextDay).to.equal(1);
    expect(step?.log.followedOn).to.deep.equal({ p: "2026-10-23" });
    expect(
      WeekSchedule_follow(step!.log, p, { now: at("2026-10-23", 18), workedOutToday: false, hasProgress: false })
    ).to.equal(undefined);
    expect(
      WeekSchedule_follow(step!.log, p, { now: at("2026-10-24"), workedOutToday: false, hasProgress: false })
    ).to.not.equal(undefined);
  });

  it("marks the day without moving anything when today already matches, is a rest day, or is done", () => {
    const p = { ...program(4, ulppl), id: "p" };
    const matches = WeekSchedule_follow(WeekSchedule_empty(), p, {
      now: friday,
      workedOutToday: false,
      hasProgress: false,
    });
    expect(matches).to.deep.equal({ log: { version: 1, programs: {}, followedOn: { p: "2026-10-23" } } });
    const rest = WeekSchedule_follow(WeekSchedule_empty(), p, {
      now: sunday,
      workedOutToday: false,
      hasProgress: false,
    });
    expect(rest?.nextDay).to.equal(undefined);
    const done = WeekSchedule_follow(WeekSchedule_empty(), p, {
      now: monday,
      workedOutToday: true,
      hasProgress: false,
    });
    expect(done?.nextDay).to.equal(undefined);
  });

  it("waits while a workout is running", () => {
    const p = { ...program(4, ulppl), id: "p" };
    expect(
      WeekSchedule_follow(WeekSchedule_empty(), p, { now: monday, workedOutToday: false, hasProgress: true })
    ).to.equal(undefined);
  });

  it("keeps the followed days through a parse and drops bad ones", () => {
    const log = WeekSchedule_parse({ programs: {}, followedOn: { p: "2026-10-23", q: "yesterday", r: 5 } });
    expect(log.followedOn).to.deep.equal({ p: "2026-10-23" });
    expect(WeekSchedule_parse({ programs: {}, followedOn: { q: "x" } })).to.deep.equal(WeekSchedule_empty());
  });
});
