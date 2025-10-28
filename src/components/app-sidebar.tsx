"use client";

import * as React from "react";
import {
	ArchiveX,
	Circle,
	Command,
	File,
	Inbox,
	Plus,
	RotateCw,
	Send,
	Star,
	Trash2,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import { Label } from "@/components/ui/label";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInput,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";

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
import { allFeedsQuery, useEvolu, reset } from "@/lib/evolu";
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
import { useQuery } from "@evolu/react";
const parser = new XMLParser();

// This is sample data
const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	navMain: [
		{
			title: "Today",
			url: "#",
			icon: Inbox,
			isActive: true,
		},
		{
			title: "Unread",
			url: "#",
			icon: Circle,
			isActive: false,
		},
		{
			title: "Starred",
			url: "#",
			icon: Star,
			isActive: false,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	// Note: I'm using state to show active item.
	// IRL you should use the url/router.
	const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
	const [urlInput, setUrlInput] = React.useState("");
	const [categoryInput, setCategoryInput] = React.useState("");
	const { setOpen } = useSidebar();
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const { insert, update } = useEvolu();
	const allFeeds = useQuery(allFeedsQuery);
	console.log(allFeeds);

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
				category: "tech",
			});
			console.log(result);

			// Process posts/entries
			for (const post of posts) {
				const addPost = insert("rssPost", {
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
				});
				console.log(addPost);
			}
			setDialogOpen(false);
		} catch (error) {
			console.log(error);
		}
	}

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<Sidebar
				collapsible="icon"
				className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
				{...props}
			>
				{/* This is the first sidebar */}
				{/* We disable collapsible and adjust width to icon. */}
				{/* This will make the sidebar appear as icons. */}
				<Sidebar
					collapsible="none"
					className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
				>
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
									<a href="#">
										<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
											<Command className="size-4" />
										</div>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">Acme Inc</span>
											<span className="truncate text-xs">Enterprise</span>
										</div>
									</a>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>
					<SidebarContent>
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
						<SidebarGroup>
							<SidebarGroupContent className="px-1.5 md:px-0">
								<SidebarMenu>
									<DialogTrigger>
										<SidebarMenuItem>
											<SidebarMenuButton
												size="lg"
												asChild
												className="md:h-8 md:p-0"
											>
												<a href="#">
													<div className="flex aspect-square size-8 items-center justify-center rounded-lg">
														<Plus className="size-4" />
													</div>
													<div className="grid flex-1 text-left text-sm leading-tight">
														<span className="truncate font-medium">
															Add Feed
														</span>
													</div>
												</a>
											</SidebarMenuButton>
										</SidebarMenuItem>
									</DialogTrigger>
									<SidebarMenuItem>
										<SidebarMenuButton onClick={reset}>
											<RotateCw className="size-4" />
										</SidebarMenuButton>
									</SidebarMenuItem>
									{data.navMain.map((item) => (
										<SidebarMenuItem key={item.title}>
											<SidebarMenuButton
												tooltip={{
													children: item.title,
													hidden: false,
												}}
												onClick={() => {
													setActiveItem(item);
													const mail = data.mails.sort(
														() => Math.random() - 0.5,
													);
													setMails(
														mail.slice(
															0,
															Math.max(5, Math.floor(Math.random() * 10) + 1),
														),
													);
													setOpen(true);
												}}
												isActive={activeItem?.title === item.title}
												className="px-2.5 md:px-2"
											>
												<item.icon />
												<span>{item.title}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
					<SidebarFooter>
						<NavUser user={data.user} />
					</SidebarFooter>
				</Sidebar>

				{/* This is the second sidebar */}
				{/* We disable collapsible and let it fill remaining space */}
				<Sidebar collapsible="none" className="hidden flex-1 md:flex">
					<SidebarHeader className="gap-3.5 border-b p-4">
						<div className="flex w-full items-center justify-between">
							<div className="text-foreground text-base font-medium">
								{activeItem?.title}
							</div>
							<Label className="flex items-center gap-2 text-sm">
								<span>Unreads</span>
								<Switch className="shadow-none" />
							</Label>
						</div>
						<SidebarInput placeholder="Type to search..." />
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup className="px-0">
							<SidebarGroupContent>
								{allFeeds.map((feed) => (
									<a
										href="#"
										key={feed.id}
										className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0"
									>
										<div className="flex w-full items-center gap-2">
											<span>{feed.title}</span>{" "}
										</div>
									</a>
								))}
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>
				</Sidebar>
			</Sidebar>
		</Dialog>
	);
}
