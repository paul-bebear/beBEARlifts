import "mocha";
import { expect } from "chai";
import {
  ICalendarCell,
  MonthCalendar_build,
  MonthCalendar_dayTitle,
  MonthCalendar_shift,
  MonthCalendar_title,
  MonthCalendar_visibleWeeks,
  MonthCalendar_workoutDays,
} from "../src/models/monthCalendar";

const october = MonthCalendar_build({
  month: "2026-10",
  today: "2026-10-21",
  selected: "2026-10-14",
  workoutDays: new Set(["2026-10-20", "2026-09-29"]),
});

describe("MonthCalendar", () => {
  it("starts weeks on Monday and pads with the neighbouring months", () => {
    expect(october.title).to.equal("October 2026");
    expect(october.weeks.length).to.equal(5);
    expect(october.weeks[0][0]).to.deep.include({ day: "2026-09-28", isInMonth: false, dayNumber: 28 });
    expect(october.weeks[0][3]).to.deep.include({ day: "2026-10-01", isInMonth: true });
    expect(october.weeks[4][6].day).to.equal("2026-11-01");
  });

  it("marks today, the selected day, future days and workout days", () => {
    const cells = october.weeks.flat();
    const cell = (day: string): ICalendarCell => cells.find((c) => c.day === day)!;
    expect(cell("2026-10-21")).to.deep.include({ isToday: true, isFuture: false });
    expect(cell("2026-10-22").isFuture).to.equal(true);
    expect(cell("2026-10-14").isSelected).to.equal(true);
    expect(cell("2026-10-20").hasWorkout).to.equal(true);
    expect(cell("2026-09-29").hasWorkout).to.equal(true);
  });

  it("collapses to the week of the selected day, then today", () => {
    expect(MonthCalendar_visibleWeeks(october, false).length).to.equal(5);
    expect(MonthCalendar_visibleWeeks(october, true)[0][0].day).to.equal("2026-10-12");
    const noSelection = MonthCalendar_build({
      ...october,
      today: "2026-10-21",
      selected: "2026-12-01",
      workoutDays: new Set(),
    });
    expect(MonthCalendar_visibleWeeks(noSelection, true)[0][0].day).to.equal("2026-10-19");
  });

  it("moves across years", () => {
    expect(MonthCalendar_shift("2026-12", 1)).to.equal("2027-01");
    expect(MonthCalendar_shift("2026-01", -1)).to.equal("2025-12");
    expect(MonthCalendar_title("2027-02")).to.equal("February 2027");
    expect(MonthCalendar_dayTitle("2026-10-05")).to.equal("October 5");
  });

  it("reads workout days in local time", () => {
    const evening = new Date(2026, 9, 20, 23, 30).getTime();
    expect(Array.from(MonthCalendar_workoutDays([{ startTime: evening }]))).to.deep.equal(["2026-10-20"]);
  });
});
