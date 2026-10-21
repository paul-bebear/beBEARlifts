import { JSX, useCallback, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { Dialog_alert } from "../utils/dialog";
import { CsvFromChat_extract } from "../models/csvFromChat";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { MenuItemWrapper } from "./menuItem";
import { Thunk_importCsvData } from "../ducks/thunks";
import { FileImport_pickFile } from "../utils/fileImport";
import { ClipboardUtils_paste } from "../utils/clipboard";
import { IconHelp } from "./icons/iconHelp";
import { InternalLink } from "../internalLink";

interface IImporterLiftosaurCsvProps {
  dispatch: IDispatch;
}

export function ImporterLiftosaurCsv(props: IImporterLiftosaurCsvProps): JSX.Element {
  const [showHelp, setShowHelp] = useState(false);

  const onPress = useCallback(async () => {
    const contents = await FileImport_pickFile("csv");
    if (contents == null) {
      return;
    }
    props.dispatch(Thunk_importCsvData(contents));
  }, [props.dispatch]);

  // Safari shows its own "Paste" bubble on readText, and only inside a tap handler.
  const onPaste = useCallback(async () => {
    const text =
      Platform.OS === "web"
        ? await navigator.clipboard?.readText().catch(() => undefined)
        : await ClipboardUtils_paste().catch(() => undefined);
    const csv = text != null ? CsvFromChat_extract(text) : undefined;
    if (csv == null) {
      Dialog_alert("The clipboard is empty. Copy the CSV block from the AI chat first.");
      return;
    }
    props.dispatch(Thunk_importCsvData(csv));
  }, [props.dispatch]);

  return (
    <>
      {Platform.OS === "web" && (
        <MenuItemWrapper name="Paste history from clipboard" onClick={onPaste}>
          <View className="py-3">
            <Text className="text-base text-text-primary">Paste history from clipboard</Text>
            <Text className="text-xs text-text-secondary">For workout history an AI chat turned into CSV.</Text>
          </View>
        </MenuItemWrapper>
      )}
      <MenuItemWrapper name="Import CSV">
        <View className="py-1">
          <View className="flex-row">
            <View className="flex-1">
              <Pressable className="py-2" onPress={onPress}>
                <Text className="text-base text-text-primary">Import history from CSV file</Text>
              </Pressable>
            </View>
            <View className="items-center justify-center ml-2">
              <Pressable className="p-2" onPress={() => setShowHelp(!showHelp)}>
                <IconHelp />
              </Pressable>
            </View>
          </View>
          {showHelp && (
            <View>
              <InternalLink
                name="download-example-csv"
                href="/liftosaur_example_csv.zip"
                className="text-xs text-center font-bold underline text-text-link"
              >
                Download an example and instructions how to format a CSV file.
              </InternalLink>
            </View>
          )}
        </View>
      </MenuItemWrapper>
    </>
  );
}
