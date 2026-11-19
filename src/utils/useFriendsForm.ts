import { Dispatch, useEffect, useReducer } from "react";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { FriendsCommand_run } from "./friendsCommand";

export function useFriendsForm(
  shouldLoad: boolean,
  userId: string | undefined
): [IFriendsForm, Dispatch<IFriendsFormEvent>] {
  const [form, emit] = useReducer(FriendsForm_reduce, undefined, FriendsForm_empty);

  useEffect(() => {
    if (shouldLoad) {
      emit({ type: "load" });
    }
  }, [shouldLoad, userId]);

  useEffect(() => {
    if (form.command != null) {
      FriendsCommand_run(form.command, emit);
    }
  }, [form.command]);

  return [form, emit];
}
