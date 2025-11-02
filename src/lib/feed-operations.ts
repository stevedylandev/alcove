import { XMLParser } from "fast-xml-parser";
import { COMMON_FEED_PATHS } from "./feed-discovery";

const parser = new XMLParser();

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
	const parsedXmlData = parser.parse(xmlData);

	// Determine if it's RSS or Atom feed
	let feedData: any;
	let posts: any[];
	let isAtom = false;

	if (parsedXmlData.rss) {
		// RSS feed
		feedData = parsedXmlData.rss.channel;
		posts = feedData.item || [];
	} else if (parsedXmlData.feed) {
		// Atom feed
		feedData = parsedXmlData.feed;
		posts = feedData.entry || [];
		isAtom = true;
	} else {
		throw new Error("Unsupported feed format");
	}

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

	console.log("Trying to discover feed from:", origin);

	for (const path of COMMON_FEED_PATHS) {
		const testUrl = `${origin}${path}`;
		console.log("Testing:", testUrl);

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
					console.log("Found feed at:", testUrl);
					return { feedUrl: testUrl, xmlData: text };
				}
			}
		} catch (error) {
			console.log("Failed to fetch:", testUrl, error);
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
 * Extracts post link from RSS or Atom post entry
 */
export function extractPostLink(post: any, isAtom: boolean): string {
	if (isAtom) {
		return typeof post.link === "string"
			? post.link || post.id
			: post.link?.[0] || post.id;
	}
	return post.link || post.id;
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
		return post.author?.name || feedTitle;
	}
	return post.author || feedTitle;
}

/**
 * Extracts content from RSS or Atom post entry
 */
export function extractPostContent(post: any): string {
	return post["content:encoded"] || post.content || "Please open on the web";
}

/**
 * Extracts published date from RSS or Atom post entry
 */
export function extractPostDate(post: any): string {
	return new Date(post.pubDate || post.updated).toISOString();
}
