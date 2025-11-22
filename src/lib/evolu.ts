import * as Evolu from "@evolu/common";
import { createUseEvolu } from "@evolu/react";
import { evoluReactWebDeps } from "@evolu/react-web";
import { Schema, type RSSFeedId } from "./scheme.ts";

// Create Evolu instance for the React web platform
export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
	name: Evolu.SimpleName.orThrow("alcove"),
	reloadUrl: "/",
	transports: [
		{
			type: "WebSocket",
			url: "wss://relay.alcove.tools",
		},
		{
			type: "WebSocket",
			url: "wss://relay2.alcove.tools",
		},
		//	{ type: "WebSocket" as const, url: "ws://localhost:4000" },
	],
});

export const useEvolu = createUseEvolu(evolu);

/**
 * Subscribe to unexpected Evolu errors (database, network, sync issues).
 */
evolu.subscribeError(() => {
	const error = evolu.getError();
	if (!error) return;

	console.error("Evolu error:", error);
});

export const allFeedsQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssFeed")
		.selectAll()
		.where("isDeleted", "is not", Evolu.sqliteTrue)
		// Filter out null titles and feedUrls (required fields)
		.where("title", "is not", null)
		.where("feedUrl", "is not", null)
		.$narrowType<{
			title: Evolu.kysely.NotNull;
			feedUrl: Evolu.kysely.NotNull;
		}>()
		.orderBy("createdAt"),
);

export const postsByFeedQuery = (feedId: string) =>
	evolu.createQuery((db) =>
		db
			.selectFrom("rssPost")
			.selectAll()
			.where("feedId", "=", feedId as RSSFeedId)
			.where("isDeleted", "is not", Evolu.sqliteTrue)
			// Filter out null required fields
			.where("title", "is not", null)
			.where("link", "is not", null)
			.$narrowType<{
				title: Evolu.kysely.NotNull;
				link: Evolu.kysely.NotNull;
			}>()
			.orderBy("id", "desc"),
	);

export const allPostsQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssPost")
		.selectAll()
		.where("isDeleted", "is not", Evolu.sqliteTrue)
		// Filter out null required fields
		.where("title", "is not", null)
		.where("link", "is not", null)
		.$narrowType<{
			title: Evolu.kysely.NotNull;
			link: Evolu.kysely.NotNull;
		}>()
		.orderBy("id", "desc"),
);

export const feedsByCategoryQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssFeed")
		.selectAll()
		.where("isDeleted", "is not", Evolu.sqliteTrue)
		// Filter out null required fields
		.where("title", "is not", null)
		.where("feedUrl", "is not", null)
		.$narrowType<{
			title: Evolu.kysely.NotNull;
			feedUrl: Evolu.kysely.NotNull;
		}>()
		.orderBy("category", "asc"),
);

export const allReadStatusesQuery = evolu.createQuery((db) =>
	db.selectFrom("readStatus").selectAll().where("isRead", "=", 1),
);

export const allReadStatusesWithUnreadQuery = evolu.createQuery((db) =>
	db.selectFrom("readStatus").selectAll(),
);

export function reset() {
	void evolu.resetAppOwner({ reload: true });
}
