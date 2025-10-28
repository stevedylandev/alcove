"use client";

import * as React from "react";
import {
	ChartNoAxesColumnIcon,
	ChartNoAxesGanttIcon,
	CircleSlash2,
	Command,
	Plus,
	RotateCw,
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
	SidebarInput,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	allFeedsQuery,
	allPostsQuery,
	postsByFeedQuery,
	useEvolu,
	reset,
} from "@/lib/evolu";
import { XMLParser } from "fast-xml-parser";
import { useQuery } from "@evolu/react";
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
	const { setOpen } = useSidebar();
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");

	const { insert, update } = useEvolu();
	const allFeeds = useQuery(allFeedsQuery);

	// Get posts based on selected feed
	const allPosts = useQuery(allPostsQuery);
	const feedPostsQuery = useQuery(postsByFeedQuery(selectedFeedId || ""));
	const feedPosts = selectedFeedId ? feedPostsQuery : allPosts;

	// Filter posts by search query
	const filteredPosts = React.useMemo(() => {
		if (!searchQuery) return feedPosts;
		return feedPosts.filter((post) =>
			post.title?.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [feedPosts, searchQuery]);

	async function addFeed() {
		try {
			let xmlData: string;
			try {
				// Try to fetch directly first
				const xmlFetch = await fetch(urlInput);
				xmlData = await xmlFetch.text();
			} catch (corsError) {
				// Fall back to AllOrigins if CORS error occurs
				console.log(corsError);
				const xmlFetch = await fetch(
					`https://api.allorigins.win/raw?url=${urlInput}`,
				);
				xmlData = await xmlFetch.text();
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
				feedUrl: urlInput,
				title: feedData.title,
				description: feedData.description || feedData.subtitle || "",
				category: categoryInput || "Uncategorized",
			});

			// Process posts/entries
			for (const post of posts) {
				insert("rssPost", {
					title: post.title,
					author: isAtom
						? post.author?.name || "Author"
						: post.author || "Author",
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
			setUrlInput("");
			setCategoryInput("");
			setDialogOpen(false);
		} catch (error) {
			console.log(error);
		}
	}

	return (
		<>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<Sidebar collapsible="icon" {...props}>
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
									<a href="#">
										<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
											<ChartNoAxesGanttIcon className="size-4" />
										</div>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">Alcove</span>
											<span className="truncate text-xs">RSS Reader</span>
										</div>
									</a>
								</SidebarMenuButton>
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
							Add a new feed with the RSS URL
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
							/>
						</div>
						<div className="grid gap-3">
							<Label htmlFor="category-input">Category</Label>
							<Input
								id="category-input"
								name="category"
								value={categoryInput}
								onChange={(e) => setCategoryInput(e.target.value)}
								placeholder="e.g., Tech, News, Blogs"
							/>
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button onClick={addFeed} type="submit">
							Submit
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Posts List Panel - Separate from main sidebar */}
			<div className="bg-sidebar text-sidebar-foreground hidden md:flex overflow-y-scroll h-screen w-[320px] flex-col border-r">
				<div className="gap-2 border-b p-3 flex flex-col">
					<div className="flex w-full items-center justify-between">
						<div className="text-foreground text-sm font-semibold truncate">
							{selectedFeedId
								? allFeeds.find((f) => f.id === selectedFeedId)?.title ||
									"Posts"
								: "All Posts"}
						</div>
						<span className="text-muted-foreground text-xs whitespace-nowrap ml-2">
							{filteredPosts.length}
						</span>
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
						filteredPosts.map((post) => (
							<button
								key={post.id}
								onClick={() => onPostSelect(post.id)}
								className={`hover:bg-sidebar-accent flex flex-col items-start gap-1.5 border-b px-3 py-3 text-sm text-left w-full last:border-b-0 transition-colors ${
									selectedPostId === post.id ? "bg-sidebar-accent" : ""
								}`}
							>
								<span className="font-medium line-clamp-2 leading-snug">
									{post.title}
								</span>
								{post.author && (
									<span className="text-muted-foreground text-xs">
										{post.author}
									</span>
								)}
							</button>
						))
					)}
				</div>
			</div>
		</>
	);
}
