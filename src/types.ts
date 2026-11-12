/** One edition (uitgave) of a comic album on stripinfo.be. */
export interface StripInfoComic {
    /** Album title, e.g. "De grote knoeiboel". */
    title: string;
    /** Series name, e.g. "Jommeke". */
    series: string | undefined;
    /** Number in the series, e.g. "99". */
    issueNumber: string | undefined;
    /** Publication year ("Jaar"), e.g. 2015. */
    year: number | undefined;
    /** Cover image URL. */
    image: string | undefined;
    /** This edition's page on stripinfo.be. */
    url: string;
    /**
     * Every row of the edition's details table, keyed by the site's Dutch labels:
     * e.g. { Scenario: "Jef Nys", "Uitgever(s)": "Ballon", Jaar: "2015", Barcode: "9789462102828", ... }
     */
    details: Record<string, string>;
}
