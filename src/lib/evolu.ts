import { evoluReactWebDeps } from "@evolu/react-web";
import { Schema, type RSSFeedId } from "./scheme.ts";
import { createUseEvolu } from "@evolu/react";
import { createEvolu, SimpleName, sqliteTrue } from "@evolu/common";

export const evolu = createEvolu(evoluReactWebDeps)(Schema, {
	name: SimpleName.orThrow("alcove"),
	reloadUrl: "/",
	transports: [
		{
			type: "WebSocket",
			url: "wss://relay.alcove.tools",
		},
		// {
		// 	type: "WebSocket",
		// 	url: "ws://localhost:4000",
		// },
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
	db.selectFrom("rssFeed").selectAll().where("isDeleted", "is not", sqliteTrue),
);

export const postsByFeedQuery = (feedId: string) =>
	evolu.createQuery((db) =>
		db
			.selectFrom("rssPost")
			.selectAll()
			.where("feedId", "=", feedId as RSSFeedId)
			.where("isDeleted", "is not", sqliteTrue)
			.orderBy("id", "desc"),
	);

export const allPostsQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssPost")
		.selectAll()
		.where("isDeleted", "is not", sqliteTrue)
		.orderBy("id", "desc"),
);

export const feedsByCategoryQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssFeed")
		.selectAll()
		.where("isDeleted", "is not", sqliteTrue)
		.orderBy("category", "asc"),
);

export const allReadStatusesQuery = evolu.createQuery((db) =>
	db.selectFrom("readStatus").selectAll().where("isRead", "=", 1),
);

export const allReadStatusesWithUnreadQuery = evolu.createQuery((db) =>
	db.selectFrom("readStatus").selectAll(),
);

export function reset() {
	evolu.resetAppOwner();
}
