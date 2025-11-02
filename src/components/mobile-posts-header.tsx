import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobilePostsHeaderProps {
	feedTitle: string;
	onBack: () => void;
}

export function MobilePostsHeader({
	feedTitle,
	onBack,
}: MobilePostsHeaderProps) {
	return (
		<div className="flex items-center gap-2 px-2 pt-2">
			<Button
				variant="ghost"
				size="sm"
				onClick={onBack}
				className="h-8 w-8 p-0"
			>
				<ChevronLeft className="size-5" />
			</Button>
			<div className="flex-1 text-left text-xl">
				<span className="truncate font-bold">{feedTitle}</span>
			</div>
		</div>
	);
}
