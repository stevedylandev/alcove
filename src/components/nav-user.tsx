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
	Key,
	LogIn,
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
import { use, useState, useRef, useMemo } from "react";
import {
	useEvolu,
	reset,
	allFeedsQuery,
	localAuth,
	service,
	ownerIds,
	authResult,
} from "@/lib/evolu";
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
import * as Evolu from "@evolu/common";
import { AboutDialog } from "@/components/about-dialog";
import { formatTypeError } from "@/lib/format-error";

export function NavUser() {
	const { isMobile } = useSidebar();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
	const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
	const [isImportOPMLDialogOpen, setIsImportOPMLDialogOpen] = useState(false);
	const [isPasskeyDialogOpen, setIsPasskeyDialogOpen] = useState(false);
	const [backupPhrase, setBackupPhrase] = useState<Evolu.Mnemonic | null>();
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

	// Get other registered passkey profiles
	const otherOwnerIds = useMemo(
		() => ownerIds.filter(({ ownerId }) => ownerId !== owner?.id),
		[owner?.id],
	);

	function backup() {
		setBackupPhrase(owner?.mnemonic);
	}

	// Passkey registration
	async function handleRegisterPasskey() {
		const username = window.prompt("Enter your username for passkey:");
		if (username == null) return;

		// Determine if this is a guest login or a new owner
		const isGuest = !Boolean(authResult?.owner);

		// Register the guest owner or create a new one if already registered
		const result = await localAuth.register(username, {
			service: service,
			mnemonic: isGuest ? owner?.mnemonic : undefined,
		});

		if (result) {
			// If this is a guest owner, clear the database and reload
			// The owner is transferred to a new database on next login
			if (isGuest) {
				void evolu.resetAppOwner({ reload: true });
			} else {
				// Otherwise, just reload the page
				evolu.reloadApp();
			}
		} else {
			alert(
				"Failed to register passkey. Make sure your device supports passkeys.",
			);
		}
	}

	// Passkey login
	async function handleLoginWithPasskey(ownerId: Evolu.OwnerId) {
		const result = await localAuth.login(ownerId, { service });
		if (result) {
			evolu.reloadApp();
		} else {
			alert("Failed to login with passkey");
		}
	}

	// Clear all passkeys and data
	async function handleClearAllPasskeys() {
		const confirmed = window.confirm(
			"Are you sure you want to clear all passkeys and data? This cannot be undone.",
		);
		if (!confirmed) return;

		await localAuth.clearAll({ service });
		void evolu.resetAppOwner({ reload: true });
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
						const postResult = evolu.insert("rssPost", {
							title: post.title,
							author: extractPostAuthor(post, isAtom, feedData.title),
							feedTitle: feed.title,
							publishedDate: extractPostDate(post),
							link: postLink,
							feedId: result.value.id,
							content: extractPostContent(post, postLink),
						});
						if (!postResult.ok) {
							console.warn(
								"Failed to insert post:",
								formatTypeError(postResult.error),
							);
						}
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
			const result = Evolu.Mnemonic.from(restoreMnemonic.trim());
			if (!result.ok) {
				alert(formatTypeError(result.error));
				return;
			}

			void evolu.restoreAppOwner(result.value);
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
									<DropdownMenuItem
										onClick={() => setIsPasskeyDialogOpen(true)}
									>
										<Key />
										Passkeys
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
			<Dialog open={isPasskeyDialogOpen} onOpenChange={setIsPasskeyDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Passkey Management</DialogTitle>
						<DialogDescription>
							Register a passkey to securely access your account across devices
							without entering a mnemonic. Your device's biometric
							authentication (fingerprint, face ID, etc.) will protect your
							data.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{owner && (
							<div className="p-3 bg-muted rounded-lg">
								<p className="text-xs font-medium text-muted-foreground mb-1">
									Current Account
								</p>
								<p className="text-sm font-medium">
									{authResult?.username ?? "Guest"}
								</p>
								<p className="text-xs text-muted-foreground mt-1">{owner.id}</p>
							</div>
						)}

						<div className="flex gap-2">
							<Button
								onClick={handleRegisterPasskey}
								className="flex-1"
								variant="default"
							>
								<Key className="h-4 w-4 mr-2" />
								Register Passkey
							</Button>
							<Button
								onClick={handleClearAllPasskeys}
								className="flex-1"
								variant="destructive"
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Clear All
							</Button>
						</div>

						{otherOwnerIds.length > 0 && (
							<>
								<div className="border-t pt-4">
									<p className="text-sm font-medium mb-3">
										Other Registered Passkeys
									</p>
									<div className="space-y-2">
										{otherOwnerIds.map(({ ownerId, username }) => (
											<div
												key={ownerId}
												className="flex items-center justify-between p-3 bg-muted rounded-lg"
											>
												<div className="flex flex-col">
													<span className="text-sm font-medium">
														{username}
													</span>
													<span className="text-xs text-muted-foreground">
														{ownerId}
													</span>
												</div>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleLoginWithPasskey(ownerId)}
												>
													<LogIn className="h-3 w-3 mr-1" />
													Login
												</Button>
											</div>
										))}
									</div>
								</div>
							</>
						)}

						<p className="text-xs text-muted-foreground">
							💡 Passkeys use your device's secure enclave for authentication.
							You can register multiple passkeys for different devices or users.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
