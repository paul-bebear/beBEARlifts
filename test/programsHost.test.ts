import "mocha";
import { expect } from "chai";
import { ProgramsHost_fork, ProgramsHost_pick } from "../src/utils/programsHost";

describe("ProgramsHost_pick", () => {
  const pageHost = "https://www.liftosaur.com";

  it("uses the page's own host on web", () => {
    expect(ProgramsHost_pick({ isWeb: true, isDev: false, pageHost })).to.equal(pageHost);
  });

  it("uses the local dev server in a native debug build", () => {
    const devHost = "https://local.liftosaur.com:8080";
    expect(ProgramsHost_pick({ isWeb: false, isDev: true, pageHost: devHost })).to.equal(devHost);
  });

  it("uses the fork's site in a native release build", () => {
    expect(ProgramsHost_pick({ isWeb: false, isDev: false, pageHost })).to.equal(ProgramsHost_fork);
  });
});
