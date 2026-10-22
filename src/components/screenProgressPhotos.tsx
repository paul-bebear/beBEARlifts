import { JSX, useState } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { ActionMenu } from "./actionMenu";
import { useNavOptions } from "../navigation/useNavOptions";
import {
  ProgressPhotos_add,
  ProgressPhotos_fullMessage,
  ProgressPhotos_isFull,
  ProgressPhotos_remove,
  ProgressPhotos_removeTakenAt,
} from "../models/progressPhotos";
import { ProgressHub_formatDate } from "../models/progressHub";
import { ProgressPhotoStore } from "../utils/progressPhotoStore";
import { ProgressPhotoPick_pick } from "../utils/progressPhotoPick";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";

export function ScreenProgressPhotos(): JSX.Element {
  const log = ProgressPhotoStore.use();
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const selected = log.photos.find((p) => p.id === selectedId) ?? log.photos[0];
  const now = Date.now();

  useNavOptions({ navTitle: "Progress photos" });

  const save = async (dataUrl: string): Promise<void> => {
    const takenAt = Date.now();
    try {
      await ProgressPhotoStore.update((l) => ProgressPhotos_add(l, dataUrl, takenAt));
      setSelectedId(undefined);
    } catch (e) {
      await ProgressPhotoStore.update((l) => ProgressPhotos_removeTakenAt(l, takenAt)).catch(() => undefined);
      Dialog_alert("The photo could not be saved. The phone may be out of space.");
    }
  };

  const add = async (source: "camera" | "photo-library"): Promise<void> => {
    if (ProgressPhotos_isFull(log)) {
      Dialog_alert(ProgressPhotos_fullMessage);
      return;
    }
    setIsBusy(true);
    try {
      const dataUrl = await ProgressPhotoPick_pick(source);
      if (dataUrl != null) {
        await save(dataUrl);
      }
    } catch (e) {
      Dialog_alert(e instanceof Error ? e.message : "The photo could not be read.");
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async (id: number): Promise<void> => {
    if (await Dialog_confirm("Delete this photo?")) {
      await ProgressPhotoStore.update((l) => ProgressPhotos_remove(l, id));
      setSelectedId(undefined);
    }
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="progress-photos" data-testid="progress-photos">
      <Text className="mb-3 text-sm text-text-secondary">
        Take one every 2 to 4 weeks, in the same light and pose. Photos stay on this phone and are not in backups.
      </Text>
      {Platform.OS === "web" ? (
        <View className="flex-row mb-4">
          <Button
            name="progress-photos-add"
            kind="pill"
            className="flex-1"
            disabled={isBusy}
            onPress={() => add("photo-library")}
          >
            {isBusy ? "Saving…" : "Add photo"}
          </Button>
        </View>
      ) : (
        <ActionMenu
          title="Add a progress photo"
          actions={[
            { label: "Take photo", onPress: () => add("camera"), testID: "progress-photos-camera" },
            { label: "Choose from library", onPress: () => add("photo-library"), testID: "progress-photos-library" },
          ]}
          renderTrigger={(open) => (
            <View className="flex-row mb-4">
              <Button name="progress-photos-add" kind="pill" className="flex-1" disabled={isBusy} onPress={open}>
                {isBusy ? "Saving…" : "Add photo"}
              </Button>
            </View>
          )}
        />
      )}
      {selected == null ? (
        <Text className="text-sm text-text-secondary">No photos yet.</Text>
      ) : (
        <View className="mb-4">
          <Image
            source={{ uri: selected.dataUrl }}
            style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 16 }}
            resizeMode="cover"
          />
          <View className="flex-row items-center mt-2">
            <Text className="flex-1 text-base font-semibold">{ProgressHub_formatDate(selected.timestamp, now)}</Text>
            <Pressable
              testID="progress-photos-delete"
              data-testid="progress-photos-delete"
              onPress={() => remove(selected.id)}
            >
              <Text className="text-sm text-text-error">Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {log.photos.map((photo) => (
          <Pressable
            key={photo.id}
            testID="progress-photos-thumb"
            data-testid="progress-photos-thumb"
            onPress={() => setSelectedId(photo.id)}
            style={{ width: "23%", opacity: photo.id === selected?.id ? 1 : 0.75 }}
          >
            <Image source={{ uri: photo.dataUrl }} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 8 }} />
            <Text className="mt-0.5 text-xs text-center text-text-secondary">
              {ProgressHub_formatDate(photo.timestamp, now)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
