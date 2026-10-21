import "mocha";
import { expect } from "chai";
import {
  CloudBackupCompare_decide,
  CloudBackupCompare_holdings,
  CloudBackupCompare_keepText,
  CloudBackupCompare_offerText,
  CloudBackupCompare_read,
  CloudBackupCompare_restoreText,
} from "../src/models/cloudBackupCompare";
import { FullBackup_format } from "../src/models/fullBackup";

const exportedAt = "2026-10-19T10:00:00.000Z";

function food(ids: string[], day = "2026-10-19"): Array<{ id: string; day: string }> {
  return ids.map((id) => ({ id, day }));
}

function cloudFile(workoutIds: number[], foodIds: string[]): string {
  return JSON.stringify({
    format: FullBackup_format,
    version: 1,
    exportedAt,
    workouts: { history: workoutIds.map((id) => ({ id })) },
    food: {
      entries: foodIds.map((id) => ({
        id,
        day: "2026-10-18",
        name: "Oats",
        meal: "breakfast",
        nutrients: { calories: 300, protein: 10, carbs: 50, fat: 5 },
      })),
    },
  });
}

describe("CloudBackupCompare", () => {
  it("reads what a cloud file holds and ignores a broken one", () => {
    const cloud = CloudBackupCompare_read(cloudFile([1, 2, 3], ["f1"]));
    expect(cloud?.summary).to.deep.equal({ exportedAt, workouts: 3, foodDays: 1 });
    expect(cloud?.workoutIds).to.deep.equal([1, 2, 3]);
    expect(CloudBackupCompare_read("{")).to.equal(undefined);
  });

  it("asks when the cloud has workouts this phone lacks, as on a new phone after one workout", () => {
    const cloud = CloudBackupCompare_read(cloudFile([1, 2, 3], []));
    const phone = CloudBackupCompare_holdings([{ id: 9 }], []);
    const decision = CloudBackupCompare_decide(cloud, phone, undefined);
    expect(decision).to.deep.equal({
      kind: "ask",
      offer: {
        cloud: { exportedAt, workouts: 3, foodDays: 0 },
        phone: { exportedAt: undefined, workouts: 1, foodDays: 0 },
      },
    });
  });

  it("asks when only food differs", () => {
    const cloud = CloudBackupCompare_read(cloudFile([], ["f1", "f2"]));
    const phone = CloudBackupCompare_holdings([], food(["f1"]));
    expect(CloudBackupCompare_decide(cloud, phone, undefined).kind).to.equal("ask");
  });

  it("uploads when the phone holds everything the cloud has", () => {
    const cloud = CloudBackupCompare_read(cloudFile([1, 2], ["f1"]));
    const phone = CloudBackupCompare_holdings([{ id: 3 }, { id: 2 }, { id: 1 }], food(["f1", "f2"]));
    expect(CloudBackupCompare_decide(cloud, phone, undefined).kind).to.equal("upload");
  });

  it("uploads over a file this phone wrote, even after a workout was deleted here", () => {
    const cloud = CloudBackupCompare_read(cloudFile([1, 2], []));
    const phone = CloudBackupCompare_holdings([{ id: 2 }], []);
    expect(CloudBackupCompare_decide(cloud, phone, exportedAt).kind).to.equal("upload");
    expect(CloudBackupCompare_decide(cloud, phone, "2026-10-01T00:00:00.000Z").kind).to.equal("ask");
  });

  it("uploads when there is no cloud file or it cannot be read", () => {
    const phone = CloudBackupCompare_holdings([{ id: 1 }], []);
    expect(CloudBackupCompare_decide(undefined, phone, undefined).kind).to.equal("upload");
  });

  it("says what each side holds", () => {
    const offer = { cloud: { workouts: 80, foodDays: 45 }, phone: { workouts: 1, foodDays: 1 } };
    expect(CloudBackupCompare_offerText(offer, "19 Oct")).to.equal(
      "Your cloud backup from 19 Oct has 80 workouts and 45 days of food. This phone has 1 workout and 1 day of food. " +
        "Automatic backups wait until you choose."
    );
    expect(CloudBackupCompare_restoreText(offer.cloud, offer.phone, "19 Oct")).to.include(
      "Cloud copy: 80 workouts and 45 days of food.\nThis phone: 1 workout and 1 day of food."
    );
    expect(CloudBackupCompare_keepText(offer, "19 Oct")).to.include("The app saves the cloud backup first.");
  });
});
