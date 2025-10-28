"use client";

import { ChevronRight, Rss } from "lucide-react";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface Feed {
	id: string;
	title: string;
	category: string | null;
}

interface NavFeedsProps {
	feeds: Feed[];
	selectedFeedId?: string | null;
	onFeedSelect: (feedId: string | null) => void;
}

export function NavFeeds({
	feeds,
	selectedFeedId,
	onFeedSelect,
}: NavFeedsProps) {
	// Group feeds by category
	const feedsByCategory = feeds.reduce(
		(acc, feed) => {
			const category = feed.category || "Uncategorized";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(feed);
			return acc;
		},
		{} as Record<string, Feed[]>,
	);

	const categories = Object.keys(feedsByCategory).sort();

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Feeds</SidebarGroupLabel>
			<SidebarMenu>
				{/* All Feeds option */}
				<SidebarMenuItem>
					<SidebarMenuButton
						onClick={() => onFeedSelect(null)}
						isActive={selectedFeedId === null}
					>
						<Rss className="h-4 w-4" />
						<span>All Feeds</span>
					</SidebarMenuButton>
				</SidebarMenuItem>

				{/* Categories with feeds */}
				{categories.map((category) => (
					<Collapsible
						key={category}
						asChild
						defaultOpen={true}
						className="group/collapsible"
					>
						<SidebarMenuItem>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton tooltip={category}>
									<span className="font-medium">{category}</span>
									<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
									{feedsByCategory[category].map((feed) => (
										<SidebarMenuSubItem key={feed.id}>
											<SidebarMenuSubButton
												onClick={() => onFeedSelect(feed.id)}
												isActive={selectedFeedId === feed.id}
											>
												<span>{feed.title}</span>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									))}
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
