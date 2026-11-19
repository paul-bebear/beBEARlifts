import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { GET, UsdaFood_apiKey, UsdaFood_busyMessage } from "../api/food/usda.mjs";

describe("api/food/usda", () => {
  afterEach(() => sinon.restore());

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

  const lookup = (): Promise<Response> =>
    GET(new Request("https://lifts.paulbebear.com/api/food/usda?code=012345678905"));

  for (const status of [429, 403]) {
    it(`shows plain words to the user and logs the detail when USDA answers ${status}`, async () => {
      const warn = sinon.stub(console, "warn");
      sinon.stub(globalThis, "fetch").resolves(new Response("{}", { status }));
      const response = await lookup();
      expect(response.status).to.equal(502);
      expect(await response.json()).to.deep.equal({ error: UsdaFood_busyMessage });
      expect(warn.args.flat().join(" ")).to.include(String(status));
    });
  }

  it("shows plain words to the user when USDA does not answer", async () => {
    const warn = sinon.stub(console, "warn");
    sinon.stub(globalThis, "fetch").rejects(new Error("timeout"));
    const response = await lookup();
    expect(response.status).to.equal(504);
    expect(await response.json()).to.deep.equal({ error: UsdaFood_busyMessage });
    expect(warn.args.flat().join(" ")).to.include("did not answer");
  });
});
