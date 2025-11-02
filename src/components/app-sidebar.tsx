"use client";

import * as React from "react";
import { Plus, RotateCw, MoreVertical, Check, X } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { NavFeeds } from "@/components/nav-feeds";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
	allFeedsQuery,
	allPostsQuery,
	postsByFeedQuery,
	allReadStatusesQuery,
	allReadStatusesWithUnreadQuery,
	useEvolu,
	reset,
} from "@/lib/evolu";
import { XMLParser } from "fast-xml-parser";
import { useQuery } from "@evolu/react";
import { COMMON_FEED_PATHS } from "@/lib/feed-discovery";
const parser = new XMLParser();

// This is sample data
const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	selectedFeedId?: string | null;
	onFeedSelect?: (feedId: string | null) => void;
	selectedPostId?: string | null;
	onPostSelect?: (postId: string) => void;
}

export function AppSidebar({
	selectedFeedId = null,
	onFeedSelect = () => {},
	selectedPostId = null,
	onPostSelect = () => {},
	...props
}: AppSidebarProps) {
	const [urlInput, setUrlInput] = React.useState("");
	const [categoryInput, setCategoryInput] = React.useState("");
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [isAddingFeed, setIsAddingFeed] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState("");

	const { insert, update } = useEvolu();
	const allFeeds = useQuery(allFeedsQuery);
	const allReadStatuses = useQuery(allReadStatusesQuery);
	const allReadStatusesWithUnread = useQuery(allReadStatusesWithUnreadQuery);

	// Get posts based on selected feed
	const allPosts = useQuery(allPostsQuery);
	const feedPostsQuery = useQuery(postsByFeedQuery(selectedFeedId || ""));
	const feedPosts = selectedFeedId ? feedPostsQuery : allPosts;

	// Filter and sort posts by search query and date
	const filteredPosts = React.useMemo(() => {
		const filtered = searchQuery
			? feedPosts.filter((post) =>
					post.title?.toLowerCase().includes(searchQuery.toLowerCase()),
				)
			: feedPosts;

		// Sort by publishedDate (most recent first)
		return [...filtered].sort((a, b) => {
			// Handle null dates - put them at the end
			if (!a.publishedDate) return 1;
			if (!b.publishedDate) return -1;
			// Most recent first (descending order)
			return b.publishedDate.localeCompare(a.publishedDate);
		});
	}, [feedPosts, searchQuery]);

	// Check if a post is read
	const isPostRead = React.useCallback(
		(postId: string) => {
			return allReadStatuses.some((status) => status.postId === postId);
		},
		[allReadStatuses],
	);

	// Handle post selection and mark as read
	const handlePostSelect = React.useCallback(
		(postId: string) => {
			// Mark as read
			const existingStatus = allReadStatuses.find(
				(status) => status.postId === postId,
			);
			const post = feedPosts.find((p) => p.id === postId);

			if (existingStatus) {
				// Update existing status to read
				update("readStatus", {
					id: existingStatus.id,
					isRead: true,
				});
			} else if (post && post.feedId) {
				// Create new read status
				insert("readStatus", {
					postId: postId as any,
					feedId: post.feedId,
					isRead: true,
				});
			}

			// Call the original onPostSelect
			onPostSelect(postId);
		},
		[allReadStatuses, feedPosts, insert, update, onPostSelect],
	);

	// Mark all visible posts as read
	const handleMarkAllAsRead = React.useCallback(() => {
		let markedCount = 0;
		filteredPosts.forEach((post) => {
			const existingStatus = allReadStatusesWithUnread.find(
				(status) => status.postId === post.id,
			);

			if (existingStatus && !existingStatus.isRead) {
				// Update existing status to read
				update("readStatus", {
					id: existingStatus.id,
					isRead: true,
				});
				markedCount++;
			} else if (!existingStatus && post.feedId) {
				// Create new read status
				insert("readStatus", {
					postId: post.id as any,
					feedId: post.feedId,
					isRead: true,
				});
				markedCount++;
			}
		});
		toast.success(
			`Marked ${markedCount} post${markedCount !== 1 ? "s" : ""} as read`,
		);
	}, [filteredPosts, allReadStatusesWithUnread, insert, update]);

	// Mark all visible posts as unread
	const handleMarkAllAsUnread = React.useCallback(() => {
		let unmarkedCount = 0;
		filteredPosts.forEach((post) => {
			const existingStatus = allReadStatusesWithUnread.find(
				(status) => status.postId === post.id,
			);

			if (existingStatus && existingStatus.isRead) {
				// Update existing status to unread
				update("readStatus", {
					id: existingStatus.id,
					isRead: false,
				});
				unmarkedCount++;
			} else if (!existingStatus && post.feedId) {
				// Create new unread status
				insert("readStatus", {
					postId: post.id as any,
					feedId: post.feedId,
					isRead: false,
				});
				unmarkedCount++;
			}
		});
		toast.success(
			`Marked ${unmarkedCount} post${unmarkedCount !== 1 ? "s" : ""} as unread`,
		);
	}, [filteredPosts, allReadStatusesWithUnread, insert, update]);

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
			const looksLikeFeedUrl =
				urlInput.includes("/feed") ||
				urlInput.includes("/rss") ||
				urlInput.includes(".xml") ||
				urlInput.includes("/atom");

			let xmlData: string | null = null;

			if (!looksLikeFeedUrl) {
				// Try common feed paths using CORS proxy
				const urlObj = new URL(urlInput);
				const origin = urlObj.origin;

				console.log("Trying to discover feed from:", origin);

				for (const path of COMMON_FEED_PATHS) {
					const testUrl = `${origin}${path}`;
					console.log("Testing:", testUrl);

					try {
						// Use CORS proxy to avoid CORS issues
						const response = await fetch(
							`https://corsproxy.io/?url=${encodeURIComponent(testUrl)}`,
						);

						if (response.ok) {
							const text = await response.text();
							// Quick check if it looks like XML
							if (
								text.trim().startsWith("<?xml") ||
								text.includes("<rss") ||
								text.includes("<feed")
							) {
								xmlData = text;
								feedUrl = testUrl;
								console.log("Found feed at:", testUrl);
								break;
							}
						}
					} catch (error) {
						console.log("Failed to fetch:", testUrl, error);
						continue;
					}
				}

				if (!xmlData) {
					setStatusMessage(
						"Could not find an RSS feed at this URL. Please enter a direct feed URL.",
					);
					setIsAddingFeed(false);
					return;
				}
			} else {
				// Direct feed URL - try to fetch it
				try {
					// Try to fetch directly first
					const xmlFetch = await fetch(feedUrl);
					console.log("Status code: ", xmlFetch.status);
					console.log("Request ok: ", xmlFetch.ok);
					xmlData = await xmlFetch.text();
				} catch (corsError) {
					// Fall back to AllOrigins if CORS error occurs
					console.log(corsError);
					const xmlFetch = await fetch(
						`https://api.allorigins.win/raw?url=${feedUrl}`,
					);
					xmlData = await xmlFetch.text();
				}
			}

			const parsedXmlData = await parser.parse(xmlData);
			console.log(parsedXmlData);

			// Determine if it's RSS or Atom feed
			let feedData: any;
			let posts: any[];
			let isAtom = false;

			if (parsedXmlData.rss) {
				// RSS feed
				feedData = parsedXmlData.rss.channel;
				posts = feedData.item || [];
			} else if (parsedXmlData.feed) {
				// Atom feed
				feedData = parsedXmlData.feed;
				posts = feedData.entry || [];
				isAtom = true;
			} else {
				throw new Error("Unsupported feed format");
			}

			const result = insert("rssFeed", {
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
				insert("rssPost", {
					title: post.title,
					author: isAtom
						? post.author?.name || feedData.title
						: post.author || feedData.title,
					publishedDate: new Date(post.pubDate || post.updated).toISOString(),
					link: isAtom
						? typeof post.link === "string"
							? post.link || post.id
							: post.link?.[0] || post.id
						: post.link || post.id,
					feedId: result.value.id,
					content:
						post["content:encoded"] || post.content || "Please open on the web",
				});
			}

			toast.success(
				`Successfully added "${feedData.title}" with ${posts.length} post${posts.length !== 1 ? "s" : ""}`,
			);

			setUrlInput("");
			setCategoryInput("");
			setStatusMessage("");
			setDialogOpen(false);
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
		<>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<Sidebar collapsible="icon" {...props}>
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<a href="#">
									<div className="grid flex-1 text-left text-xl px-2 pt-2">
										<span className="truncate font-bold">Alcove</span>
									</div>
								</a>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Actions</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<DialogTrigger asChild>
										<SidebarMenuItem>
											<SidebarMenuButton>
												<Plus className="size-4" />
												<span>Add Feed</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									</DialogTrigger>
									<SidebarMenuItem>
										<SidebarMenuButton onClick={reset}>
											<RotateCw className="size-4" />
											<span>Reset</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
						<NavFeeds
							feeds={allFeeds}
							selectedFeedId={selectedFeedId}
							onFeedSelect={onFeedSelect}
						/>
					</SidebarContent>
					<SidebarFooter>
						<NavUser user={data.user} />
					</SidebarFooter>
				</Sidebar>
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

			{/* Posts List Panel - Separate from main sidebar */}
			<div className="bg-sidebar text-sidebar-foreground hidden md:flex overflow-y-scroll h-screen w-[320px] flex-col border-r">
				<div className="gap-2 border-b p-3 flex flex-col">
					<div className="flex w-full items-center justify-between gap-2">
						<div className="text-foreground text-sm font-semibold truncate">
							{selectedFeedId
								? allFeeds.find((f) => f.id === selectedFeedId)?.title ||
									"Posts"
								: "All Posts"}
						</div>
						<div className="flex items-center gap-1">
							<span className="text-muted-foreground text-xs whitespace-nowrap">
								{filteredPosts.length}
							</span>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={handleMarkAllAsRead}>
										<Check className="h-4 w-4 mr-2" />
										Mark all as read
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleMarkAllAsUnread}>
										<X className="h-4 w-4 mr-2" />
										Mark all as unread
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
					<Input
						placeholder="Search..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8"
					/>
				</div>
				<div className="flex-1 overflow-y-auto">
					{filteredPosts.length === 0 ? (
						<div className="p-4 text-center text-sm text-muted-foreground">
							No posts found
						</div>
					) : (
						filteredPosts.map((post) => {
							const isRead = isPostRead(post.id);
							return (
								<button
									type="button"
									key={post.id}
									onClick={() => handlePostSelect(post.id)}
									className={`hover:bg-sidebar-accent flex items-start gap-2 border-b px-3 py-3 text-sm text-left w-full last:border-b-0 transition-colors ${
										selectedPostId === post.id ? "bg-sidebar-accent" : ""
									}`}
								>
									{/* Unread indicator */}
									<div className="flex-shrink-0 pt-1">
										{!isRead && (
											<div className="size-2 rounded-full bg-primary" />
										)}
									</div>
									{/* Post content */}
									<div className="flex flex-col gap-1.5 flex-1 min-w-0">
										<span className="font-medium line-clamp-2 leading-snug">
											{post.title}
										</span>
										{post.author && (
											<span className="text-muted-foreground text-xs">
												{post.author}
											</span>
										)}
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>
		</>
	);
}
