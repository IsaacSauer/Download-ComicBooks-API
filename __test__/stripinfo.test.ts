// Offline tests: axios is mocked with small copies of stripinfo.be's page layout.
import axios from 'axios';

import { getComicByIsbn, getAllEditionsByIsbn } from '../src';

jest.mock('axios');
const mockedGet = axios.get as jest.MockedFunction<typeof axios.get>;

const ALBUM = 'https://stripinfo.be/reeks/strip/335856_Jommeke_99_De_grote_knoeiboel';

const searchPage = `
<header><a href="https://stripinfo.be/reeks/strip/4468#comic+header+862"><img></a></header>
<div class="grid"><h1>Zoeken naar "9789462102828"</h1>
  <table><tr><td><a href="https://stripinfo.be/reeks/index/1885_Jommeke">Jommeke</a> 99
    <a href="${ALBUM}">De grote knoeiboel</a> (2015)</td></tr></table>
</div>`;

const noResultsPage = `
<header><a href="https://stripinfo.be/reeks/strip/4468#comic+header+862"><img></a></header>
<div class="grid"><table><tr><td>Er werden geen resultaten gevonden voor uw zoekopdracht</td></tr></table></div>`;

const edition = (id: number, year: string, image: string, publisher: string) => `
<div class="listcleanblock grid" itemprop="hasPart" itemscope itemtype="https://schema.org/ComicIssue">
  <h2 class="title"> <span itemprop="issueNumber">99</span>
    <a href="https://stripinfo.be/reeks/strip/${id}_Jommeke_99_De_grote_knoeiboel" itemprop="url"><span itemprop="name">De grote knoeiboel</span></a></h2>
  <a href="#" class="stripThumb openModal"><figure><img src="${image}" alt="Cover"></figure></a>
  <table class="innerDividers">
    <tr><td>Scenario</td><td>
      <a href="#">Jef Nys</a>
    </td></tr>
    <tr><td>Uitgever(s)</td><td><a href="#"><span itemprop="name">${publisher}</span></a></td></tr>
  </table>
  <table class="innerDividers">
    <tr><td>Jaar</td><td>${year}</td></tr>
    <tr><td>Pagina&#39;s</td><td>48</td></tr>
    <tr><td>&nbsp;</td><td>Kleur</td></tr>
  </table>
</div>`;

// The album page shows the 2010 edition directly; 2015 and 1980 are loaded as blocks.
const albumPage = `
<h1 class="c12"><a href="https://stripinfo.be/reeks/index/1885_Jommeke"><img class="pageLogo" src="logo.jpg" alt="Jommeke"></a></h1>
${edition(110441, '2010', 'https://stripinfo.be/image.php?i=300997&s=110441', 'Ballon')}
<div class="loadAjaxData" data-ajaxUrl="https://stripinfo.be/strip/loadStripBlock/335856/1885"></div>
<div class="loadAjaxData" data-ajaxUrl="https://stripinfo.be/strip/loadStripBlock/17184/1885"></div>`;

const pages: Record<string, string> = {
    'https://stripinfo.be/zoek/zoek?zoekstring=9789462102828': searchPage,
    'https://stripinfo.be/zoek/zoek?zoekstring=9780000000002': noResultsPage,
    [ ALBUM ]: albumPage,
    'https://stripinfo.be/strip/loadStripBlock/335856/1885': edition(335856, '2015', '/image.php?i=402064&s=335856', 'Ballon'),
    'https://stripinfo.be/strip/loadStripBlock/17184/1885': edition(17184, '1980', 'https://stripinfo.be/image.php?i=316171&s=17184', 'Het Volk'),
};

beforeEach(() => {
    mockedGet.mockImplementation((url: string) =>
        url in pages ? Promise.resolve({ data: pages[ url ] }) : Promise.reject(new Error(`unexpected URL ${url}`)));
});

test('returns the most recent edition (highest Jaar) with its cover image', async () => {
    expect(await getComicByIsbn('9789462102828')).toEqual({
        title: 'De grote knoeiboel',
        series: 'Jommeke',
        issueNumber: '99',
        year: 2015,
        image: 'https://stripinfo.be/image.php?i=402064&s=335856',
        url: 'https://stripinfo.be/reeks/strip/335856_Jommeke_99_De_grote_knoeiboel',
        details: { Scenario: 'Jef Nys', 'Uitgever(s)': 'Ballon', Jaar: '2015', "Pagina's": '48' },
    });
});

test('ignores the random-album link in the site header', async () => {
    await getComicByIsbn('9789462102828');
    expect(mockedGet).not.toHaveBeenCalledWith(expect.stringContaining('/reeks/strip/4468'));
});

test('reads every edition, including the separately loaded ones', async () => {
    const editions = await getAllEditionsByIsbn('9789462102828');
    expect(editions.map(e => e.year)).toEqual([ 2010, 2015, 1980 ]);
});

test('accepts ISBNs with dashes or spaces', async () => {
    expect((await getComicByIsbn(' 978-94-6210-282-8 '))?.year).toBe(2015);
});

test('returns undefined when the ISBN is not found', async () => {
    expect(await getComicByIsbn('9780000000002')).toBeUndefined();
    expect(mockedGet).toHaveBeenCalledTimes(1);
});

test('rejects an empty ISBN', async () => {
    await expect(getComicByIsbn('  ')).rejects.toThrow('ISBN is empty');
});

test('retries after HTTP 429', async () => {
    jest.useFakeTimers();
    const rateLimited = Object.assign(new Error('429'), { response: { status: 429, headers: { 'retry-after': '1' } } });
    mockedGet.mockRejectedValueOnce(rateLimited);

    const result = getComicByIsbn('9789462102828');
    await jest.advanceTimersByTimeAsync(1000);

    expect((await result)?.year).toBe(2015);
    jest.useRealTimers();
});
