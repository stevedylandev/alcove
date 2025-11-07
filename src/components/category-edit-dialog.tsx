import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentCategory: string;
	onRename: (newName: string) => void;
}

export function CategoryEditDialog({
	open,
	onOpenChange,
	currentCategory,
	onRename,
}: CategoryEditDialogProps) {
	const [newName, setNewName] = React.useState(currentCategory);

	React.useEffect(() => {
		setNewName(currentCategory);
	}, [currentCategory]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim() && newName !== currentCategory) {
			onRename(newName.trim());
			onOpenChange(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Rename Category</DialogTitle>
					<DialogDescription>
						Rename "{currentCategory}" to a new name. This will update all feeds
						in this category.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="category-name">Category Name</Label>
							<Input
								id="category-name"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="Enter category name"
								maxLength={50}
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!newName.trim()}>
							Rename
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
