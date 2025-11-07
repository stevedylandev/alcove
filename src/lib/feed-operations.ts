import { XMLParser } from "fast-xml-parser";
import { COMMON_FEED_PATHS } from "./feed-discovery";

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	textNodeName: "#text",
	cdataPropName: "__cdata",
	parseAttributeValue: true,
	trimValues: true,
});

export interface ParsedFeedData {
	feedData: any;
	posts: any[];
	isAtom: boolean;
}

/**
 * Fetches XML data from a URL with CORS fallback
 */
export async function fetchFeedWithFallback(url: string): Promise<string> {
	try {
		// Try to fetch directly first
		const response = await fetch(url);
		return await response.text();
	} catch {
		// Fall back to CORS proxy if direct fetch fails
		const response = await fetch(
			`https://corsproxy.io/?url=${encodeURIComponent(url)}`,
		);
		return await response.text();
	}
}

/**
 * Parses XML data and determines if it's RSS or Atom feed
 */
export function parseFeedXml(xmlData: string): ParsedFeedData {
	let parsedXmlData: any;

	try {
		parsedXmlData = parser.parse(xmlData);
	} catch (error) {
		throw new Error(
			`XML parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	// Determine if it's RSS or Atom feed
	let feedData: any;
	let posts: any[];
	let isAtom = false;

	if (parsedXmlData.rss) {
		// RSS feed
		feedData = parsedXmlData.rss.channel;
		if (!feedData) {
			throw new Error("RSS feed missing channel element");
		}
		const items = feedData.item || [];
		// Ensure posts is always an array (single item might not be in array)
		posts = Array.isArray(items) ? items : items ? [items] : [];
	} else if (parsedXmlData.feed) {
		// Atom feed
		feedData = parsedXmlData.feed;
		const entries = feedData.entry || [];
		// Ensure posts is always an array (single entry might not be in array)
		posts = Array.isArray(entries) ? entries : entries ? [entries] : [];
		isAtom = true;
	} else if (parsedXmlData["rdf:RDF"]) {
		// RDF/RSS 1.0 feed
		feedData = parsedXmlData["rdf:RDF"].channel;
		const items = parsedXmlData["rdf:RDF"].item || [];
		posts = Array.isArray(items) ? items : items ? [items] : [];
		isAtom = false;
	} else {
		// Log available root elements for debugging
		const rootKeys = Object.keys(parsedXmlData);
		throw new Error(
			`Unsupported feed format. Found root elements: ${rootKeys.join(", ")}`,
		);
	}

	// Filter out empty objects from posts array
	posts = posts.filter((post) => post && Object.keys(post).length > 0);

	return { feedData, posts, isAtom };
}

/**
 * Discovers RSS/Atom feed URL from a website URL
 */
export async function discoverFeed(websiteUrl: string): Promise<{
	feedUrl: string;
	xmlData: string;
} | null> {
	const urlObj = new URL(websiteUrl);
	const origin = urlObj.origin;

	for (const path of COMMON_FEED_PATHS) {
		const testUrl = `${origin}${path}`;

		try {
			// Use CORS proxy to avoid CORS issues
			const response = await fetch(
				`https://corsproxy.io/?url=${encodeURIComponent(testUrl)}`,
			);

			if (response.ok) {
				const text = await response.text();
				// Quick check if it looks like XML
				if (
					text.trim().startsWith("<?xml") ||
					text.includes("<rss") ||
					text.includes("<feed")
				) {
					return { feedUrl: testUrl, xmlData: text };
				}
			}
		} catch (error) {
			continue;
		}
	}

	return null;
}

/**
 * Checks if a URL looks like a direct feed URL
 */
export function looksLikeFeedUrl(url: string): boolean {
	return (
		url.includes("/feed") ||
		url.includes("/rss") ||
		url.includes(".xml") ||
		url.includes("/atom")
	);
}

