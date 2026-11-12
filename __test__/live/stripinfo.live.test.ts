// Runs against the real stripinfo.be: `npm run test:live`.
// Checks the shape of the data rather than exact values, since the site's data can change.
import { getComicByIsbn } from '../../src';

test('Jommeke 99 by ISBN returns the most recent edition', async () => {
    const comic = await getComicByIsbn('9789462102828');

    expect(comic).toMatchObject({
        title: 'De grote knoeiboel',
        series: 'Jommeke',
        issueNumber: '99',
    });
    expect(comic?.year).toBeGreaterThanOrEqual(2015);
    expect(comic?.image).toMatch(/^https:\/\/stripinfo\.be\/image\.php\?/);
    expect(comic?.url).toMatch(/^https:\/\/stripinfo\.be\/reeks\/strip\//);
});

test('unknown ISBN returns undefined', async () => {
    expect(await getComicByIsbn('9780000000002')).toBeUndefined();
});
