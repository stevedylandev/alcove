import { MoreVertical, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface Post {
	id: string;
	title: string | null;
	author: string | null;
	publishedDate: string | null;
	link: string | null;
	feedId: string | null;
	content: string | null;
}

interface PostsListProps {
	posts: Post[];
	selectedPostId: string | null;
	onPostSelect: (postId: string) => void;
	searchQuery: string;
	onSearchChange: (query: string) => void;
	feedTitle?: string;
	isPostRead: (postId: string) => boolean;
	onMarkAllAsRead: () => void;
	onMarkAllAsUnread: () => void;
	onDeleteFeed?: () => void;
	selectedFeedId?: string | null;
	className?: string;
}

export function PostsList({
	posts,
	selectedPostId,
	onPostSelect,
	searchQuery,
	onSearchChange,
	feedTitle = "All Posts",
	isPostRead,
	onMarkAllAsRead,
	onMarkAllAsUnread,
	onDeleteFeed,
	selectedFeedId,
	className = "",
}: PostsListProps) {
	return (
		<div className={`flex h-screen flex-col border-r ${className}`}>
			<div className="gap-2 border-b p-3 flex flex-col">
				<div className="flex w-full items-center justify-between gap-2">
					<div className="text-foreground text-sm font-semibold truncate">
						{feedTitle}
					</div>
					<div className="flex items-center gap-1">
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{posts.length}
						</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={onMarkAllAsRead}>
									<Check className="h-4 w-4 mr-2" />
									Mark all as read
								</DropdownMenuItem>
								<DropdownMenuItem onClick={onMarkAllAsUnread}>
									<X className="h-4 w-4 mr-2" />
									Mark all as unread
								</DropdownMenuItem>
								{selectedFeedId && onDeleteFeed && (
									<DropdownMenuItem
										onClick={onDeleteFeed}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete feed
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
				<Input
					placeholder="Search..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="h-8"
				/>
			</div>
			<div className="flex-1 overflow-y-auto">
				{posts.length === 0 ? (
					<div className="p-4 text-center text-sm text-muted-foreground">
						No posts found
					</div>
				) : (
					posts.map((post) => {
						const isRead = isPostRead(post.id);
						return (
							<button
								type="button"
								key={post.id}
								onClick={() => onPostSelect(post.id)}
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
	);
}
