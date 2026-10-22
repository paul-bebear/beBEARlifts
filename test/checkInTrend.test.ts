import "mocha";
import { expect } from "chai";
import { Notes_empty, Notes_updateCheckIn, INotesLog, ICheckInScore } from "../src/models/notes";
import {
  CheckInTrend_build,
  CheckInTrend_longDays,
  CheckInTrend_segments,
  CheckInTrend_shortDays,
  CheckInTrend_summary,
} from "../src/models/checkInTrend";

function rated(log: INotesLog, day: string, energy: ICheckInScore, mood?: ICheckInScore): INotesLog {
  let next = Notes_updateCheckIn(log, { day, newId: `k-${day}`, now: 1, field: "energy", value: energy });
  if (mood != null) {
    next = Notes_updateCheckIn(next, { day, newId: `k-${day}`, now: 1, field: "mood", value: mood });
  }
  return next;
}

describe("CheckInTrend", () => {
  it("lays out the last 30 days ending today, oldest first", () => {
    const trend = CheckInTrend_build({
      notes: Notes_empty(),
      today: "2026-10-22",
      length: CheckInTrend_shortDays,
      workoutDays: new Set(),
    });
    expect(trend.days).to.have.length(30);
    expect(trend.days[0]).to.equal("2026-09-23");
    expect(trend.days[29]).to.equal("2026-10-22");
    expect(trend.lines.map((l) => l.label)).to.eql(["Energy", "Soreness", "Mood"]);
    expect(trend.checkInCount).to.equal(0);
    expect(CheckInTrend_summary(trend)).to.equal("No check-ins yet. Rate your day in the Journal.");
  });

  it("puts each score on its day and averages the known ones", () => {
    let notes = rated(Notes_empty(), "2026-10-22", 4, 5);
    notes = rated(notes, "2026-10-20", 1);
    notes = rated(notes, "2026-01-01", 5);
    const trend = CheckInTrend_build({ notes, today: "2026-10-22", length: 3, workoutDays: new Set(["2026-10-21"]) });
    const energy = trend.lines[0];
    expect(energy.values).to.eql([1, undefined, 4]);
    expect(energy.average).to.equal(2.5);
    expect(trend.lines[1].average).to.equal(undefined);
    expect(trend.lines[2].values).to.eql([undefined, undefined, 5]);
    expect(trend.workoutDays).to.eql([false, true, false]);
    expect(trend.checkInCount).to.equal(2);
    expect(CheckInTrend_summary(trend)).to.equal("2 check-ins in the last 3 days");
  });

  it("covers 90 days for the full chart", () => {
    const trend = CheckInTrend_build({
      notes: Notes_empty(),
      today: "2026-10-22",
      length: CheckInTrend_longDays,
      workoutDays: new Set(),
    });
    expect(trend.days[0]).to.equal("2026-07-25");
  });

  it("maps scores to points, 5 at the top, and breaks the line at a missing day", () => {
    expect(CheckInTrend_segments([1, 5, undefined, 3, 3], 100, 40)).to.eql([
      [
        { x: 0, y: 40 },
        { x: 25, y: 0 },
      ],
      [
        { x: 75, y: 20 },
        { x: 100, y: 20 },
      ],
    ]);
    expect(CheckInTrend_segments([undefined, undefined], 100, 40)).to.eql([]);
    expect(CheckInTrend_segments([3], 100, 40)).to.eql([[{ x: 0, y: 20 }]]);
  });
});
