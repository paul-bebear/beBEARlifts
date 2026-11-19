import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { GET as barcodeGet } from "../api/food/barcode.mjs";
import { GET as usdaGet } from "../api/food/usda.mjs";
import { isBarcode, barcodeKey } from "../api/_food.mjs";

const call = (route: (r: Request) => Promise<Response>, code?: string): Promise<Response> =>
  route(new Request(`https://lifts.paulbebear.com/api/food/x${code == null ? "" : `?code=${code}`}`));

const reply = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

describe("api/_food barcode rule", () => {
  it("accepts 8 to 14 digits only", () => {
    for (const code of ["12345678", "012345678905", "12345678901234"]) {
      expect(isBarcode(code), code).to.equal(true);
    }
    for (const code of ["1234567", "123456789012345", "1234abcd", "", " 12345678"]) {
      expect(isBarcode(code), code).to.equal(false);
    }
  });

  it("strips leading zeros", () => {
    expect(barcodeKey("0012345")).to.equal("12345");
    expect(barcodeKey("12345")).to.equal("12345");
  });
});

describe("api/food routes", () => {
  afterEach(() => sinon.restore());

  for (const [name, route] of [
    ["barcode", barcodeGet],
    ["usda", usdaGet],
  ] as const) {
    describe(name, () => {
      for (const code of [undefined, "123", "1234abcd5678", "123456789012345"]) {
        it(`answers 400 without a fetch for code ${code}`, async () => {
          const fetchStub = sinon.stub(globalThis, "fetch");
          const response = await call(route, code);
          expect(response.status).to.equal(400);
          expect(await response.json()).to.deep.equal({ error: "Barcode must be 8 to 14 digits" });
          expect(response.headers.get("Cache-Control")).to.equal("no-store");
          expect(fetchStub.called).to.equal(false);
        });
      }
    });
  }

  describe("barcode", () => {
    it("passes a found product through and caches it a day", async () => {
      const fetchStub = sinon.stub(globalThis, "fetch").resolves(reply({ status: 1, product: { code: "x" } }));
      const response = await call(barcodeGet, "012345678905");
      expect(response.status).to.equal(200);
      expect(await response.json()).to.deep.equal({ status: 1, product: { code: "x" } });
      expect(response.headers.get("Cache-Control")).to.equal("public, s-maxage=86400");
      const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
      expect(url).to.include("https://world.openfoodfacts.org/api/v2/product/012345678905.json?fields=code,");
      expect((init.headers as Record<string, string>)["User-Agent"]).to.include("beBEARlifts");
    });

    for (const [label, upstream] of [
      ["404", reply({}, 404)],
      ["status 0", reply({ status: 0 })],
    ] as const) {
      it(`answers {status:0} cached an hour when Open Food Facts says ${label}`, async () => {
        sinon.stub(globalThis, "fetch").resolves(upstream);
        const response = await call(barcodeGet, "012345678905");
        expect(response.status).to.equal(200);
        expect(await response.json()).to.deep.equal({ status: 0 });
        expect(response.headers.get("Cache-Control")).to.equal("public, s-maxage=3600");
      });
    }

    it("answers 502 when Open Food Facts fails", async () => {
      sinon.stub(globalThis, "fetch").resolves(reply({}, 500));
      const response = await call(barcodeGet, "012345678905");
      expect(response.status).to.equal(502);
      expect(await response.json()).to.deep.equal({ error: "Open Food Facts returned 500" });
      expect(response.headers.get("Cache-Control")).to.equal("no-store");
    });

    it("answers 502 when the body is not JSON", async () => {
      sinon.stub(globalThis, "fetch").resolves(new Response("<html>", { status: 200 }));
      const response = await call(barcodeGet, "012345678905");
      expect(response.status).to.equal(502);
    });

    it("answers 504 when the fetch throws", async () => {
      sinon.stub(globalThis, "fetch").rejects(new Error("timeout"));
      const response = await call(barcodeGet, "012345678905");
      expect(response.status).to.equal(504);
      expect(await response.json()).to.deep.equal({ error: "Open Food Facts did not answer" });
    });
  });

  describe("usda", () => {
    beforeEach(() => {
      sinon.stub(console, "warn");
    });

    it("searches the padded forms in order and returns the matching food", async () => {
      const match = { gtinUpc: "012345678905", description: "bar" };
      const fetchStub = sinon.stub(globalThis, "fetch");
      fetchStub.onFirstCall().resolves(reply({ foods: [] }));
      fetchStub.onSecondCall().resolves(reply({ foods: [{ gtinUpc: "999" }, match] }));
      const ok = await call(usdaGet, "00012345678905");
      expect(ok.status).to.equal(200);
      expect(await ok.json()).to.deep.equal({ foods: [match] });
      expect(ok.headers.get("Cache-Control")).to.equal("public, s-maxage=86400");
      const queries = fetchStub.getCalls().map((c) => new URL(c.args[0] as string).searchParams.get("query"));
      expect(queries).to.deep.equal(["00012345678905", "012345678905"]);
    });

    it("tries the 12 and 14 digit forms of a short code, then answers an empty list cached an hour", async () => {
      const fetchStub = sinon.stub(globalThis, "fetch").callsFake(async () => reply({ foods: [] }));
      const response = await call(usdaGet, "12345678");
      expect(response.status).to.equal(200);
      expect(await response.json()).to.deep.equal({ foods: [] });
      expect(response.headers.get("Cache-Control")).to.equal("public, s-maxage=3600");
      const queries = fetchStub.getCalls().map((c) => new URL(c.args[0] as string).searchParams.get("query"));
      expect(queries).to.deep.equal(["12345678", "000012345678", "00000012345678"]);
    });

    it("ignores a food whose gtin matches only by prefix", async () => {
      sinon.stub(globalThis, "fetch").callsFake(async () => reply({ foods: [{ gtinUpc: "12345678901" }] }));
      const response = await call(usdaGet, "012345678905");
      expect(await response.json()).to.deep.equal({ foods: [] });
    });

    it("sends the api key from FDC_API_KEY", async () => {
      const before = process.env.FDC_API_KEY;
      process.env.FDC_API_KEY = "real key";
      const fetchStub = sinon.stub(globalThis, "fetch").callsFake(async () => reply({ foods: [] }));
      try {
        await call(usdaGet, "012345678905");
      } finally {
        if (before == null) {
          delete process.env.FDC_API_KEY;
        } else {
          process.env.FDC_API_KEY = before;
        }
      }
      expect(new URL(fetchStub.firstCall.args[0] as string).searchParams.get("api_key")).to.equal("real key");
    });
  });
});
