import { FeedModeration_empty, FeedModeration_parse } from "../models/feedModeration";
import { JsonStore_create } from "./jsonStore";

export const BlocksStore = JsonStore_create("bebear_user_blocks", FeedModeration_parse, FeedModeration_empty);
