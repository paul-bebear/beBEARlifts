import "mocha";
import { expect } from "chai";
import { UsdaFood_apiKey } from "../api/food/usda.mjs";

describe("api/food/usda", () => {
  it("uses FDC_API_KEY and logs nothing when it is set", () => {
    const lines: string[] = [];
    expect(UsdaFood_apiKey({ FDC_API_KEY: "real" }, (line: string) => lines.push(line))).to.equal("real");
    expect(lines).to.deep.equal([]);
  });

  it("falls back to DEMO_KEY and logs one line that names FDC_API_KEY", () => {
    const lines: string[] = [];
    expect(UsdaFood_apiKey({}, (line: string) => lines.push(line))).to.equal("DEMO_KEY");
    expect(lines).to.have.length(1);
    expect(lines[0]).to.include("FDC_API_KEY");
  });
});
