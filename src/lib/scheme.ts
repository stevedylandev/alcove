import * as Evolu from "@evolu/common";

// RSS Feed ID
const RSSFeedId = Evolu.id("RSSFeed");
export type RSSFeedId = typeof RSSFeedId.Type;

// RSS Post ID
const RSSPostId = Evolu.id("RSSPost");
export type RSSPostId = typeof RSSPostId.Type;

// Custom branded types for string length constraints
const NonEmptyString50 = Evolu.maxLength(50)(Evolu.NonEmptyString);
const NonEmptyString200 = Evolu.maxLength(200)(Evolu.NonEmptyString);

export const Schema = {
	rssFeed: {
		id: RSSFeedId,
		feedUrl: Evolu.NonEmptyString1000,
		title: NonEmptyString200,
		description: Evolu.nullOr(Evolu.NonEmptyString1000),
		category: Evolu.nullOr(NonEmptyString50),
		dateUpdated: Evolu.nullOr(Evolu.NonEmptyString),
	},
	rssPost: {
		id: RSSPostId,
		feedId: RSSFeedId,
		title: Evolu.NonEmptyString1000,
		link: Evolu.NonEmptyString1000,
		content: Evolu.nullOr(Evolu.NonEmptyString),
		author: Evolu.nullOr(NonEmptyString200),
		feedTitle: Evolu.nullOr(NonEmptyString200),
		publishedDate: Evolu.nullOr(Evolu.NonEmptyString),
	},
	readStatus: {
		id: Evolu.id("ReadStatus"),
		feedId: RSSFeedId,
		postId: RSSPostId,
		isRead: Evolu.nullOr(Evolu.Number), // 0 for false, 1 for true
	},
	userPreferences: {
		id: Evolu.id("UserPreferences"),
		theme: Evolu.nullOr(NonEmptyString50), // Will store "light" or "dark"
		refreshInterval: Evolu.nullOr(NonEmptyString50), // Will store number as string
		postsPerPage: Evolu.nullOr(NonEmptyString50), // Will store number as string
	},
};
