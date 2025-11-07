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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ChangeCategoryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentCategory: string | null;
	existingCategories: string[];
	onChangeCategory: (newCategory: string | null) => void;
}

export function ChangeCategoryDialog({
	open,
	onOpenChange,
	currentCategory,
	existingCategories,
	onChangeCategory,
}: ChangeCategoryDialogProps) {
	const [mode, setMode] = React.useState<"existing" | "new">("existing");
	const [selectedCategory, setSelectedCategory] = React.useState<string>(
		currentCategory || "",
	);
	const [newCategory, setNewCategory] = React.useState("");

	React.useEffect(() => {
		if (open) {
			setMode("existing");
			setSelectedCategory(currentCategory || "");
			setNewCategory("");
		}
	}, [open, currentCategory]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (mode === "new") {
			if (newCategory.trim()) {
				onChangeCategory(newCategory.trim());
				onOpenChange(false);
			}
		} else {
			if (selectedCategory === "uncategorized") {
				onChangeCategory(null);
			} else if (selectedCategory) {
				onChangeCategory(selectedCategory);
			}
			onOpenChange(false);
		}
	};

	// Filter out current category and "Uncategorized" from the list
	const availableCategories = existingCategories.filter(
		(cat) => cat !== "Uncategorized",
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Change Category</DialogTitle>
					<DialogDescription>
						Move this feed to a different category or create a new one.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>Choose an option</Label>
							<div className="flex gap-2">
								<Button
									type="button"
									variant={mode === "existing" ? "default" : "outline"}
									onClick={() => setMode("existing")}
									className="flex-1"
								>
									Existing Category
								</Button>
								<Button
									type="button"
									variant={mode === "new" ? "default" : "outline"}
									onClick={() => setMode("new")}
									className="flex-1"
								>
									New Category
								</Button>
							</div>
						</div>

						{mode === "existing" ? (
							<div className="grid gap-2">
								<Label htmlFor="category-select">Select Category</Label>
								<Select
									value={selectedCategory}
									onValueChange={setSelectedCategory}
								>
									<SelectTrigger id="category-select">
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="uncategorized">Uncategorized</SelectItem>
										{availableCategories.map((cat) => (
											<SelectItem key={cat} value={cat}>
												{cat}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : (
							<div className="grid gap-2">
								<Label htmlFor="new-category">New Category Name</Label>
								<Input
									id="new-category"
									value={newCategory}
									onChange={(e) => setNewCategory(e.target.value)}
									placeholder="Enter category name"
									maxLength={50}
									autoFocus
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={
								mode === "new" ? !newCategory.trim() : !selectedCategory
							}
						>
							Change Category
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
