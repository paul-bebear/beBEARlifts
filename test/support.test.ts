import "mocha";
import { expect } from "chai";
import { Support_docsUrl, Support_email, Support_licensesUrl } from "../src/utils/support";
import { ProgramsHost_fork } from "../src/utils/programsHost";

describe("Support links", () => {
  it("has an email address", () => {
    expect(Support_email).to.match(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
  });
  it("serves the licenses page from the fork host", () => {
    expect(Support_licensesUrl).to.equal(`${ProgramsHost_fork}/licenses.html`);
  });
  it("points the docs link at an https page", () => {
    expect(Support_docsUrl.startsWith("https://")).to.equal(true);
  });
});
