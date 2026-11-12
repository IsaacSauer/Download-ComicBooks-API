# Unofficial comic book lookup (stripinfo.be)

Look up a comic album on [stripinfo.be](https://stripinfo.be) by ISBN and get
its most recent edition: title, series, number, year, cover image and the
full details table.

Written in TypeScript; ships its own type definitions and works from
JavaScript too.

## How it works

1. Searches `https://stripinfo.be/zoek/zoek?zoekstring=<ISBN>`.
2. Opens the first album page (`https://stripinfo.be/reeks/strip/...`) in the results.
3. Reads every edition listed on that album page, including the ones the page
   loads separately.
4. Returns the edition with the highest year ("Jaar"), with its cover image.

## Example

```ts
import { getComicByIsbn } from "comicbooks-api";

const comic = await getComicByIsbn("9789462102828");
```

```js
const { getComicByIsbn } = require("comicbooks-api");

getComicByIsbn("9789462102828").then(console.log);
```

Result:

```js
{
  title: "De grote knoeiboel",
  series: "Jommeke",
  issueNumber: "99",
  year: 2015,
  image: "https://stripinfo.be/image.php?i=402064&s=335856",
  url: "https://stripinfo.be/reeks/strip/335856_Jommeke_99_De_grote_knoeiboel",
  details: {
    Scenario: "Jef Nys",
    Tekeningen: "Jef Nys",
    "Uitgever(s)": "Ballon",
    Jaar: "2015",
    "Pagina's": "48",
    Barcode: "9789462102828",
    Kaft: "Softcover",
    Taal: "Nederlands"
  }
}
```

`details` uses the site's own (Dutch) labels, so it includes whatever rows
that edition has (for example `ISBN` on older editions).

## Functions

- `getComicByIsbn(isbn)` returns the most recent edition, or `undefined`
  if the ISBN isn't found. Dashes and spaces in the ISBN are ignored.
- `getAllEditionsByIsbn(isbn)` returns every edition of that album
  (empty array if not found).

Requests that get HTTP 429 (rate limited) are retried a few times, and
edition pages are fetched 3 at a time.

## Development

Source lives in `src/` and compiles to `dist/`.

```bash
npm install
npm run typecheck   # type-check src and tests
npm run build       # compile to dist/
npm test            # offline tests (mocked HTTP)
npm run test:live   # checks against the real stripinfo.be
```

## Report Problems

If you have any problems regarding this project, read the following
[disclaimer](https://github.com/yashkathe/Download-ComicBooks-API/blob/master/DISCLAIMER.md)
