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
import { parseOPML } from "@/lib/opml";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileUp } from "lucide-react";
import { Mnemonic } from "@evolu/common";
import { LoadingScreen } from "@/components/loading-screen";

function App() {
	const allFeeds = useQuery(allFeedsQuery);
	const hasFeeds = allFeeds.length > 0;
	const [isInitialLoading, setIsInitialLoading] = React.useState(true);
	const [urlInput, setUrlInput] = React.useState("");
	const [isAddingFeed, setIsAddingFeed] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState("");
	const [isRestoreDialogOpen, setIsRestoreDialogOpen] = React.useState(false);
	const [restoreMnemonic, setRestoreMnemonic] = React.useState("");
	const [isImportingOPML, setIsImportingOPML] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const evolu = useEvolu();

	// Handle initial loading state
	React.useEffect(() => {
		// Add a small delay to prevent flash, then stop loading
		const timer = setTimeout(() => {
			setIsInitialLoading(false);
		}, 500);
		return () => clearTimeout(timer);
	}, []);

	function handleRestoreDialogOpenChange(open: boolean) {
		setIsRestoreDialogOpen(open);
		if (!open) {
			setRestoreMnemonic("");
		}
	}

	function handleRestore() {
		if (restoreMnemonic.trim()) {
			evolu.restoreAppOwner(restoreMnemonic as Mnemonic);
			setIsRestoreDialogOpen(false);
			setRestoreMnemonic("");
			toast.success("Account restored successfully");
		}
	}

	async function handleImportOPML(file: File) {
		setIsImportingOPML(true);
		const importToast = toast.loading("Reading OPML file...");

		try {
			const fileContent = await file.text();
			const opmlFeeds = parseOPML(fileContent);

			toast.loading(`Found ${opmlFeeds.length} feeds. Importing...`, {
				id: importToast,
			});

			let successCount = 0;
			let failCount = 0;

			for (let i = 0; i < opmlFeeds.length; i++) {
				const feed = opmlFeeds[i];
				toast.loading(
					`Importing feed ${i + 1}/${opmlFeeds.length}: ${feed.title}`,
					{ id: importToast },
				);

				try {
					const xmlData = await fetchFeedWithFallback(feed.feedUrl);
					const { feedData, posts, isAtom } = parseFeedXml(xmlData);

					const result = evolu.insert("rssFeed", {
						feedUrl: feed.feedUrl,
						title: feed.title,
						description:
							feed.description ||
							feedData.description ||
							feedData.subtitle ||
							"",
						category: feed.category || "Uncategorized",
						dateUpdated: new Date().toISOString(),
					});

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

					successCount++;
				} catch (error) {
					console.error(`Failed to import feed: ${feed.title}`, error);
					failCount++;
				}
			}

			toast.success(
				`Import complete! Success: ${successCount}, Failed: ${failCount}`,
				{ id: importToast },
			);
		} catch (error) {
			console.error("Failed to import OPML:", error);
			toast.error("Failed to import OPML. Please check the file format.", {
				id: importToast,
			});
		} finally {
			setIsImportingOPML(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	}

	function handleImportClick() {
		fileInputRef.current?.click();
	}

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			handleImportOPML(file);
		}
	}

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

	if (isInitialLoading) {
		return <LoadingScreen />;
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
						<input
							ref={fileInputRef}
							type="file"
							accept=".opml,.xml"
							onChange={handleFileSelect}
							className="hidden"
						/>
						<Button
							variant="outline"
							onClick={handleImportClick}
							disabled={isImportingOPML}
							className="w-full"
						>
							<FileUp className="h-4 w-4 mr-2" />
							{isImportingOPML ? "Importing OPML..." : "Import OPML"}
						</Button>
						<Button
							variant="outline"
							onClick={() => setIsRestoreDialogOpen(true)}
							className="w-full"
						>
							<Upload className="h-4 w-4 mr-2" />
							Restore from Backup
						</Button>
					</div>
				</div>
			)}
			<Dialog
				open={isRestoreDialogOpen}
				onOpenChange={handleRestoreDialogOpenChange}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Restore from Backup</DialogTitle>
						<DialogDescription>
							Enter your backup phrase to restore your account and access your
							encrypted data.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<textarea
							className="w-full p-4 bg-muted rounded-lg font-mono text-sm resize-none min-h-[100px]"
							placeholder="Enter your backup phrase here..."
							value={restoreMnemonic}
							onChange={(e) => setRestoreMnemonic(e.target.value)}
						/>
						<Button
							onClick={handleRestore}
							disabled={!restoreMnemonic.trim()}
							className="w-full"
						>
							<Upload className="h-4 w-4 mr-2" />
							Restore Account
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}

export default App;
