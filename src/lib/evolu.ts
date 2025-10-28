import { createEvolu, getOrThrow, SimpleName } from "@evolu/common";
import { evoluReactWebDeps } from "@evolu/react-web";
import { Schema } from "./scheme.ts";
import { createUseEvolu } from "@evolu/react";

export const evolu = createEvolu(evoluReactWebDeps)(Schema, {
	name: getOrThrow(SimpleName.from("alcove")),
	syncUrl: "http://localhost:4000", // optional, defaults to wss://free.evoluhq.com
	reloadUrl: "/",
});

export const useEvolu = createUseEvolu(evolu);

export const allFeedsQuery = evolu.createQuery((db) =>
	db.selectFrom("rssFeed").selectAll(),
);

export const postsByFeedQuery = (feedId: string) =>
	evolu.createQuery((db) =>
		db
			.selectFrom("rssPost")
			.selectAll()
			.where("feedId", "=", feedId as any)
			.orderBy("id", "desc"),
	);

export const allPostsQuery = evolu.createQuery((db) =>
	db.selectFrom("rssPost").selectAll().orderBy("id", "desc"),
);

export const feedsByCategoryQuery = evolu.createQuery((db) =>
	db.selectFrom("rssFeed").selectAll().orderBy("category", "asc"),
);

export function reset() {
	evolu.resetAppOwner();
}
