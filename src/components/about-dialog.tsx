import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

interface AboutDialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: React.ReactNode;
}

export function AboutDialog({
	open,
	onOpenChange,
	children,
}: AboutDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{children && <DialogTrigger asChild>{children}</DialogTrigger>}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>About</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Alcove is built on two principles: privacy, and freedom of speech.
						Those two things are becoming harder to find these days, yet blogs
						and RSS feeds provides a way out. As long as someone is publishing
						and someone else is listening, these two fundamentals can help keep
						free speech alive. Alcove accomplishes privacy through a "can't be
						evil" tech stack, which you can read more about{" "}
						<a
							className="underline"
							target="_blank"
							rel="noreferrer"
							href="https://stevedylan.dev/posts/introducing-alcove/"
						>
							here
						</a>
						. TLDR: all of your feeds and posts that you read are encrypted
						locally and synced via cryptographic keypairs. Even if we wanted to
						read your stuff, we can't.
					</p>
					<p className="text-sm text-muted-foreground">
						Due to how the encryption works, it is critical that you backup your
						account passphrase to a secure location like a password manager. If
						you clear your local browser data there is no way for us to recover
						your account or feeds, and you will need to make a new one. You can
						back it up in the settings page.
					</p>
					<p className="text-sm text-muted-foreground">
						Alcove is{" "}
						<a
							className="underline"
							href="https://github.com/stevedylandev/alcove"
							target="_blank"
							rel="noreferrer"
						>
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
	);
}
