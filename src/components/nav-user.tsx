import {
	BadgeCheck,
	Bell,
	BookKey,
	Copy,
	CreditCard,
	Eye,
	EyeOff,
	LogOut,
	Sparkles,
	Upload,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { use, useState } from "react";
import { useEvolu } from "@/lib/evolu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { Mnemonic } from "@evolu/common";

export function NavUser() {
	const { isMobile } = useSidebar();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
	const [backupPhrase, setBackupPhrase] = useState<Mnemonic | null>();
	const [isRevealed, setIsRevealed] = useState(false);
	const [isCopied, setIsCopied] = useState(false);
	const [restoreMnemonic, setRestoreMnemonic] = useState("");

	function maskPhrase(phrase: string | null | undefined) {
		if (!phrase) return "";
		const words = phrase
			.trim()
			.split(/\s+/)
			.filter((word) => word.length > 0);
		return words.map((word) => "•".repeat(word.length)).join(" ");
	}

	const evolu = useEvolu();
	const owner = use(evolu.appOwner);

	function backup() {
		setBackupPhrase(owner.mnemonic);
	}

	function copyToClipboard() {
		if (backupPhrase) {
			navigator.clipboard.writeText(backupPhrase);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		}
	}

	function handleDialogOpenChange(open: boolean) {
		setIsDialogOpen(open);
		if (open) {
			backup();
		} else {
			// Reset state when dialog closes
			setIsRevealed(false);
			setIsCopied(false);
		}
	}

	function handleRestoreDialogOpenChange(open: boolean) {
		setIsRestoreDialogOpen(open);
		if (!open) {
			setRestoreMnemonic("");
		}
	}

	function handleRestore() {
		if (restoreMnemonic.trim()) {
			evolu.restoreAppOwner(restoreMnemonic as Mnemonic);
			setIsRestoreDialogOpen(false);
			setRestoreMnemonic("");
		}
	}

	return (
		<>
			<Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
								>
									<div className="grid flex-1 text-center text-sm leading-tight">
										<span className="truncate font-medium">Settings</span>
									</div>
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
								side={isMobile ? "bottom" : "right"}
								align="end"
								sideOffset={4}
							>
								<DropdownMenuGroup>
									<DialogTrigger asChild>
										<DropdownMenuItem>
											<BookKey />
											Backup
										</DropdownMenuItem>
									</DialogTrigger>
									<DropdownMenuItem
										onClick={() => setIsRestoreDialogOpen(true)}
									>
										<Upload />
										Restore
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem>
										<BadgeCheck />
										Account
									</DropdownMenuItem>
									<DropdownMenuItem>
										<CreditCard />
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Bell />
										Notifications
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<LogOut />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Backup or Export Your Account</DialogTitle>
						<DialogDescription>
							Alcove does not have access to your data since it's encrypted. In
							order to recover it or access it from another device you need to
							copy the phrase below somewhere safe.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="relative p-4 bg-muted rounded-lg font-mono text-sm break-all">
							{isRevealed ? backupPhrase : maskPhrase(backupPhrase)}
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsRevealed(!isRevealed)}
								className="flex-1"
							>
								{isRevealed ? (
									<>
										<EyeOff className="h-4 w-4 mr-2" />
										Hide
									</>
								) : (
									<>
										<Eye className="h-4 w-4 mr-2" />
										Reveal
									</>
								)}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={copyToClipboard}
								className="flex-1"
							>
								<Copy className="h-4 w-4 mr-2" />
								{isCopied ? "Copied!" : "Copy"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			<Dialog
				open={isRestoreDialogOpen}
				onOpenChange={handleRestoreDialogOpenChange}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Restore from Backup</DialogTitle>
						<DialogDescription>
							Enter your backup phrase to restore your account and access your
							encrypted data.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<textarea
							className="w-full p-4 bg-muted rounded-lg font-mono text-sm resize-none min-h-[100px]"
							placeholder="Enter your backup phrase here..."
							value={restoreMnemonic}
							onChange={(e) => setRestoreMnemonic(e.target.value)}
						/>
						<Button
							onClick={handleRestore}
							disabled={!restoreMnemonic.trim()}
							className="w-full"
						>
							<Upload className="h-4 w-4 mr-2" />
							Restore Account
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
