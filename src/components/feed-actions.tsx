import { Plus, RotateCw } from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
} from "@/components/ui/sidebar";

interface FeedActionsProps {
	onAddFeed: () => void;
	onRefresh: () => void;
}

export function FeedActions({ onAddFeed, onRefresh }: FeedActionsProps) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Actions</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton onClick={onAddFeed}>
							<Plus className="size-4" />
							<span>Add Feed</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton onClick={onRefresh}>
							<RotateCw className="size-4" />
							<span>Refresh</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
