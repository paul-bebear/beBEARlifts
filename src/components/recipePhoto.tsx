import { JSX, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "./primitives/text";
import { ICatalogRecipe } from "../models/recipeCatalog";
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
  const [src, setSrc] = useState(remote ? ImageCache_initialUri(remote) : undefined);
  const [isError, setIsError] = useState(false);
  if (remote == null || src == null || isError) {
    return <Placeholder title={props.recipe.title} height={props.height} />;
  }
  return (
    <View>
      <Image
        source={{ uri: src }}
        resizeMode="cover"
        className="rounded-2xl"
        style={{ width: "100%", height: props.height }}
        accessibilityLabel={`${props.recipe.title}, ${props.recipe.photo?.credit}`}
        onLoad={() => {
          if (src === remote) {
            ImageCache_download(remote);
          }
        }}
        onError={() => {
          if (src !== remote) {
            ImageCache_markMissing(remote);
            setSrc(remote);
          } else {
            setIsError(true);
          }
        }}
      />
      {props.showCredit && <Text className="mt-1 text-xs text-text-secondary">{props.recipe.photo?.credit}</Text>}
    </View>
  );
}
