import { ChevronRight } from "lucide-react";

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
	title: string | null;
	category: string | null;
}

interface NavFeedsProps {
	feeds: readonly Feed[];
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

	// Sort feeds within each category alphabetically by title
	Object.keys(feedsByCategory).forEach((category) => {
		feedsByCategory[category].sort((a, b) =>
			(a.title || "").localeCompare(b.title || ""),
		);
	});

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
						All Feeds
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
												<span>{feed.title || "Untitled"}</span>
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
