import * as Evolu from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { Schema, type RSSFeedId } from "./scheme.ts";
import { createUseEvolu } from "@evolu/react";

const service = "alcove";

// Initialize authentication
const authResult = await evoluReactWebDeps.localAuth.login(undefined, {
	service,
});

export const evolu = Evolu.createEvolu(evoluReactWebDeps)(Schema, {
	name: Evolu.SimpleName.orThrow(
		`${service}-${authResult?.owner?.id ?? "guest"}`,
	),
	reloadUrl: "/",
	encryptionKey: authResult?.owner?.encryptionKey,
	externalAppOwner: authResult?.owner,
	transports: [{ type: "WebSocket", url: import.meta.env.VITE_RELAY_URL }],
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
		.where("isDeleted", "is not", Evolu.sqliteTrue),
);

export const postsByFeedQuery = (feedId: string) =>
	evolu.createQuery((db) =>
		db
			.selectFrom("rssPost")
			.selectAll()
			.where("feedId", "=", feedId as RSSFeedId)
			.where("isDeleted", "is not", Evolu.sqliteTrue)
			.orderBy("id", "desc"),
	);

export const allPostsQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssPost")
		.selectAll()
		.where("isDeleted", "is not", Evolu.sqliteTrue)
		.orderBy("id", "desc"),
);

export const feedsByCategoryQuery = evolu.createQuery((db) =>
	db
		.selectFrom("rssFeed")
		.selectAll()
		.where("isDeleted", "is not", Evolu.sqliteTrue)
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
