import axios from 'axios';

/** The HTTP response attached to an axios error, if there is one. */
const errorResponse = (err: unknown): { status?: number; headers?: Record<string, unknown> } | undefined =>
    (err as { response?: { status?: number; headers?: Record<string, unknown> } } | null)?.response;

const MAX_RETRIES = 3;
const DEFAULT_WAIT_MS = 2000;
const MAX_WAIT_MS = 30000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** How long the server asked us to wait, from its Retry-After header (seconds). */
const retryAfterMs = (header: unknown): number | undefined => {
    const seconds = Number(header);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, MAX_WAIT_MS) : undefined;
};

/** GETs a page's HTML. On HTTP 429 (rate limited) it waits and retries a few times. */
export const fetchHtml = async (url: string): Promise<string> => {
    for (let attempt = 0; ; attempt++) {
        try {
            const response = await axios.get<string>(url);
            return response.data;
        } catch (err) {
            const response = errorResponse(err);
            if (response?.status !== 429 || attempt >= MAX_RETRIES) throw err;

            await sleep(retryAfterMs(response.headers?.[ 'retry-after' ]) ?? DEFAULT_WAIT_MS * 2 ** attempt);
        }
    }
};

/** Like `Promise.all(items.map(fn))`, but runs at most `limit` calls at once. Keeps order. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let next = 0;

    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            results[ i ] = await fn(items[ i ] as T);
        }
    };

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
};
