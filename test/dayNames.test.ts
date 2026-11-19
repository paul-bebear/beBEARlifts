import "mocha";
import { expect } from "chai";
import {
  DayNames_dayMonth,
  DayNames_mondayFirst,
  DayNames_monthDay,
  DayNames_monthDayYear,
  DayNames_monthDayYearIfOtherYear,
  DayNames_monthsLong,
  DayNames_monthsShort,
  DayNames_weekdayLetters,
  DayNames_weekdaysLong,
  DayNames_weekdaysShort,
} from "../src/models/dayNames";

describe("DayNames", () => {
  it("lists months from January and weekdays from Sunday, the order Date uses", () => {
    expect(DayNames_monthsLong[10]).to.equal("November");
    expect(DayNames_monthsShort).to.deep.equal([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
    expect(DayNames_weekdaysLong[new Date(2026, 10, 5, 12).getDay()]).to.equal("Thursday");
    expect(DayNames_weekdaysShort).to.deep.equal(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(DayNames_weekdayLetters).to.deep.equal(["S", "M", "T", "W", "T", "F", "S"]);
  });

  it("moves Sunday to the end for a Monday-first week", () => {
    expect(DayNames_mondayFirst(DayNames_weekdaysLong)).to.deep.equal([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
    expect(DayNames_mondayFirst(DayNames_weekdayLetters)).to.deep.equal(["M", "T", "W", "T", "F", "S", "S"]);
  });

  it("writes Nov 5 for food and progress, and 5 Nov for the bear", () => {
    const date = new Date(2026, 10, 5, 9);
    expect(DayNames_monthDay(date)).to.equal("Nov 5");
    expect(DayNames_dayMonth(date)).to.equal("5 Nov");
    expect(DayNames_monthDayYear(date)).to.equal("Nov 5, 2026");
  });

  it("adds the year only when it differs from now", () => {
    const now = new Date(2026, 10, 19, 12).getTime();
    expect(DayNames_monthDayYearIfOtherYear(new Date(2026, 0, 2, 8).getTime(), now)).to.equal("Jan 2");
    expect(DayNames_monthDayYearIfOtherYear(new Date(2025, 11, 31, 23).getTime(), now)).to.equal("Dec 31, 2025");
  });
});
