import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

const root = process.cwd();
const guide = fs.readFileSync(path.join(root, "llms/programs_guide.md"), "utf8");
const dir = path.join(root, "programs/builtin");
const names = fs
  .readdirSync(dir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => String(matter(fs.readFileSync(path.join(dir, file), "utf8")).data.name));
const headings = Array.from(guide.matchAll(/^### (.+)$/gm), (match) => match[1]);

describe("Programs guide", () => {
  it("has a heading for every built-in program", () => {
    expect(names.filter((name) => !headings.includes(name))).to.deep.equal([]);
  });

  it("has no program headings outside the built-in catalog", () => {
    expect(headings.filter((name) => !names.includes(name))).to.deep.equal([]);
  });

  it("has exactly one entry per built-in program", () => {
    expect(headings.slice().sort()).to.deep.equal(names.slice().sort());
  });
});
