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
	extractPostContent,
	extractPostDate,
	sanitizeFeedData,
	sanitizePostData,
	isYouTubeUrl,
	convertYouTubeUrlToFeed,
} from "@/lib/feed-operations";
import { formatTypeError } from "@/lib/format-error";

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

			// Check if it's a YouTube URL and convert it
			if (isYouTubeUrl(urlInput)) {
				setStatusMessage("Detecting YouTube channel...");
				const youtubeFeedUrl = await convertYouTubeUrlToFeed(urlInput);

				if (!youtubeFeedUrl) {
					setStatusMessage(
						"Could not extract YouTube channel ID. Please try a direct channel URL.",
					);
					setIsAddingFeed(false);
					return;
				}

				feedUrl = youtubeFeedUrl;
				xmlData = await fetchFeedWithFallback(feedUrl);
			} else if (!looksLikeFeedUrl(urlInput)) {
				setStatusMessage("Discovering RSS feed...");
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

			// Sanitize feed data to meet schema constraints
			const sanitizedFeed = sanitizeFeedData(feedData);

			const result = evolu.insert("rssFeed", {
				feedUrl: feedUrl,
				title: sanitizedFeed.title,
				description: sanitizedFeed.description || null,
				category: categoryInput || "Uncategorized",
				dateUpdated: new Date().toISOString(),
			});

			if (!result.ok) {
				throw new Error(formatTypeError(result.error));
			}

			// Process posts/entries
			for (const post of posts) {
				// Sanitize post data to meet schema constraints
				const sanitizedPost = sanitizePostData(post, isAtom, feedData.title);

				const postResult = evolu.insert("rssPost", {
					title: sanitizedPost.title,
					author: sanitizedPost.author || null,
					feedTitle: sanitizedFeed.title,
					publishedDate: extractPostDate(post),
					link: sanitizedPost.link,
					feedId: result.value.id,
					content: extractPostContent(post, sanitizedPost.link),
				});

				if (!postResult.ok) {
					console.warn(
						"Failed to insert post:",
						formatTypeError(postResult.error),
					);
				}
			}

			toast.success(
				`Successfully added "${feedData.title}" with ${posts.length} post${posts.length !== 1 ? "s" : ""}`,
			);

			setUrlInput("");
			setCategoryInput("");
			setStatusMessage("");
			onOpenChange(false);
		} catch (error) {
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
