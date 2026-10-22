import { JSX, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import {
  IJournalExportFormat,
  IJournalExportRange,
  IJournalExportSources,
  JournalExport_formats,
  JournalExport_output,
  JournalExport_ranges,
} from "../models/journalExport";
import { Exporter_toFile, Exporter_toZip } from "../utils/exporter";

export function JournalExportSheet(props: { sources: IJournalExportSources; onClose: () => void }): JSX.Element {
  const [range, setRange] = useState<IJournalExportRange>("today");
  const [format, setFormat] = useState<IJournalExportFormat>("markdown");
  const exportFile = (): void => {
    const output = JournalExport_output(props.sources, range, format);
    if (output.kind === "zip") {
      Exporter_toZip(output.filename, output.files);
    } else {
      Exporter_toFile(output.filename, output.text);
    }
  };
  return (
    <Modal transparent={true} animationType="slide" onRequestClose={props.onClose}>
      <View className="justify-end flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <Pressable
          accessibilityLabel="Close export"
          accessibilityRole="button"
          className="flex-1"
          onPress={props.onClose}
        />
        <ScrollView style={{ maxHeight: "85%" }} contentContainerStyle={{ flexGrow: 1 }}>
          <View
            className="p-6 pb-10 rounded-t-2xl bg-background-default"
            accessibilityViewIsModal={true}
            testID="journal-export-sheet"
            style={{ gap: 12 }}
          >
            <Text className="text-xl font-bold">Export</Text>
            <Text className="text-base font-semibold">Range</Text>
            {JournalExport_ranges.map((choice) => (
              <Pressable
                key={choice.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: range === choice.value }}
                onPress={() => setRange(choice.value)}
                className="py-2"
                testID={`journal-export-range-${choice.value}`}
              >
                <Text className="text-base">
                  {range === choice.value ? "●" : "○"} {choice.label}
                </Text>
              </Pressable>
            ))}
            <Text className="text-base font-semibold">Format</Text>
            {JournalExport_formats.map((choice) => (
              <Pressable
                key={choice.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: format === choice.value }}
                onPress={() => setFormat(choice.value)}
                className="py-2"
                testID={`journal-export-format-${choice.value}`}
              >
                <Text className="text-base">
                  {format === choice.value ? "●" : "○"} {choice.label}
                </Text>
              </Pressable>
            ))}
            <Button name="journal-export-save" kind="pill" onPress={exportFile}>
              Export
            </Button>
            <Button name="journal-export-close" kind="pill-outline" onPress={props.onClose}>
              Close
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
