import "mocha";
import { expect } from "chai";
import { MusicLog_empty, MusicLog_maxSessions, MusicLog_putSession } from "../src/models/musicLog";
import { IMusicSession } from "../src/models/musicSession";
import { IWarmupPlan, WarmupPlan_empty, WarmupPlan_maxPlans, WarmupPlan_put } from "../src/models/warmupPlan";
import {
  IWorkoutReport,
  WorkoutReport_empty,
  WorkoutReport_maxReports,
  WorkoutReport_put,
} from "../src/models/workoutReport";
import { SetClips_keepNote, SetClips_maxRecords } from "../src/models/setClips";

const yearAtFourAWeek = 52 * 4;

describe("Store caps", () => {
  it("keeps a year of music, warmups and reports at 4 workouts a week", () => {
    expect(MusicLog_maxSessions).to.be.at.least(yearAtFourAWeek);
    expect(WarmupPlan_maxPlans).to.be.at.least(yearAtFourAWeek);
    expect(WorkoutReport_maxReports).to.be.at.least(yearAtFourAWeek);

    let music = MusicLog_empty();
    let warmups = WarmupPlan_empty();
    let reports = WorkoutReport_empty();
    for (let i = 1; i <= MusicLog_maxSessions + 5; i += 1) {
      music = MusicLog_putSession(music, { id: i, startedAt: i, songs: [] } as unknown as IMusicSession);
      warmups = WarmupPlan_put(warmups, { workoutId: i } as unknown as IWarmupPlan);
      reports = WorkoutReport_put(reports, { workoutId: i, timestamp: i } as unknown as IWorkoutReport);
    }
    expect(music.sessions.length).to.equal(MusicLog_maxSessions);
    expect(music.sessions[music.sessions.length - 1].id).to.equal(6);
    expect(warmups.plans.length).to.equal(WarmupPlan_maxPlans);
    expect(reports.reports.length).to.equal(WorkoutReport_maxReports);
  });

  it("says on the clip screen that old clip records are removed", () => {
    expect(SetClips_keepNote).to.include(`newest ${SetClips_maxRecords} filmed sets`);
    expect(SetClips_keepNote).to.include("Older clip records are removed");
  });
});
