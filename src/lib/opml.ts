import type { RSSFeedId } from "./scheme";

export interface OPMLFeed {
	title: string;
	feedUrl: string;
	description?: string;
	category?: string;
}

export interface RSSFeed {
	id: RSSFeedId;
	feedUrl: string;
	title: string;
	description: string | null;
	category: string | null;
	dateUpdated: string | null;
	isDeleted: number;
}

/**
 * Generate OPML XML from feeds
 */
export function generateOPML(feeds: readonly RSSFeed[]): string {
	const now = new Date().toUTCString();
	const categories = new Map<string, RSSFeed[]>();

	// Group feeds by category
	for (const feed of feeds) {
		const category = feed.category || "Uncategorized";
		if (!categories.has(category)) {
			categories.set(category, []);
		}
		categories.get(category)?.push(feed);
	}

	let outlines = "";

	// Generate outline elements
	for (const [category, categoryFeeds] of categories) {
		outlines += `\n    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">`;
		for (const feed of categoryFeeds) {
			const description = feed.description || "";
			outlines += `\n      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.feedUrl)}" description="${escapeXml(description)}"/>`;
		}
		outlines += "\n    </outline>";
	}

	const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Alcove Feeds</title>
    <dateCreated>${now}</dateCreated>
  </head>
  <body>${outlines}
  </body>
</opml>`;

	return opml;
}

/**
 * Parse OPML XML and extract feeds
 */
export function parseOPML(opmlContent: string): OPMLFeed[] {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(opmlContent, "text/xml");

	// Check for parsing errors
	const parserError = xmlDoc.querySelector("parsererror");
	if (parserError) {
		throw new Error("Invalid OPML file: XML parsing failed");
	}

	const feeds: OPMLFeed[] = [];
	const outlines = xmlDoc.querySelectorAll("outline");

	for (const outline of outlines) {
		const type = outline.getAttribute("type");
		const xmlUrl = outline.getAttribute("xmlUrl");

		// If this outline has an xmlUrl, it's a feed
		if (xmlUrl) {
			const feed: OPMLFeed = {
				title:
					outline.getAttribute("title") ||
					outline.getAttribute("text") ||
					"Untitled Feed",
				feedUrl: xmlUrl,
				description: outline.getAttribute("description") || undefined,
			};

			// Try to find category from parent outline
			const parent = outline.parentElement;
			if (parent?.tagName === "outline" && !parent.getAttribute("xmlUrl")) {
				feed.category =
					parent.getAttribute("title") ||
					parent.getAttribute("text") ||
					undefined;
			}

			feeds.push(feed);
		}
	}

	if (feeds.length === 0) {
		throw new Error("No feeds found in OPML file");
	}

	return feeds;
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Download OPML file to user's device
 */
export function downloadOPML(
	opmlContent: string,
	filename = "alcove-feeds.opml",
): void {
	const blob = new Blob([opmlContent], { type: "text/xml" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
