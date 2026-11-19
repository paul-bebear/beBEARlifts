import "mocha";
import { expect } from "chai";
import { CsvFromChat_extract } from "../src/models/csvFromChat";

const header = "Workout DateTime,Program,Day Name,Exercise,Is Warmup Set?,Required Reps,Completed Reps";

describe("CsvFromChat_extract", () => {
  it("returns plain CSV trimmed", () => {
    const csv = `${header}\n2026-11-01T10:00:00Z,My plan,Day 1,Squat,0,5,5`;
    expect(CsvFromChat_extract(`\n  ${csv}  \n`)).to.equal(csv);
  });

  it("strips a csv code fence", () => {
    const csv = `${header}\n2026-11-01T10:00:00Z,My plan,Day 1,Squat,0,5,5`;
    expect(CsvFromChat_extract("```csv\n" + csv + "\n```")).to.equal(csv);
  });

  it("strips a bare code fence", () => {
    expect(CsvFromChat_extract("```\n" + header + "\n```")).to.equal(header);
  });

  it("keeps quoted cells with commas", () => {
    const csv = `${header}\n2026-11-01T10:00:00Z,"Push, Pull, Legs",Day 1,"Bench Press, Barbell",0,8,8`;
    expect(CsvFromChat_extract("```csv\n" + csv + "\n```")).to.equal(csv);
  });

  it("returns a header-only CSV", () => {
    expect(CsvFromChat_extract(header)).to.equal(header);
  });

  it("leaves the fence in when text sits before it", () => {
    const text = "Here is the CSV:\n```csv\n" + header + "\n```";
    expect(CsvFromChat_extract(text)).to.equal(text);
  });

  it("returns undefined for empty text and an empty fence", () => {
    expect(CsvFromChat_extract("")).to.equal(undefined);
    expect(CsvFromChat_extract("   \n ")).to.equal(undefined);
    expect(CsvFromChat_extract("```csv\n\n```")).to.equal(undefined);
  });
});
