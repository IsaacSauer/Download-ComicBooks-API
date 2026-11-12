import * as cheerio from 'cheerio';

import { fetchHtml, mapLimit } from './lib/http';
import type { StripInfoComic } from './types';

const BASE_URL = 'https://stripinfo.be';
const SEARCH_URL = `${BASE_URL}/zoek/zoek?zoekstring=`;

/** How many edition blocks to fetch at once. */
const CONCURRENCY = 3;

type Page = cheerio.CheerioAPI;

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Turns a relative link into a full stripinfo.be URL. */
const absolute = (href: string | undefined, base: string): string | undefined =>
    href ? new globalThis.URL(href, base).toString() : undefined;

/** Finds the first album page link (`/reeks/strip/...`) in the search results. */
const findAlbumUrl = ($: Page, pageUrl: string): string | undefined => {
    // The site header also links to a random album, so only look in the page body.
    const href = $('.grid a[href*="/reeks/strip/"]').first().attr('href');
    return absolute(href, pageUrl);
};

/** Reads every edition block (`schema.org/ComicIssue`) on a page. */
const parseEditions = ($: Page, pageUrl: string, series: string | undefined): StripInfoComic[] =>
    $('[itemtype="https://schema.org/ComicIssue"]').toArray().map(el => {
        const block = $(el);
        const heading = block.find('h2.title').first();

        const details: Record<string, string> = {};
        block.find('table.innerDividers tr').each((_, tr) => {
            const cells = $(tr).find('td');
            const label = clean(cells.first().text());
            if (label) details[ label ] = clean(cells.eq(1).text());
        });

        const year = Number.parseInt(details[ 'Jaar' ] ?? '', 10);

        return {
            title: clean(heading.find('[itemprop="name"]').text()),
            series,
            issueNumber: clean(heading.find('[itemprop="issueNumber"]').text()) || undefined,
            year: Number.isNaN(year) ? undefined : year,
            image: absolute(block.find('.stripThumb img').first().attr('src'), pageUrl),
            url: absolute(heading.find('a[itemprop="url"]').attr('href'), pageUrl) ?? pageUrl,
            details,
        };
    });

/**
 * Reads all editions of an album. The page shows one edition directly and
 * loads the others separately (the `loadStripBlock` URLs), so those are fetched too.
 */
const scrapeAlbum = async (albumUrl: string): Promise<StripInfoComic[]> => {
    const $ = cheerio.load(await fetchHtml(albumUrl));
    const series = clean($('h1 a[href*="/reeks/index/"]').first().find('img').attr('alt')
        ?? $('h1 a[href*="/reeks/index/"]').first().text()) || undefined;

    const editions = parseEditions($, albumUrl, series);

    const blockUrls = $('.loadAjaxData').toArray()
        .map(el => absolute($(el).attr('data-ajaxUrl') ?? $(el).attr('data-ajaxurl'), albumUrl))
        .filter((url): url is string => !!url && url.includes('/loadStripBlock/'));

    const otherEditions = await mapLimit(blockUrls, CONCURRENCY,
        async url => parseEditions(cheerio.load(await fetchHtml(url)), albumUrl, series));

    return [ ...editions, ...otherEditions.flat() ];
};

/** Picks the edition with the highest year ("Jaar"). Editions without a year come last. */
const mostRecent = (editions: StripInfoComic[]): StripInfoComic | undefined =>
    editions.reduce<StripInfoComic | undefined>(
        (best, e) => (best === undefined || (e.year ?? -Infinity) > (best.year ?? -Infinity) ? e : best),
        undefined,
    );

/** Every edition stripinfo.be lists for the album that matches this ISBN. Empty if not found. */
export const getAllEditionsByIsbn = async (isbn: string): Promise<StripInfoComic[]> => {
    const query = isbn.replace(/[\s-]/g, '');
    if (!query) throw new Error('ISBN is empty');

    const searchUrl = SEARCH_URL + encodeURIComponent(query);
    const $ = cheerio.load(await fetchHtml(searchUrl));

    const albumUrl = findAlbumUrl($, searchUrl);
    return albumUrl ? scrapeAlbum(albumUrl) : [];
};

/**
 * Looks up a comic on stripinfo.be by ISBN and returns its most recent edition
 * (highest "Jaar") with cover image. Returns undefined if the ISBN isn't found.
 *
 * @example
 * const comic = await getComicByIsbn('9789462102828');
 * // { title: 'De grote knoeiboel', series: 'Jommeke', year: 2015, image: 'https://stripinfo.be/image.php?...', ... }
 */
export const getComicByIsbn = async (isbn: string): Promise<StripInfoComic | undefined> =>
    mostRecent(await getAllEditionsByIsbn(isbn));
