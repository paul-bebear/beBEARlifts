import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { OnboardingChat } from "../src/components/onboardingChat.native";
import { OnboardingCommand_run } from "../src/utils/onboardingCommand";
import { CloudBackupCommand_run } from "../src/utils/cloudBackupCommand";
import { IOnboardingState } from "../src/models/onboarding";
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

async function press(name: string): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name }));
}

describe("native beBEAR first run", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await render(<OnboardingChat dispatch={dispatch}>{null}</OnboardingChat>);
  });

  it("opens the bear welcome with email sign-in and a social sign-in slot", () => {
    expect(screen.getByText("Meet your bear")).toBeTruthy();
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.getByTestId("onboarding-social-sign-in-slot")).toBeTruthy();
    expect(screen.queryByText("Continue with Apple")).toBeNull();
    expect(screen.queryByText("Continue with Google")).toBeNull();
  });

  it("sends and verifies an email code through the existing command", async () => {
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

  it("retains body and food answers, orders the recommended plan first, and starts the picked plan", async () => {
    await press("Not now");
    expect(screen.getByRole("button", { name: "Pick at least one" })).toBeDisabled();
    await press("Only dumbbells");
    await press("Next");
    await press("cm");
    await press("kg");
    await fireEvent.changeText(screen.getByLabelText("Age"), "30");
    await fireEvent.changeText(screen.getByLabelText("Height in cm"), "180");
    await fireEvent.changeText(screen.getByLabelText("Weight in kg"), "80");
    await press("Male");
    await press("Mostly sitting Desk job, little exercise");
    await press("Lose weight");
    await press("Next");
    await press("4");
    await press("Recommend a plan");
    const cards = screen.getAllByRole("radio");
    expect(screen.getByRole("radio", { checked: true })).toBe(cards[0]);
    expect(screen.getByText("Best for you")).toBeTruthy();
    await fireEvent.press(cards[1]);
    await press("Start");
    const form = jest.mocked(OnboardingCommand_run).mock.calls[0][0];
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
    expect(form.cards[0].days).toBe(4);
    expect(form.selected).toBe(1);
    expect(form.command).toBe("apply");
  });

  it("clears optional food answers before recommending a plan", async () => {
    await press("Not now");
    await press("No equipment");
    await press("Next");
    await press("Mostly sitting Desk job, little exercise");
    await press("Lose weight");
    await press("Skip food targets");
    await press("Next");
    await press("Recommend a plan");
    await press("Start");
    const form: IOnboardingState = jest.mocked(OnboardingCommand_run).mock.calls[0][0];
    expect(form.answers.activity).toBeUndefined();
    expect(form.answers.foodGoal).toBeUndefined();
    expect(form.cards[0].params.places).toBeTruthy();
  });
});
