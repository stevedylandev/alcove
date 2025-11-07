import {
	BookKey,
	Copy,
	Eye,
	EyeOff,
	Info,
	Trash2,
	Upload,
	Download,
	FileUp,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { use, useState, useRef } from "react";
import { useEvolu, reset, allFeedsQuery } from "@/lib/evolu";
import { useQuery } from "@evolu/react";
import { generateOPML, parseOPML, downloadOPML } from "@/lib/opml";
import {
	fetchFeedWithFallback,
	parseFeedXml,
	extractPostLink,
	extractPostAuthor,
	extractPostContent,
	extractPostDate,
} from "@/lib/feed-operations";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Mnemonic } from "@evolu/common";
import { AboutDialog } from "@/components/about-dialog";

export function NavUser() {
	const { isMobile } = useSidebar();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
	const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
	const [isImportOPMLDialogOpen, setIsImportOPMLDialogOpen] = useState(false);
	const [backupPhrase, setBackupPhrase] = useState<Mnemonic | null>();
	const [isRevealed, setIsRevealed] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [restoreMnemonic, setRestoreMnemonic] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	function maskPhrase(phrase: string | null | undefined) {
		if (!phrase) return "";
		const words = phrase
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0);
		return words.map((word) => "•".repeat(word.length)).join(" ");
	}

	const evolu = useEvolu();
	const owner = use(evolu.appOwner);
	const feeds = useQuery(allFeedsQuery);

	function backup() {
		setBackupPhrase(owner.mnemonic);
	}

	async function handleExportOPML() {
		try {
			const opmlContent = generateOPML(feeds);
			downloadOPML(opmlContent);
		} catch (error) {
			console.error("Failed to export OPML:", error);
			alert("Failed to export OPML. Please try again.");
		}
	}

	async function handleImportOPML(file: File) {
		setIsImporting(true);
		setImportProgress("Reading OPML file...");

		try {
			const fileContent = await file.text();
			const opmlFeeds = parseOPML(fileContent);

			setImportProgress(`Found ${opmlFeeds.length} feeds. Importing...`);

			let successCount = 0;
			let failCount = 0;

			for (let i = 0; i < opmlFeeds.length; i++) {
				const feed = opmlFeeds[i];
				setImportProgress(
					`Importing feed ${i + 1}/${opmlFeeds.length}: ${feed.title}`,
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

					if (!result.ok) {
						continue;
					}

					for (const post of posts) {
						const postLink = extractPostLink(post, isAtom);
						evolu.insert("rssPost", {
							title: post.title,
							author: extractPostAuthor(post, isAtom, feedData.title),
							feedTitle: feed.title,
							publishedDate: extractPostDate(post),
							link: postLink,
							feedId: result.value.id,
							content: extractPostContent(post, postLink),
						});
					}

					successCount++;
				} catch (error) {
					console.error(`Failed to import feed: ${feed.title}`, error);
					failCount++;
				}
			}

			setImportProgress(
				`Import complete! Success: ${successCount}, Failed: ${failCount}`,
			);
			setTimeout(() => {
				setIsImportOPMLDialogOpen(false);
				setIsImporting(false);
				setImportProgress("");
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			}, 2000);
		} catch (error) {
			console.error("Failed to import OPML:", error);
			setImportProgress("Failed to import OPML. Please check the file format.");
			setIsImporting(false);
		}
	}

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) {
			handleImportOPML(file);
		}
	}

	function copyToClipboard() {
		if (backupPhrase) {
			navigator.clipboard.writeText(backupPhrase);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	}

	function handleDialogOpenChange(open: boolean) {
		setIsDialogOpen(open);
		if (open) {
			backup();
		} else {
			// Reset state when dialog closes
			setIsRevealed(false);
			setIsCopied(false);
		}
	}

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
		}
	}

	return (
		<>
			<Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
								>
									<div className="grid flex-1 text-center text-sm leading-tight">
										<span className="truncate font-medium">Settings</span>
									</div>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
								side={isMobile ? "bottom" : "right"}
								align="end"
								sideOffset={4}
							>
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={() => setIsAboutDialogOpen(true)}>
										<Info />
										About
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DialogTrigger asChild>
										<DropdownMenuItem>
											<BookKey />
											Backup
										</DropdownMenuItem>
									</DialogTrigger>
									<DropdownMenuItem
										onClick={() => setIsRestoreDialogOpen(true)}
									>
										<Upload />
										Restore
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onClick={handleExportOPML}>
										<Download />
										Export OPML
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setIsImportOPMLDialogOpen(true)}
									>
										<FileUp />
										Import OPML
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={reset}>
									<Trash2 />
									Clear Data
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Backup or Export Your Account</DialogTitle>
						<DialogDescription>
							Alcove does not have access to your data since it's encrypted. In
							order to recover it or access it from another device you need to
							copy the phrase below somewhere safe.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="relative p-4 bg-muted rounded-lg font-mono text-sm break-all">
							{isRevealed ? backupPhrase : maskPhrase(backupPhrase)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsRevealed(!isRevealed)}
								className="flex-1"
							>
								{isRevealed ? (
									<>
										<EyeOff className="h-4 w-4 mr-2" />
										Hide
									</>
								) : (
									<>
										<Eye className="h-4 w-4 mr-2" />
										Reveal
									</>
								)}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={copyToClipboard}
								className="flex-1"
							>
								<Copy className="h-4 w-4 mr-2" />
								{isCopied ? "Copied!" : "Copy"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
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
			<AboutDialog
				open={isAboutDialogOpen}
				onOpenChange={setIsAboutDialogOpen}
			/>
			<Dialog
				open={isImportOPMLDialogOpen}
				onOpenChange={setIsImportOPMLDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import OPML</DialogTitle>
						<DialogDescription>
							Import your RSS feeds from an OPML file. This will add all feeds
							from the file to your collection.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{isImporting ? (
							<div className="p-4 bg-muted rounded-lg">
								<p className="text-sm font-mono">{importProgress}</p>
							</div>
						) : (
							<>
								<input
									ref={fileInputRef}
									type="file"
									accept=".opml,.xml"
									onChange={handleFileSelect}
									className="w-full p-4 bg-muted rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
								/>
								<p className="text-xs text-muted-foreground">
									Select an OPML file (.opml or .xml) to import your feeds.
								</p>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
