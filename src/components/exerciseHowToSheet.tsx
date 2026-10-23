import { JSX } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { ExerciseImage } from "./exerciseImage";
import { ExerciseDemoPlayer } from "./exerciseDemoPlayer";
import { IExerciseType, ISettings } from "../types";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import { ExerciseDemos_find } from "../models/exerciseDemos";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  exerciseType: IExerciseType;
  settings: ISettings;
  onClose: () => void;
}

function TipList(props: { title: string; items: string[]; testID: string }): JSX.Element {
  return (
    <View className="mt-4" testID={props.testID} data-testid={props.testID}>
      <Text className="text-base font-bold">{props.title}</Text>
      {props.items.map((item) => (
        <View key={item} className="flex-row mt-1.5">
          <Text className="w-5 text-base">•</Text>
          <Text className="flex-1 text-base">{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ExerciseHowToSheet(props: IProps): JSX.Element {
  const exercise = Exercise_get(props.exerciseType, props.settings.exercises);
  const name = Exercise_nameWithEquipment(exercise, props.settings);
  const lookup = ExerciseDemos_find(props.exerciseType, props.settings.exercises);
  const still = <ExerciseImage exerciseType={props.exerciseType} size="large" settings={props.settings} />;

  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <View className="justify-end flex-1" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
        <Pressable className="flex-1" onPress={props.onClose} accessibilityLabel="Close" />
        <SafeAreaView
          edges={["bottom"]}
          style={{ maxHeight: "90%", backgroundColor: Tailwind_semantic().background.default }}
        >
          <ScrollView contentContainerClassName="px-5 pt-5 pb-4" testID="exercise-how-to-sheet">
            <Text className="text-2xl font-bold" accessibilityRole="header">
              {name}
            </Text>
            <View className="mt-3">
              {lookup.kind === "demo" ? (
                <ExerciseDemoPlayer
                  name={name}
                  demoKey={lookup.key}
                  url={lookup.url}
                  media={lookup.media}
                  fallback={
                    <View>
                      {still}
                      <Text className="mt-2 text-sm text-text-secondary">
                        The demo could not load. Open it once with a connection and it works offline after that.
                      </Text>
                    </View>
                  }
                />
              ) : (
                <View testID="exercise-demo-missing" data-testid="exercise-demo-missing">
                  {still}
                  <Text className="mt-2 text-sm text-text-secondary">{lookup.message}</Text>
                </View>
              )}
            </View>
            {lookup.kind === "demo" && (
              <>
                <TipList title="How to do it" items={lookup.tips.cues} testID="exercise-how-to-cues" />
                <TipList title="Common mistakes" items={lookup.tips.mistakes} testID="exercise-how-to-mistakes" />
              </>
            )}
            <Pressable
              onPress={props.onClose}
              accessibilityRole="button"
              className="items-center py-4 mt-6 rounded-full bg-background-subtle"
              testID="exercise-how-to-close"
              data-testid="exercise-how-to-close"
            >
              <Text className="text-base font-semibold">Close</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
