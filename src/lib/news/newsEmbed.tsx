import { Button, Container, MediaGallery, MediaGalleryItem, Section, Separator, TextDisplay } from "commandkit";
import { ButtonStyle, Colors, SeparatorSpacingSize } from "discord.js";
import type { RSSArticle } from "./newsRSS.ts";

const NEWSPAPER_ICON = "<:newspaper_bold_96px_00aeef:1494581919185371156>";
const WARNING_ICON = "<:warningcircle_bold_96px_ff3333:1494581625571512330>";
const RSS_ICON = "<:rsssimple_bold_96px_00aeef:1494581920808566826>";

/** Discord `<t:unix:style>`; seconds from `pubDateMs`. */
function formatPublishedTimestampLine(pubDateMs: number): string | null {
	if (pubDateMs <= 0) {
		return null;
	}
	const unixSeconds = Math.floor(pubDateMs / 1000);
	return `-# Published <t:${String(unixSeconds)}:R>`;
}

function pushArticleBlocks(blocks: unknown[], article: RSSArticle): void {
	if (article.imageURL) {
		blocks.push(
			<MediaGallery>
				<MediaGalleryItem url={article.imageURL} />
			</MediaGallery>,
		);
	}

	const title = `**${article.title.trim()}**`;
	const published = formatPublishedTimestampLine(article.pubDateMs);
	const sectionBody = published !== null ? `${title}\n${published}` : title;

	blocks.push(
		<Section>
			<Button label="Read More" style={ButtonStyle.Link} url={article.link} />
			<TextDisplay>{sectionBody}</TextDisplay>
		</Section>,
	);
	blocks.push(<Separator divider spacing={SeparatorSpacingSize.Small} />);
}

function buildDigestArticleBlocks(articles: readonly RSSArticle[]) {
	const blocks: unknown[] = [];

	for (let i = 0; i < articles.length; i++) {
		const article = articles[i];
		if (article === undefined) {
			continue;
		}
		pushArticleBlocks(blocks, article);
	}

	return blocks;
}

export function buildNewsDigestContainer(articles: readonly RSSArticle[]) {
	return (
		<Container accentColor={0x006dd4}>
			<TextDisplay>### {NEWSPAPER_ICON} Latest Cyber News</TextDisplay>
			<Separator divider spacing={SeparatorSpacingSize.Small} />
			{buildDigestArticleBlocks(articles)}
			<TextDisplay>-# via [The Hacker News](https://thehackernews.com) {RSS_ICON}</TextDisplay>
		</Container>
	);
}

export function buildNewsCriticalAlertContainer(article: RSSArticle) {
	const blocks: unknown[] = [];
	pushArticleBlocks(blocks, article);

	return (
		<Container accentColor={Colors.Red}>
			<TextDisplay>### {WARNING_ICON} Critical Security Alert</TextDisplay>
			<Separator divider spacing={SeparatorSpacingSize.Small} />
			{blocks}
			<TextDisplay>-# via [The Hacker News](https://thehackernews.com) {RSS_ICON}</TextDisplay>
		</Container>
	);
}
