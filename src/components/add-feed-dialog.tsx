import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEvolu } from "@/lib/evolu";
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

interface AddFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddFeedDialog({ open, onOpenChange }: AddFeedDialogProps) {
	const [urlInput, setUrlInput] = React.useState("");
	const [categoryInput, setCategoryInput] = React.useState("");
	const [isAddingFeed, setIsAddingFeed] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState("");

	const evolu = useEvolu();

	async function addFeed() {
		if (!urlInput.trim()) {
			setStatusMessage("Please enter a URL");
			return;
		}

		setIsAddingFeed(true);
		setStatusMessage("");

		try {
			// Try to discover feeds if the URL doesn't look like a direct feed URL
			let feedUrl = urlInput;
			let xmlData: string | null = null;

			if (!looksLikeFeedUrl(urlInput)) {
				const discovered = await discoverFeed(urlInput);

				if (!discovered) {
					setStatusMessage(
						"Could not find an RSS feed at this URL. Please enter a direct feed URL.",
					);
					setIsAddingFeed(false);
					return;
				}

				feedUrl = discovered.feedUrl;
				xmlData = discovered.xmlData;
			} else {
				// Direct feed URL - try to fetch it
				xmlData = await fetchFeedWithFallback(feedUrl);
			}

			const { feedData, posts, isAtom } = parseFeedXml(xmlData);

			const result = evolu.insert("rssFeed", {
				feedUrl: feedUrl,
				title: feedData.title,
				description: feedData.description || feedData.subtitle || "",
				category: categoryInput || "Uncategorized",
				dateUpdated: new Date().toISOString(),
			});

			if (!result.ok) {
				throw new Error("Failed to insert feed");
			}

			// Process posts/entries
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
			setCategoryInput("");
			setStatusMessage("");
			onOpenChange(false);
		} catch (error) {
			console.error("Error adding feed:", error);
			setStatusMessage(
				error instanceof Error
					? error.message
					: "Failed to add feed. Please check the URL and try again.",
			);
		} finally {
			setIsAddingFeed(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Feed</DialogTitle>
					<DialogDescription>
						Enter a website URL or direct RSS feed URL
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-3">
						<Label htmlFor="url-input">URL</Label>
						<Input
							id="url-input"
							name="url"
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
							placeholder="https://example.com"
							disabled={isAddingFeed}
						/>
						<p className="text-xs text-muted-foreground">
							We'll automatically discover the RSS feed for you
						</p>
					</div>
					<div className="grid gap-3">
						<Label htmlFor="category-input">Category</Label>
						<Input
							id="category-input"
							name="category"
							value={categoryInput}
							onChange={(e) => setCategoryInput(e.target.value)}
							placeholder="e.g., Tech, News, Blogs"
							disabled={isAddingFeed}
						/>
					</div>
					{statusMessage && (
						<div className="text-sm text-primary">{statusMessage}</div>
					)}
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={isAddingFeed}>
							Cancel
						</Button>
					</DialogClose>
					<Button onClick={addFeed} type="submit" disabled={isAddingFeed}>
						{isAddingFeed ? "Adding..." : "Submit"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
