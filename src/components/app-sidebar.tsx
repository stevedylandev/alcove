"use client";

import * as React from "react";
import {
	Plus,
	RotateCw,
	MoreVertical,
	Check,
	X,
	ChevronLeft,
} from "lucide-react";

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
	useSidebar,
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
	// Mobile navigation state: 'feeds' or 'posts'
	const [mobileView, setMobileView] = React.useState<"feeds" | "posts">(
		"feeds",
	);
	const hasRefreshedOnMount = React.useRef(false);

	const { hidden, isMobile, setOpenMobile } = useSidebar();
	const evolu = useEvolu();
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

	// Handle feed selection - on mobile, navigate to posts view
	const handleFeedSelect = React.useCallback(
		(feedId: string | null) => {
			onFeedSelect(feedId);
			// Navigate to posts view on mobile for any feed selection (including "All Feeds")
			if (isMobile) {
				setMobileView("posts");
			}
		},
		[onFeedSelect, isMobile],
	);

	// Handle back to feeds on mobile
	const handleBackToFeeds = React.useCallback(() => {
		setMobileView("feeds");
		onFeedSelect(null);
	}, [onFeedSelect]);

	// Handle post selection and mark as read
	const handlePostSelect = React.useCallback(
		(postId: string) => {
			// Mark as read
			const existingStatus = allReadStatusesWithUnread.find(
				(status) => status.postId === postId,
			);
			const post = feedPosts.find((p) => p.id === postId);

			if (existingStatus) {
				// Update existing status to read
				evolu.update("readStatus", {
					id: existingStatus.id as any,
					isRead: 1,
				});
			} else if (post && post.feedId) {
				// Create new read status
				evolu.insert("readStatus", {
					postId: postId,
					feedId: post.feedId,
					isRead: 1,
				});
			}

			// Call the original onPostSelect
			onPostSelect(postId);

			// On mobile, close the sidebar after selecting a post
			// Keep the current view (posts) so user can continue where they left off
			if (isMobile) {
				setOpenMobile(false);
			}
		},
		[
			allReadStatusesWithUnread,
			feedPosts,
			evolu,
			onPostSelect,
			isMobile,
			setOpenMobile,
		],
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
				evolu.update("readStatus", {
					id: existingStatus.id as any,
					isRead: 1,
				});
				markedCount++;
			} else if (!existingStatus && post.feedId) {
				// Create new read status
				evolu.insert("readStatus", {
					postId: post.id,
					feedId: post.feedId,
					isRead: 1,
				});
				markedCount++;
			}
		});
		toast.success(
			`Marked ${markedCount} post${markedCount !== 1 ? "s" : ""} as read`,
		);
	}, [filteredPosts, allReadStatusesWithUnread, evolu]);

	// Mark all visible posts as unread
	const handleMarkAllAsUnread = React.useCallback(() => {
		let unmarkedCount = 0;
		filteredPosts.forEach((post) => {
			const existingStatus = allReadStatusesWithUnread.find(
				(status) => status.postId === post.id,
			);

			if (existingStatus && existingStatus.isRead) {
				// Update existing status to unread
				evolu.update("readStatus", {
					id: existingStatus.id as any,
					isRead: 0,
				});
				unmarkedCount++;
			} else if (!existingStatus && post.feedId) {
				// Create new unread status
				evolu.insert("readStatus", {
					postId: post.id,
					feedId: post.feedId,
					isRead: 0,
				});
				unmarkedCount++;
			}
		});
		toast.success(
			`Marked ${unmarkedCount} post${unmarkedCount !== 1 ? "s" : ""} as unread`,
		);
	}, [filteredPosts, allReadStatusesWithUnread, evolu]);

	const refreshFeeds = React.useCallback(async () => {
		if (allFeeds.length === 0) {
			toast.error("No feeds to refresh");
			return;
		}

		toast.info(
			`Refreshing ${allFeeds.length} feed${allFeeds.length !== 1 ? "s" : ""}...`,
		);
		let totalNewPosts = 0;

		try {
			for (const feed of allFeeds) {
				try {
					if (!feed.feedUrl) continue;

					let xmlData: string;

					// Try to fetch directly first
					try {
						const xmlFetch = await fetch(feed.feedUrl);
						xmlData = await xmlFetch.text();
					} catch (corsError) {
						// Fall back to corsproxy.io if CORS error occurs
						const xmlFetch = await fetch(
							`https://corsproxy.io/?url=${encodeURIComponent(feed.feedUrl)}`,
						);
						xmlData = await xmlFetch.text();
					}

					const parsedXmlData = await parser.parse(xmlData);

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
						console.warn(`Unsupported feed format for ${feed.title}`);
						continue;
					}

					// Get existing posts for this feed to avoid duplicates
					// Use allPosts to ensure we check against all posts in the database
					const existingPosts = allPosts.filter((p) => p.feedId === feed.id);
					const existingLinks = new Set(existingPosts.map((p) => p.link));

					// Process new posts/entries
					let newPostsCount = 0;
					for (const post of posts) {
						const postLink = isAtom
							? typeof post.link === "string"
								? post.link || post.id
								: post.link?.[0] || post.id
							: post.link || post.id;

						// Skip if we already have this post
						if (existingLinks.has(postLink)) {
							continue;
						}

						evolu.insert("rssPost", {
							title: post.title,
							author: isAtom
								? post.author?.name || feedData.title
								: post.author || feedData.title,
							publishedDate: new Date(
								post.pubDate || post.updated,
							).toISOString(),
							link: postLink,
							feedId: feed.id,
							content:
								post["content:encoded"] ||
								post.content ||
								"Please open on the web",
						});
						newPostsCount++;
					}

					totalNewPosts += newPostsCount;

					// Update feed's dateUpdated
					evolu.update("rssFeed", {
						id: feed.id as any,
						dateUpdated: new Date().toISOString(),
					});
				} catch (error) {
					console.error(`Error refreshing feed "${feed.title}":`, error);
					// Continue with other feeds even if one fails
				}
			}

			if (totalNewPosts > 0) {
				toast.success(
					`Refreshed feeds and found ${totalNewPosts} new post${totalNewPosts !== 1 ? "s" : ""}`,
				);
			} else {
				toast.success("All feeds up to date");
			}
		} catch (error) {
			console.error("Error refreshing feeds:", error);
			toast.error("Failed to refresh feeds");
		}
	}, [allFeeds, allPosts, evolu]);

	// Run refresh on component mount (only once, even in strict mode)
	React.useEffect(() => {
		if (!hasRefreshedOnMount.current) {
			hasRefreshedOnMount.current = true;
			refreshFeeds();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

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
				<Sidebar collapsible="offcanvas" {...props}>
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								{isMobile && mobileView === "posts" ? (
									<div className="flex items-center gap-2 px-2 pt-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={handleBackToFeeds}
											className="h-8 w-8 p-0"
										>
											<ChevronLeft className="size-5" />
										</Button>
										<div className="flex-1 text-left text-xl">
											<span className="truncate font-bold">
												{selectedFeedId
													? allFeeds.find((f) => f.id === selectedFeedId)
															?.title || "Posts"
													: "All Posts"}
											</span>
										</div>
									</div>
								) : (
									<a href="#">
										<div className="grid flex-1 text-left text-xl px-2 pt-2">
											<span className="truncate font-bold">Alcove</span>
										</div>
									</a>
								)}
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>
					<SidebarContent>
						{isMobile && mobileView === "posts" ? (
							// Mobile posts view
							<div className="flex flex-col h-full">
								<div className="gap-2 border-b p-3 flex flex-col">
									<div className="flex w-full items-center justify-between gap-2">
										<div className="text-foreground text-sm font-semibold truncate">
											{filteredPosts.length} post
											{filteredPosts.length !== 1 ? "s" : ""}
										</div>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0"
												>
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
														selectedPostId === post.id
															? "bg-sidebar-accent"
															: ""
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
						) : (
							// Feeds view (desktop and mobile default)
							<>
								<SidebarGroup>
									<SidebarGroupLabel>Actions</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											<SidebarMenuItem>
												<DialogTrigger asChild>
													<SidebarMenuButton
														onClick={() => {
															setDialogOpen(true);
														}}
													>
														<Plus className="size-4" />
														<span>Add Feed</span>
													</SidebarMenuButton>
												</DialogTrigger>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton onClick={reset}>
													<RotateCw className="size-4" />
													<span>Reset</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
											<SidebarMenuItem>
												<SidebarMenuButton onClick={refreshFeeds}>
													<RotateCw className="size-4" />
													<span>Refresh</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
								<NavFeeds
									feeds={allFeeds}
									selectedFeedId={selectedFeedId}
									onFeedSelect={handleFeedSelect}
								/>
							</>
						)}
					</SidebarContent>
					<SidebarFooter>
						{!isMobile || mobileView === "feeds" ? (
							<NavUser user={data.user} />
						) : null}
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
			<div
				className={`bg-sidebar text-sidebar-foreground hidden md:flex h-screen flex-col border-r ${hidden ? "w-0 min-w-0 border-0 overflow-hidden" : "w-[320px] overflow-y-auto"}`}
			>
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
