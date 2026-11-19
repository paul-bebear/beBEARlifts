import "mocha";
import { expect } from "chai";
import { RunMapSnapshot_render } from "../src/utils/runMapSnapshot";
import { ILatLon } from "../src/models/runRoute";

describe("RunMapSnapshot_render on the web", () => {
  it("returns no map, so the run card draws the route itself", async () => {
    const route: ILatLon[][] = [
      [
        [52.1, 4.3],
        [52.2, 4.4],
      ],
    ];
    expect(await RunMapSnapshot_render(route, 300, 200, 10)).to.equal(undefined);
    expect(await RunMapSnapshot_render([], 0, 0, 0)).to.equal(undefined);
  });
});
