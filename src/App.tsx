import Dashboard from "./components/dashboard";
import { useQuery } from "@evolu/react";
import { allFeedsQuery, useEvolu } from "@/lib/evolu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as React from "react";
import { toast } from "sonner";
import {
	fetchFeedWithFallback,
	parseFeedXml,
	discoverFeed,
	looksLikeFeedUrl,
	extractPostLink,
	extractPostAuthor,
	extractPostContent,
	extractPostDate,
} from "@/lib/feed-operations";

function App() {
	const allFeeds = useQuery(allFeedsQuery);
	const hasFeeds = allFeeds.length > 0;
	const [urlInput, setUrlInput] = React.useState("");
	const [isAddingFeed, setIsAddingFeed] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState("");

	const evolu = useEvolu();

	async function addFeed() {
		if (!urlInput.trim()) {
			setErrorMessage("Please enter a URL");
			return;
		}

		setIsAddingFeed(true);
		setErrorMessage("");

		try {
			let feedUrl = urlInput;
			let xmlData: string | null = null;

			if (!looksLikeFeedUrl(urlInput)) {
				const discovered = await discoverFeed(urlInput);

				if (!discovered) {
					setErrorMessage(
						"Could not find an RSS feed at this URL. Please enter a direct feed URL.",
					);
					setIsAddingFeed(false);
					return;
				}

				feedUrl = discovered.feedUrl;
				xmlData = discovered.xmlData;
			} else {
				xmlData = await fetchFeedWithFallback(feedUrl);
			}

			const { feedData, posts, isAtom } = parseFeedXml(xmlData);

			const result = evolu.insert("rssFeed", {
				feedUrl: feedUrl,
				title: feedData.title,
				description: feedData.description || feedData.subtitle || "",
				category: "Uncategorized",
				dateUpdated: new Date().toISOString(),
			});

			if (!result.ok) {
				throw new Error("Failed to insert feed");
			}

			for (const post of posts) {
				evolu.insert("rssPost", {
					title: post.title,
					author: extractPostAuthor(post, isAtom, feedData.title),
					publishedDate: extractPostDate(post),
					link: extractPostLink(post, isAtom),
					feedId: result.value.id,
					content: extractPostContent(post),
				});
			}

			toast.success(
				`Successfully added "${feedData.title}" with ${posts.length} post${posts.length !== 1 ? "s" : ""}`,
			);

			setUrlInput("");
			setErrorMessage("");
		} catch (error) {
			console.error("Error adding feed:", error);
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to add feed. Please check the URL and try again.",
			);
		} finally {
			setIsAddingFeed(false);
		}
	}

	return (
		<main className="min-h-screen w-full items-center justify-center flex-col flex gap-2">
			{hasFeeds ? (
				<Dashboard />
			) : (
				<div className="flex flex-col items-start justify-center gap-6 max-w-md w-full px-4">
					<div className="flex flex-col gap-2">
						<h1 className="text-4xl font-bold">Alcove</h1>
						<h4 className="sm:text-sm text-xs">
							A privacy focused RSS reader for the open web
						</h4>
					</div>
					<div className="flex flex-col gap-3 w-full">
						<div className="flex flex-row gap-3 w-full">
							<Input
								value={urlInput}
								onChange={(e) => setUrlInput(e.target.value)}
								placeholder="https://example.com"
								disabled={isAddingFeed}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										addFeed();
									}
								}}
							/>
							<Button onClick={addFeed} disabled={isAddingFeed} size="lg">
								{isAddingFeed ? "Adding..." : "Add Feed"}
							</Button>
						</div>
						{errorMessage && (
							<div className="text-sm text-center text-destructive">
								{errorMessage}
							</div>
						)}
					</div>
				</div>
			)}
		</main>
	);
}

export default App;
