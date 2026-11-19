import { JSX, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./primitives/text";
import { ICatalogRecipe } from "../models/recipeCatalog";
import {
  RecipePhoto_failed,
  RecipePhoto_initial,
  RecipePhoto_shouldDownload,
  RecipePhoto_showsPlaceholder,
} from "../models/foodDayPage";
import { HostConfig_resolveUrl } from "../utils/hostConfig";
import { ImageCache_download, ImageCache_initialUri, ImageCache_markMissing } from "../utils/imageCache";

interface IProps {
  recipe: ICatalogRecipe;
  height: number;
  showCredit?: boolean;
}

function Placeholder(props: { title: string; height: number }): JSX.Element {
  return (
    <View
      className="items-center justify-center px-4 rounded-2xl bg-background-neutral"
      style={{ height: props.height }}
      testID="recipe-photo-placeholder"
      data-testid="recipe-photo-placeholder"
    >
      <Text className="text-3xl font-bold text-text-secondary">{props.title.slice(0, 1)}</Text>
      <Text className="mt-1 text-xs text-text-secondary">No photo in the book</Text>
    </View>
  );
}

export function RecipePhoto(props: IProps): JSX.Element {
  const remote = props.recipe.photo ? HostConfig_resolveUrl(props.recipe.photo.path) : undefined;
  const [photo, setPhoto] = useState(() => RecipePhoto_initial(remote, ImageCache_initialUri));
  if (remote == null || photo.src == null || RecipePhoto_showsPlaceholder(photo, remote)) {
    return <Placeholder title={props.recipe.title} height={props.height} />;
  }
  return (
    <View>
      <Image
        source={{ uri: photo.src }}
        resizeMode="cover"
        className="rounded-2xl"
        style={{ width: "100%", height: props.height }}
        accessibilityLabel={`${props.recipe.title}, ${props.recipe.photo?.credit}`}
        onLoad={() => {
          if (RecipePhoto_shouldDownload(photo, remote)) {
            ImageCache_download(remote);
          }
        }}
        onError={() => {
          const next = RecipePhoto_failed(photo, remote);
          if (next.marksMissing) {
            ImageCache_markMissing(remote);
          }
          setPhoto(next.state);
        }}
      />
      {props.showCredit && <Text className="mt-1 text-xs text-text-secondary">{props.recipe.photo?.credit}</Text>}
    </View>
  );
}
