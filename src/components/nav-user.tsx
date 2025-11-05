import { BookKey, Copy, Eye, EyeOff, Info, Trash2, Upload } from "lucide-react";
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
import { useEvolu, reset } from "@/lib/evolu";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
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
	const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
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
									<DropdownMenuItem onClick={() => setIsAboutDialogOpen(true)}>
										<Info />
										About
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
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
								<DropdownMenuItem onClick={reset}>
									<Trash2 />
									Clear Data
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
			<Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>About</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Alcove is built on two principles: privacy, and freedom of speech.
							Those two things are becoming harder to find these days, yet blogs
							and RSS feeds provides a way out. As long as someone is publishing
							and someone else is listening, these two fundamentals can help
							keep free speech alive. Alcove accomplishes privacy through a
							"can't be evil" tech stack, which you can read more about{" "}
							<a className="underline" target="_blank" rel="noreferrer" href="">
								here
							</a>
							. TLDR: all of your feeds and posts that you read are encrypted
							locally and synced via cryptographic keypairs. Even if we wanted
							to read your stuff, we can't.
						</p>
						<p className="text-sm text-muted-foreground">
							Due to how the encryption works, it is critical that you backup
							your account passphrase to a secure location like a password
							manager. If you clear your local browser data there is no way for
							us to recover your account or feeds, and you will need to make a
							new one. Back it up now in the settings page!
						</p>
						<p className="text-sm text-muted-foreground">
							Alcove is{" "}
							<a className="underline" href="" target="_blank" rel="noreferrer">
								MIT open sourced
							</a>{" "}
							and run by{" "}
							<a
								className="underline"
								href="https://stevedylan.dev"
								target="_blank"
								rel="noreferrer"
							>
								Steve
							</a>
							.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
