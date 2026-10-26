import { JSX, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { PhotoSourceMenu } from "./photoSourceMenu";
import { useNavOptions } from "../navigation/useNavOptions";
import {
  ProgressPhotos_base64,
  ProgressPhotos_fullMessage,
  ProgressPhotos_isFull,
  ProgressPhotos_nextId,
  ProgressPhotos_uri,
} from "../models/progressPhotos";
import { ProgressHub_formatDate } from "../models/progressHub";
import { ProgressPhotoStore } from "../utils/progressPhotoStore";
import { ProgressPhotoPick_pick } from "../utils/progressPhotoPick";
import { ProgressPhotoFiles_delete, ProgressPhotoFiles_dir, ProgressPhotoFiles_put } from "../utils/progressPhotoFiles";
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
    const id = ProgressPhotos_nextId(ProgressPhotoStore.get(), takenAt);
    const base64 = ProgressPhotos_base64(dataUrl);
    const added = base64 != null && (await ProgressPhotoFiles_put(id, takenAt, base64).catch(() => false));
    if (added) {
      setSelectedId(undefined);
    } else {
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
      await ProgressPhotoFiles_delete(id);
      setSelectedId(undefined);
    }
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="progress-photos" data-testid="progress-photos">
      <Text className="mb-3 text-sm text-text-secondary">
        Take one every 2 to 4 weeks, in the same light and pose. When you are signed in, the cloud backup keeps them
        too.
      </Text>
      <PhotoSourceMenu
        title="Add a progress photo"
        testIDPrefix="progress-photos"
        onPick={add}
        renderTrigger={(open) => (
          <View className="flex-row mb-4">
            <Button name="progress-photos-add" kind="pill" className="flex-1" disabled={isBusy} onPress={open}>
              {isBusy ? "Saving…" : "Add photo"}
            </Button>
          </View>
        )}
      />
      {selected == null ? (
        <Text className="text-sm text-text-secondary">No photos yet.</Text>
      ) : (
        <View className="mb-4">
          <Image
            source={{ uri: ProgressPhotos_uri(selected, ProgressPhotoFiles_dir) }}
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
            <Image
              source={{ uri: ProgressPhotos_uri(photo, ProgressPhotoFiles_dir) }}
              style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 8 }}
            />
            <Text className="mt-0.5 text-xs text-center text-text-secondary">
              {ProgressHub_formatDate(photo.timestamp, now)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
