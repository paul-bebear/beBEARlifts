import { Image } from "react-native";
import { HostConfig_resolveUrl } from "./hostConfig";

const bundled: Record<string, number> = {
  "/images/bear/male/levelup-02.webp": require("../../images/bear/male/levelup-02.webp"),
  "/images/bear/male/levelup-03.webp": require("../../images/bear/male/levelup-03.webp"),
  "/images/bear/male/levelup-04.webp": require("../../images/bear/male/levelup-04.webp"),
  "/images/bear/male/levelup-05.webp": require("../../images/bear/male/levelup-05.webp"),
  "/images/bear/male/levelup-06.webp": require("../../images/bear/male/levelup-06.webp"),
  "/images/bear/male/levelup-07.webp": require("../../images/bear/male/levelup-07.webp"),
  "/images/bear/male/levelup-08.webp": require("../../images/bear/male/levelup-08.webp"),
  "/images/bear/male/levelup-09.webp": require("../../images/bear/male/levelup-09.webp"),
  "/images/bear/male/levelup-10.webp": require("../../images/bear/male/levelup-10.webp"),
  "/images/bear/male/levelup-11.webp": require("../../images/bear/male/levelup-11.webp"),
  "/images/bear/male/levelup-12.webp": require("../../images/bear/male/levelup-12.webp"),
  "/images/bear/female/levelup-02.webp": require("../../images/bear/female/levelup-02.webp"),
  "/images/bear/female/levelup-03.webp": require("../../images/bear/female/levelup-03.webp"),
  "/images/bear/female/levelup-04.webp": require("../../images/bear/female/levelup-04.webp"),
  "/images/bear/female/levelup-05.webp": require("../../images/bear/female/levelup-05.webp"),
  "/images/bear/female/levelup-06.webp": require("../../images/bear/female/levelup-06.webp"),
  "/images/bear/female/levelup-07.webp": require("../../images/bear/female/levelup-07.webp"),
  "/images/bear/female/levelup-08.webp": require("../../images/bear/female/levelup-08.webp"),
  "/images/bear/female/levelup-09.webp": require("../../images/bear/female/levelup-09.webp"),
  "/images/bear/female/levelup-10.webp": require("../../images/bear/female/levelup-10.webp"),
  "/images/bear/female/levelup-11.webp": require("../../images/bear/female/levelup-11.webp"),
  "/images/bear/female/levelup-12.webp": require("../../images/bear/female/levelup-12.webp"),
};

export function LevelUpImage_uri(path: string): string {
  const asset = bundled[path];
  return asset != null ? Image.resolveAssetSource(asset).uri : HostConfig_resolveUrl(path);
}
