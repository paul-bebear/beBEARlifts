import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { OnboardingChat } from "../src/components/onboardingChat.native";
import { OnboardingFlow } from "../src/components/onboardingFlow";
import { OnboardingCommand_run } from "../src/utils/onboardingCommand";
import { CloudBackupCommand_run } from "../src/utils/cloudBackupCommand";
import { IOnboardingState, Onboarding_selectedCard } from "../src/models/onboarding";
import { OnboardingStepList_all } from "../src/models/onboardingStepList";
import { IDispatch } from "../src/ducks/types";

jest.mock("../src/utils/onboardingCommand", () => ({ OnboardingCommand_run: jest.fn(() => jest.fn()) }));
jest.mock("../src/utils/cloudBackupCommand", () => ({ CloudBackupCommand_run: jest.fn(() => jest.fn()) }));
jest.mock("../src/utils/supabaseClient", () => ({
  CloudStore: { use: () => ({}) },
  SentCodeStore: { load: async () => ({}) },
}));
jest.mock("../src/utils/inviteClient", () => ({
  InviteStore: { use: () => ({}) },
  InviteClient_save: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/utils/aiConsentClient", () => ({
  AiConsentStore: { use: () => ({ choice: "unknown" }) },
  AiConsent_ensure: jest.fn().mockResolvedValue(false),
}));
jest.mock("../src/components/cloudRestoreBanner", () => ({ CloudRestoreChoice: () => null }));
jest.mock("react-native-image-picker", () => ({ launchImageLibrary: jest.fn() }));

const dispatch = jest.fn() as unknown as IDispatch;

const shortList = OnboardingStepList_all.filter((step) =>
  [
    "start",
    "places",
    "experience",
    "sex",
    "height",
    "weight",
    "age",
    "activity",
    "foodGoal",
    "days",
    "plans",
    "welcome",
  ].includes(step.id)
);

async function press(name: string): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name }));
}

async function pick(name: string): Promise<void> {
  await fireEvent.press(screen.getByLabelText(name));
}

async function getStarted(): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "Get started" }));
  });
}

function lastForm(): IOnboardingState {
  return jest.mocked(OnboardingCommand_run).mock.calls[0][0];
}

describe("native beBEAR first run", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the bear start screen and shows email sign-in only after I have an account", async () => {
    await render(<OnboardingChat dispatch={dispatch}>{null}</OnboardingChat>);
    expect(screen.getByText("beBEAR")).toBeTruthy();
    expect(screen.queryByLabelText("Email address")).toBeNull();
    await press("I have an account");
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByTestId("onboarding-social-sign-in-slot")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "I have an account" })).toBeNull();
  });

  it("sends and verifies an email code through the existing command", async () => {
    await render(<OnboardingChat dispatch={dispatch}>{null}</OnboardingChat>);
    await press("I have an account");
    await fireEvent.changeText(screen.getByLabelText("Email address"), "bear@example.com");
    await press("Send code");
    expect(CloudBackupCommand_run).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "sendCode", email: "bear@example.com" }),
      expect.any(Function)
    );
    await act(() => jest.mocked(CloudBackupCommand_run).mock.calls[0][1]({ type: "sent", now: Date.now() }));
    expect(screen.getByRole("button", { name: /Send a new code in/ })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Email code"), "123456");
    await press("Sign in");
    expect(CloudBackupCommand_run).toHaveBeenLastCalledWith(
      expect.objectContaining({ operation: "verify", email: "bear@example.com", code: "123456" }),
      expect.any(Function)
    );
  });

  it("walks the full list from Get started to the bear's first question", async () => {
    await render(<OnboardingChat dispatch={dispatch}>{null}</OnboardingChat>);
    await getStarted();
    expect(screen.getByText("Climb 12 levels, from Cub to Mars")).toBeTruthy();
    expect(screen.getByTestId("onboarding-levels")).toBeTruthy();
  });

  it("retains body and food answers, orders the recommended plan first, and starts the picked plan", async () => {
    await render(<OnboardingFlow dispatch={dispatch} language="en-GB" steps={shortList} />);
    await getStarted();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await pick("A few months");
    await press("Next");
    await pick("Male");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Height in cm"), "180");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Weight in kg"), "80");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Age"), "30");
    await press("Next");
    await pick("Mostly sitting");
    await press("Next");
    await pick("Lose weight");
    await press("Next");
    await pick("Only dumbbells");
    await press("Next");
    await pick("4 days a week");
    await press("Next");
    const cards = screen.getAllByRole("radio");
    expect(screen.getByRole("radio", { checked: true })).toBe(cards[0]);
    expect(screen.getByText("BEST FOR YOU")).toBeTruthy();
    await fireEvent.press(cards[1]);
    await press("Next");
    await press("Start my first workout");
    const form = lastForm();
    expect(form.answers).toMatchObject({
      places: ["dumbbells"],
      age: "30",
      height: "180",
      unit: "kg",
      weight: "80",
      sex: "male",
      activity: "sedentary",
      foodGoal: "lose",
      days: 4,
    });
    expect(Onboarding_selectedCard(form)?.days).toBe(3);
    expect(form.command).toBe("apply");
  });

  it("clears optional food answers when the food questions are skipped", async () => {
    await render(<OnboardingFlow dispatch={dispatch} language="en-GB" steps={shortList} />);
    await getStarted();
    await pick("Never trained");
    await press("Next");
    await pick("Rather not say");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Height in cm"), "170");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Weight in kg"), "60");
    await press("Next");
    await fireEvent.changeText(screen.getByLabelText("Age"), "17");
    await press("Next");
    await pick("Mostly sitting");
    await pick("Skip food targets");
    await press("Next");
    await pick("Skip food targets");
    await press("Next");
    await pick("No equipment");
    await press("Next");
    await pick("3 days a week");
    await press("Next");
    await press("Next");
    await press("Start my first workout");
    const form = lastForm();
    expect(form.answers.activity).toBeUndefined();
    expect(form.answers.foodGoal).toBeUndefined();
    expect(Onboarding_selectedCard(form)?.params.places).toBeTruthy();
  });
});
