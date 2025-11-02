"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ExternalLink, Circle, CircleCheckBig } from "lucide-react";
import { useQuery } from "@evolu/react";
import {
	allFeedsQuery,
	allPostsQuery,
	allReadStatusesQuery,
	allReadStatusesWithUnreadQuery,
	useEvolu,
} from "@/lib/evolu";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

function Dashboard() {
	const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(
		null,
	);
	const [selectedPostId, setSelectedPostId] = React.useState<string | null>(
		null,
	);
	const mainContentRef = React.useRef<HTMLDivElement>(null);

	const evolu = useEvolu();
	const allFeeds = useQuery(allFeedsQuery);
	const allPosts = useQuery(allPostsQuery);
	const allReadStatuses = useQuery(allReadStatusesQuery);
	const allReadStatusesWithUnread = useQuery(allReadStatusesWithUnreadQuery);
	console.log(allPosts);

	const selectedFeed = selectedFeedId
		? allFeeds.find((f) => f.id === selectedFeedId)
		: null;

	const selectedPost = selectedPostId
		? allPosts.find((p) => p.id === selectedPostId)
		: null;

	// Check if current post is read
	const isCurrentPostRead = React.useMemo(() => {
		if (!selectedPostId) return false;
		return allReadStatuses.some((status) => status.postId === selectedPostId);
	}, [selectedPostId, allReadStatuses]);

	// Toggle read/unread status for current post
	const toggleReadStatus = React.useCallback(() => {
		if (!selectedPostId || !selectedPost) return;

		const existingStatus = allReadStatusesWithUnread.find(
			(status) => status.postId === selectedPostId,
		);

		if (existingStatus) {
			// Update existing status
			const newReadStatus = existingStatus.isRead ? 0 : 1;
			evolu.update("readStatus", {
				id: existingStatus.id as any,
				isRead: newReadStatus,
			});
			toast.success(newReadStatus ? "Marked as read" : "Marked as unread");
		} else if (selectedPost.feedId) {
			// Create new read status (mark as read)
			evolu.insert("readStatus", {
				postId: selectedPostId,
				feedId: selectedPost.feedId,
				isRead: 1,
			});
			toast.success("Marked as read");
		}
	}, [selectedPostId, selectedPost, allReadStatusesWithUnread, evolu]);

	// Scroll to top when a new post is selected
	React.useEffect(() => {
		if (selectedPostId && mainContentRef.current) {
			mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, [selectedPostId]);

	// Get base URL from the post link to fix relative image paths
	const getBaseUrl = React.useCallback((link: string | null) => {
		if (!link) return "";
		try {
			const url = new URL(link);
			return `${url.protocol}//${url.host}`;
		} catch {
			return "";
		}
	}, []);

	// Custom components for ReactMarkdown to fix image URLs
	const markdownComponents = React.useMemo(
		() => ({
			img: ({ src, alt, ...props }: any) => {
				let fixedSrc = src;

				// If src starts with / and we have a base URL from the post link
				if (src?.startsWith("/") && selectedPost?.link) {
					const baseUrl = getBaseUrl(selectedPost.link);
					if (baseUrl) {
						fixedSrc = `${baseUrl}${src}`;
					}
				}

				return <img src={fixedSrc} alt={alt} {...props} />;
			},
		}),
		[selectedPost?.link, getBaseUrl],
	);

	return (
		<main className="min-h-screen w-full">
			<SidebarProvider
				style={
					{
						"--sidebar-width": "250px",
						"--sidebar-width-icon": "3rem",
					} as React.CSSProperties
				}
			>
				<AppSidebar
					selectedFeedId={selectedFeedId}
					onFeedSelect={setSelectedFeedId}
					selectedPostId={selectedPostId}
					onPostSelect={setSelectedPostId}
				/>
				<SidebarInset className="flex flex-col h-screen overflow-hidden">
					<header className="bg-background flex shrink-0 items-center gap-2 border-b p-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink
										href="#"
										onClick={() => {
											setSelectedFeedId(null);
											setSelectedPostId(null);
										}}
									>
										All Feeds
									</BreadcrumbLink>
								</BreadcrumbItem>
								{selectedFeed && (
									<>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<BreadcrumbPage>{selectedFeed.title}</BreadcrumbPage>
										</BreadcrumbItem>
									</>
								)}
							</BreadcrumbList>
						</Breadcrumb>
					</header>
					<div
						ref={mainContentRef}
						className="h-full flex flex-1 flex-col gap-4 p-4 pb-12 overflow-y-auto"
					>
						{selectedPost ? (
							<div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-8">
								<div className="flex flex-col gap-3">
									<a
										href={selectedPost.link ? selectedPost.link : ""}
										target="_blank"
										rel="noopener noreferrer"
										className="text-3xl font-bold tracking-tight hover:underline"
									>
										{selectedPost.title}
									</a>
									<div className="flex items-center gap-4 text-sm text-muted-foreground">
										{selectedPost.author && (
											<>
												{" "}
												by
												<a
													target="_blank"
													rel="noopener noreferrer"
													className="hover:underline"
													href={
														selectedPost.author && selectedPost.link
															? getBaseUrl(selectedPost.link)
															: ""
													}
												>
													{selectedPost.author}
												</a>
											</>
										)}
										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={toggleReadStatus}
												className="flex items-center gap-2"
											>
												{isCurrentPostRead ? (
													<Circle className="h-3 w-3" />
												) : (
													<CircleCheckBig className="h-3 w-3" />
												)}
											</Button>
										</div>
									</div>
									<span className="text-xs text-muted-foreground">
										{selectedPost.publishedDate
											? new Date(selectedPost.publishedDate).toLocaleDateString(
													"en-US",
													{
														year: "numeric",
														month: "long",
														day: "numeric",
													},
												)
											: ""}
									</span>
								</div>
								<Separator />
								{selectedPost.content ? (
									<div className="prose prose-gray dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-blockquote:text-muted-foreground prose-li:text-foreground space-y-4">
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
											rehypePlugins={[rehypeRaw, rehypeSanitize]}
											components={markdownComponents}
										>
											{selectedPost.content}
										</ReactMarkdown>
									</div>
								) : (
									<p className="text-muted-foreground">
										No content available. Click "Open Original" to read the full
										article.
									</p>
								)}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-center gap-4">
								<div className="text-muted-foreground">
									<p className="text-lg font-medium">No post selected</p>
									<p className="text-sm">
										Select a post from the sidebar to read it here
									</p>
								</div>
							</div>
						)}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</main>
	);
}

export default Dashboard;
