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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEvolu } from "@/lib/evolu";
import {
	fetchFeedWithFallback,
	parseFeedXml,
	discoverFeed,
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
	existingCategories: string[];
}

export function AddFeedDialog({
	open,
	onOpenChange,
	existingCategories,
}: AddFeedDialogProps) {
	const [urlInput, setUrlInput] = React.useState("");
	const [mode, setMode] = React.useState<"existing" | "new">("existing");
	const [selectedCategory, setSelectedCategory] = React.useState<string>("");
	const [newCategory, setNewCategory] = React.useState("");
	const [isAddingFeed, setIsAddingFeed] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState("");

	const evolu = useEvolu();

	React.useEffect(() => {
		if (open) {
			setUrlInput("");
			setMode("existing");
			setSelectedCategory("");
			setNewCategory("");
			setStatusMessage("");
		}
	}, [open]);

	async function addFeed() {
		if (!urlInput.trim()) {
			setStatusMessage("Please enter a URL");
			return;
		}

		setIsAddingFeed(true);
		setStatusMessage("");

		try {
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
			} else {
				// First, try to fetch the URL directly as a feed
				setStatusMessage("Checking URL...");
				try {
					if (urlInput.includes("substack.com")) {
						const parts = urlInput.split("/");
						console.log(parts);
						const newUrl = `https://${parts[3].slice(1)}.${parts[2]}/feed`;
						console.log(newUrl);
						xmlData = await fetchFeedWithFallback(newUrl);
						// Try to parse it to see if it's a valid feed
						parseFeedXml(xmlData);
						// If parsing succeeds, it's a valid feed
						feedUrl = urlInput;
					} else {
						xmlData = await fetchFeedWithFallback(urlInput);
						// Try to parse it to see if it's a valid feed
						parseFeedXml(xmlData);
						// If parsing succeeds, it's a valid feed
						feedUrl = urlInput;
					}
				} catch {
					// If direct fetch/parse fails, try feed discovery
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
				}
			}

			const { feedData, posts, isAtom } = parseFeedXml(xmlData);

			// Sanitize feed data to meet schema constraints
			const sanitizedFeed = sanitizeFeedData(feedData);

			// Determine the final category value
			let finalCategory: string | null = null;
			if (mode === "new") {
				finalCategory = newCategory.trim() || null;
			} else {
				if (selectedCategory && selectedCategory !== "uncategorized") {
					finalCategory = selectedCategory;
				}
			}

			const result = evolu.insert("rssFeed", {
				feedUrl: feedUrl,
				title: sanitizedFeed.title,
				description: sanitizedFeed.description || null,
				category: finalCategory as any,
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
					publishedDate: extractPostDate(post, isAtom),
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
						<Label>Category</Label>
						<div className="flex gap-2">
							<Button
								type="button"
								variant={mode === "existing" ? "default" : "outline"}
								onClick={() => setMode("existing")}
								className="flex-1"
								disabled={isAddingFeed}
							>
								Existing
							</Button>
							<Button
								type="button"
								variant={mode === "new" ? "default" : "outline"}
								onClick={() => setMode("new")}
								className="flex-1"
								disabled={isAddingFeed}
							>
								New
							</Button>
						</div>
					</div>

					{mode === "existing" ? (
						<div className="grid gap-2">
							<Label htmlFor="category-select">Select Category</Label>
							<Select
								value={selectedCategory}
								onValueChange={setSelectedCategory}
								disabled={isAddingFeed}
							>
								<SelectTrigger id="category-select">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="uncategorized">Uncategorized</SelectItem>
									{existingCategories.map((cat) => (
										<SelectItem key={cat} value={cat}>
											{cat}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : (
						<div className="grid gap-2">
							<Label htmlFor="new-category">New Category Name</Label>
							<Input
								id="new-category"
								value={newCategory}
								onChange={(e) => setNewCategory(e.target.value)}
								placeholder="Enter category name"
								maxLength={50}
								disabled={isAddingFeed}
							/>
						</div>
					)}

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
