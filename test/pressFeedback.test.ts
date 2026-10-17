import "mocha";
import { expect } from "chai";
import { IPressFeedbackNode, PressFeedback_findTarget } from "../src/utils/pressFeedback";

interface IFakeNode extends IPressFeedbackNode {
  name: string;
  cursor: string;
  parentElement: IFakeNode | null;
}

type IFakeSpec = [name: string, tagName: string, cursor: string, hasTabindex?: boolean];

function chain(...specs: IFakeSpec[]): IFakeNode[] {
  const built: IFakeNode[] = [];
  let parent: IFakeNode | null = null;
  for (const [name, tagName, cursor, hasTabindex] of specs) {
    const node: IFakeNode = {
      name,
      tagName,
      cursor,
      parentElement: parent,
      hasAttribute: (attr) => attr === "tabindex" && !!hasTabindex,
    };
    built.push(node);
    parent = node;
  }
  return built;
}

const cursorOf = (node: IFakeNode): string => node.cursor;

describe("PressFeedback_findTarget", () => {
  it("returns the Pressable, not the child text that inherits its pointer cursor", () => {
    const [, , button, , label] = chain(
      ["body", "BODY", "auto"],
      ["screen", "DIV", "auto"],
      ["button", "DIV", "pointer", true],
      ["row", "DIV", "pointer"],
      ["label", "DIV", "pointer"]
    );
    expect(PressFeedback_findTarget(label, cursorOf)?.name).to.equal(button.name);
  });

  it("picks the inner Pressable when one is nested in another", () => {
    const [, , , icon] = chain(
      ["body", "BODY", "auto"],
      ["card", "DIV", "pointer", true],
      ["star", "DIV", "pointer", true],
      ["icon", "DIV", "pointer"]
    );
    expect(PressFeedback_findTarget(icon, cursorOf)?.name).to.equal("star");
  });

  it("skips focusable elements that are not tappable", () => {
    const [, , text] = chain(["body", "BODY", "auto"], ["scroller", "DIV", "auto", true], ["text", "DIV", "auto"]);
    expect(PressFeedback_findTarget(text, cursorOf)).to.equal(undefined);
  });

  it("ignores taps on text fields, even inside a tappable row", () => {
    const [, , input] = chain(["body", "BODY", "auto"], ["row", "DIV", "pointer", true], ["input", "INPUT", "text"]);
    expect(PressFeedback_findTarget(input, cursorOf)).to.equal(undefined);
  });

  it("returns undefined for a missing target", () => {
    expect(PressFeedback_findTarget<IFakeNode>(null, cursorOf)).to.equal(undefined);
  });
});
