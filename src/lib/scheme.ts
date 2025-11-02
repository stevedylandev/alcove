import {
	id,
	maxLength,
	NonEmptyString,
	NonEmptyString1000,
	nullOr,
	SqliteBoolean,
} from "@evolu/common";

// RSS Feed ID
const RSSFeedId = id("RSSFeed");
type RSSFeedId = typeof RSSFeedId.Type;

// RSS Post ID
const RSSPostId = id("RSSPost");
type RSSPostId = typeof RSSPostId.Type;

// Custom branded types for string length constraints
const NonEmptyString50 = maxLength(50)(NonEmptyString);
type NonEmptyString50 = typeof NonEmptyString50.Type;

const NonEmptyString200 = maxLength(200)(NonEmptyString);
type NonEmptyString200 = typeof NonEmptyString200.Type;

export const Schema = {
	rssFeed: {
		id: RSSFeedId,
		feedUrl: NonEmptyString1000,
		title: NonEmptyString200,
		description: nullOr(NonEmptyString1000),
		category: nullOr(NonEmptyString50),
		dateUpdated: nullOr(NonEmptyString),
	},
	rssPost: {
		id: RSSPostId,
		feedId: RSSFeedId,
		title: NonEmptyString1000,
		link: NonEmptyString1000,
		content: nullOr(NonEmptyString),
		author: nullOr(NonEmptyString200),
		publishedDate: nullOr(NonEmptyString),
	},
	readStatus: {
		id: id("ReadStatus"),
		feedId: RSSFeedId,
		postId: RSSPostId,
		isRead: SqliteBoolean,
	},
	userPreferences: {
		id: id("UserPreferences"),
		theme: nullOr(NonEmptyString50), // Will store "light" or "dark"
		refreshInterval: nullOr(NonEmptyString50), // Will store number as string
		postsPerPage: nullOr(NonEmptyString50), // Will store number as string
	},
};
