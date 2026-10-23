import BebearSignInConfig from "../specs/NativeBebearSignInConfig";

export function StoreReceipt_name(): string | undefined {
  return BebearSignInConfig?.getConstants().receiptName;
}