/**
 * Extracts YouTube channel ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/@ChannelHandle
 * - https://www.youtube.com/channel/UC...
 * - https://www.youtube.com/c/ChannelName
 * - https://www.youtube.com/user/Username
 */
export async function extractYouTubeChannelId(
	url: string,
): Promise<string | null> {
	try {
		// Direct channel ID format
		if (url.includes("/channel/")) {
			const match = url.match(/\/channel\/([^/?]+)/);
			return match ? match[1] : null;
		}

		// Handle @ format - need to fetch the page to get channel ID
		if (url.includes("/@")) {
			const handle = url.match(/\/@([^/?]+)/)?.[1];
			if (!handle) return null;

			// Fetch the YouTube page to extract the channel ID from meta tags
			try {
				const response = await fetch(
					`https://corsproxy.io/?url=${encodeURIComponent(url)}`,
				);
				const html = await response.text();

				// Look for channel ID in various places
				const channelIdMatch = html.match(/channelId":"([^"]+)"/);
				if (channelIdMatch) {
					return channelIdMatch[1];
				}

				// Alternative: look in meta tags
				const metaMatch = html.match(
					/<meta itemprop="channelId" content="([^"]+)">/,
				);
				if (metaMatch) {
					return metaMatch[1];
				}

				// Alternative: look in link tags
				const linkMatch = html.match(
					/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/([^"]+)">/,
				);
				if (linkMatch) {
					return linkMatch[1];
				}
			} catch (error) {
				console.error("Failed to fetch YouTube page for channel ID:", error);
				return null;
			}
		}

		// For /c/ and /user/ formats, we also need to fetch the page
		if (url.includes("/c/") || url.includes("/user/")) {
			try {
				const response = await fetch(
					`https://corsproxy.io/?url=${encodeURIComponent(url)}`,
				);
				const html = await response.text();

				const channelIdMatch = html.match(/channelId":"([^"]+)"/);
				if (channelIdMatch) {
					return channelIdMatch[1];
				}
			} catch (error) {
				console.error("Failed to fetch YouTube page for channel ID:", error);
				return null;
			}
		}

		return null;
	} catch (error) {
		console.error("Error extracting YouTube channel ID:", error);
		return null;
	}
}

/**
 * Converts YouTube channel URL to RSS feed URL
 */
export async function convertYouTubeUrlToFeed(
	url: string,
): Promise<string | null> {
	const channelId = await extractYouTubeChannelId(url);
	if (!channelId) return null;

	return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * Checks if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
	return url.includes("youtube.com") || url.includes("youtu.be");
}

/**
 * Extracts YouTube video ID from a video URL
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
	try {
		// Standard watch URL
		const watchMatch = url.match(/[?&]v=([^&]+)/);
		if (watchMatch) return watchMatch[1];

		// Short URL format
		const shortMatch = url.match(/youtu\.be\/([^?]+)/);
		if (shortMatch) return shortMatch[1];

		// Embed URL format
		const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
		if (embedMatch) return embedMatch[1];

		return null;
	} catch {
		return null;
	}
}

/**
 * Checks if a post is from a YouTube feed
 */
export function isYouTubePost(feedUrl: string | null): boolean {
	if (!feedUrl) return false;
	return feedUrl.includes("youtube.com/feeds/videos.xml");
}

/**
 * Extracts post link from RSS or Atom post entry
 */
export function extractPostLink(post: any, isAtom: boolean): string {
	if (isAtom) {
		// Handle Atom link which can be string, object, or array
		if (typeof post.link === "string") {
			return post.link || post.id || "#";
		} else if (Array.isArray(post.link)) {
			// Find 'alternate' link or use first link
			const alternateLink = post.link.find(
				(l: any) => l["@_rel"] === "alternate" || !l["@_rel"],
			);
			return (
				alternateLink?.["@_href"] || post.link[0]?.["@_href"] || post.id || "#"
			);
		} else if (post.link && typeof post.link === "object") {
			return post.link["@_href"] || post.id || "#";
		}
		return post.id || "#";
	}

	// RSS feed
	const link = post.link || post.guid || post.id;
	if (!link) return "#";

	// Handle link as object (sometimes RSS parsers do this)
	if (typeof link === "object") {
		return link["#text"] || link.__cdata || "#";
	}

	return String(link);
}

/**
 * Extracts author from RSS or Atom post entry
 */
export function extractPostAuthor(
	post: any,
	isAtom: boolean,
	feedTitle: string,
): string {
	if (isAtom) {
		// Atom can have author as object with name property
		const author = post.author;
		if (typeof author === "object" && author !== null) {
			return author.name || author["#text"] || feedTitle;
		}
		return author || feedTitle;
	}

	// RSS feed
	const author = post.author || post["dc:creator"] || post.creator;
	if (!author) return feedTitle;

	// Handle author as object
	if (typeof author === "object") {
		return author["#text"] || author.__cdata || feedTitle;
	}

	return String(author);
}

/**
 * Extracts content from RSS or Atom post entry
 */
export function extractPostContent(post: any, postLink?: string): string {
	// Try various content fields in order of preference
	const content =
		post["content:encoded"] || post.content || post.description || post.summary;

	// Default fallback message
	const fallbackMessage = postLink
		? `<p><a href="${postLink}" target="_blank" rel="noopener noreferrer">View post</a></p>`
		: "Please open on the web";

	// Handle different content structures
	if (typeof content === "string") {
		const trimmed = content.trim();
		return trimmed.length > 0 ? trimmed : fallbackMessage;
	} else if (content && typeof content === "object") {
		// Handle CDATA or nested text
		const extracted = content.__cdata || content["#text"] || "";
		const trimmed = String(extracted).trim();
		return trimmed.length > 0 ? trimmed : fallbackMessage;
	}

	// No content found - this is fine for link-only feeds
	return fallbackMessage;
}

/**
 * Extracts published date from RSS or Atom post entry
 */
export function extractPostDate(post: any): string {
	try {
		const dateValue = post.pubDate || post.updated || post.published;
		if (!dateValue) {
			return new Date().toISOString(); // Use current date if no date found
		}
		const parsedDate = new Date(dateValue);
		// Check if date is valid
		if (isNaN(parsedDate.getTime())) {
			return new Date().toISOString();
		}
		return parsedDate.toISOString();
	} catch {
		return new Date().toISOString();
	}
}

/**
 * Extract string value from various data types
 */
function extractStringValue(value: any): string {
	if (!value) return "";
	if (typeof value === "string") return value;

	// Handle objects that might contain text
	if (typeof value === "object") {
		// Try common text properties
		if (value.__cdata) return String(value.__cdata);
		if (value["#text"]) return String(value["#text"]);
		if (value.text) return String(value.text);
		// Last resort: try to convert to string
		return "";
	}

	// For numbers, booleans, etc.
	return String(value);
}

/**
 * Safely truncate a string to a maximum length
 */
export function truncateString(str: any, maxLength: number): string {
	const strValue = extractStringValue(str);
	if (!strValue) return "";
	const trimmed = strValue.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return trimmed.substring(0, maxLength - 3) + "...";
}

/**
 * Validate and sanitize feed data for insertion
 */
export function sanitizeFeedData(feedData: any, feed?: any) {
	// Extract title from feedData or feed, handling various formats
	const titleValue = feedData?.title || feed?.title || "Untitled Feed";
	const descValue =
		feedData?.description || feedData?.subtitle || feed?.description || "";

	return {
		title: truncateString(titleValue, 200),
		description: truncateString(descValue, 1000),
	};
}

/**
 * Validate and sanitize post data for insertion
 */
export function sanitizePostData(
	post: any,
	isAtom: boolean,
	feedTitle: string,
) {
	return {
		title: truncateString(post.title || "Untitled", 1000),
		author: truncateString(extractPostAuthor(post, isAtom, feedTitle), 200),
		link: truncateString(extractPostLink(post, isAtom), 1000),
	};
}
