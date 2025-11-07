import * as React from "react";
import { NavUser } from "@/components/nav-user";
import { NavFeeds } from "@/components/nav-feeds";
import { FeedActions } from "@/components/feed-actions";
import { AddFeedDialog } from "@/components/add-feed-dialog";
import { PostsList } from "@/components/posts-list";
import { MobilePostsHeader } from "@/components/mobile-posts-header";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
	allFeedsQuery,
	allPostsQuery,
	postsByFeedQuery,
	allReadStatusesQuery,
	allReadStatusesWithUnreadQuery,
	useEvolu,
	evolu as evoluInstance,
} from "@/lib/evolu";
import * as Evolu from "@evolu/common";
import { useQuery } from "@evolu/react";
import {
	fetchFeedWithFallback,
	parseFeedXml,
	extractPostLink,
	extractPostAuthor,
	extractPostContent,
	extractPostDate,
} from "@/lib/feed-operations";

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
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
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

	// Check if a post is read
	const isPostRead = React.useCallback(
		(postId: string) => {
			return allReadStatuses.some((status) => status.postId === postId);
		},
		[allReadStatuses],
	);

	// Determine which posts to show based on selection
	const feedPosts = React.useMemo(() => {
		if (selectedFeedId === "unread") {
			// Show only unread posts from all feeds
			return allPosts.filter((post) => !isPostRead(post.id));
		} else if (selectedFeedId) {
			// Show posts from specific feed
			return feedPostsQuery;
		} else {
			// Show all posts
			return allPosts;
		}
	}, [selectedFeedId, allPosts, feedPostsQuery, isPostRead]);

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

	// Delete feed (soft delete using isDeleted flag)
	const handleDeleteFeed = React.useCallback(() => {
		if (!selectedFeedId) return;

		const feedToDelete = allFeeds.find((f) => f.id === selectedFeedId);
		if (!feedToDelete) return;

		// Soft delete the feed (CRDT-friendly, preserves sync history)
		evoluInstance.update("rssFeed", {
			id: selectedFeedId as any,
			isDeleted: Evolu.sqliteTrue,
		});

		// Also soft delete all posts associated with this feed
		const postsToDelete = allPosts.filter((p) => p.feedId === selectedFeedId);
		postsToDelete.forEach((post) => {
			evoluInstance.update("rssPost", {
				id: post.id as any,
				isDeleted: Evolu.sqliteTrue,
			});
		});

		toast.success(
			`Deleted feed "${feedToDelete.title}" and ${postsToDelete.length} post${postsToDelete.length !== 1 ? "s" : ""}`,
		);

		// Navigate back to all feeds
		onFeedSelect(null);
	}, [selectedFeedId, allFeeds, allPosts, onFeedSelect]);

	// Delete category (uncategorize all feeds in the category)
	const handleDeleteCategory = React.useCallback(() => {
		const selectedFeed = allFeeds.find((f) => f.id === selectedFeedId);
		if (!selectedFeed || !selectedFeed.category) return;

		const categoryToDelete = selectedFeed.category;

		// Find all feeds in this category
		const feedsInCategory = allFeeds.filter(
			(f) => f.category === categoryToDelete,
		);

		// Set category to null for all feeds in this category
		feedsInCategory.forEach((feed) => {
			evoluInstance.update("rssFeed", {
				id: feed.id as any,
				category: null,
			});
		});

		toast.success(
			`Removed category "${categoryToDelete}" from ${feedsInCategory.length} feed${feedsInCategory.length !== 1 ? "s" : ""}`,
		);

		// Navigate back to all feeds
		onFeedSelect(null);
	}, [selectedFeedId, allFeeds, onFeedSelect]);

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

					const xmlData = await fetchFeedWithFallback(feed.feedUrl);
					const { feedData, posts, isAtom } = parseFeedXml(xmlData);

					// Get existing posts for this feed to avoid duplicates
					const existingPosts = allPosts.filter((p) => p.feedId === feed.id);
					const existingLinks = new Set(existingPosts.map((p) => p.link));

					// Process new posts/entries
					let newPostsCount = 0;
					for (const post of posts) {
						const postLink = extractPostLink(post, isAtom);

						// Skip if we already have this post
						if (existingLinks.has(postLink as any)) {
							continue;
						}

						evolu.insert("rssPost", {
							title: post.title,
							author: extractPostAuthor(post, isAtom, feedData.title),
							feedTitle: feed.title,
							publishedDate: extractPostDate(post),
							link: postLink,
							feedId: feed.id,
							content: extractPostContent(post),
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

	const selectedFeed =
		selectedFeedId && selectedFeedId !== "unread"
			? allFeeds.find((f) => f.id === selectedFeedId)
			: null;
	const selectedFeedTitle =
		selectedFeedId === "unread" ? "Unread" : selectedFeed?.title || "All Posts";
	const selectedFeedCategory = selectedFeed?.category || null;

	return (
		<>
			<AddFeedDialog open={dialogOpen} onOpenChange={setDialogOpen} />

			<Sidebar collapsible="offcanvas" {...props}>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							{isMobile && mobileView === "posts" ? (
								<MobilePostsHeader
									feedTitle={selectedFeedTitle}
									onBack={handleBackToFeeds}
								/>
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
							<PostsList
								posts={filteredPosts}
								selectedPostId={selectedPostId}
								onPostSelect={handlePostSelect}
								searchQuery={searchQuery}
								onSearchChange={setSearchQuery}
								feedTitle={`${filteredPosts.length} post${filteredPosts.length !== 1 ? "s" : ""}`}
								isPostRead={isPostRead}
								onMarkAllAsRead={handleMarkAllAsRead}
								onMarkAllAsUnread={handleMarkAllAsUnread}
								onDeleteFeed={handleDeleteFeed}
								onDeleteCategory={handleDeleteCategory}
								selectedFeedId={selectedFeedId}
								selectedFeedCategory={selectedFeedCategory}
								className="border-0"
							/>
						</div>
					) : (
						// Feeds view (desktop and mobile default)
						<>
							<FeedActions
								onAddFeed={() => setDialogOpen(true)}
								onRefresh={refreshFeeds}
							/>
							<NavFeeds
								feeds={allFeeds}
								selectedFeedId={selectedFeedId}
								onFeedSelect={handleFeedSelect}
							/>
						</>
					)}
				</SidebarContent>
				<SidebarFooter>
					{!isMobile || mobileView === "feeds" ? <NavUser /> : null}
				</SidebarFooter>
			</Sidebar>

			{/* Posts List Panel - Separate from main sidebar (Desktop only) */}
			<PostsList
				posts={filteredPosts}
				selectedPostId={selectedPostId}
				onPostSelect={handlePostSelect}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				feedTitle={selectedFeedTitle}
				isPostRead={isPostRead}
				onMarkAllAsRead={handleMarkAllAsRead}
				onMarkAllAsUnread={handleMarkAllAsUnread}
				onDeleteFeed={handleDeleteFeed}
				onDeleteCategory={handleDeleteCategory}
				selectedFeedId={selectedFeedId}
				selectedFeedCategory={selectedFeedCategory}
				className={`bg-sidebar text-sidebar-foreground hidden md:flex ${hidden ? "w-0 min-w-0 border-0 overflow-hidden" : "w-[320px] overflow-y-auto"}`}
			/>
		</>
	);
}
