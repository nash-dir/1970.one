var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

var index_default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === "/update") {
            await fetchAndSaveGithubEvents(env);
            return new Response("GitHub Update Triggered", { status: 200 });
        }
        const cachedData = await env.STORE.get("github_events", { type: "json" });
        const responseData = cachedData ? JSON.stringify(cachedData) : "[]";
        return new Response(responseData, {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=360"
            }
        });
    },
    async scheduled(event, env, ctx) {
        ctx.waitUntil(fetchAndSaveGithubEvents(env));
    }
};
async function fetchAndSaveGithubEvents(env) {
    console.log("Fetching GitHub Events...");
    const headers = {
        "User-Agent": "1970-One-Bot/1.0",
        "Accept": "application/vnd.github.v3+json"
    };
    if (env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${env.GITHUB_TOKEN}`;
    }
    try {
        const response = await fetch("https://api.github.com/events?per_page=100", {
            headers,
            cf: {
                cacheTtl: 0,
                cacheEverything: false
            }
        });
        if (!response.ok) {
            console.error(`GitHub API Error: ${response.status} ${response.statusText}`);
            console.log(`Rate Limit Remaining: ${response.headers.get("x-ratelimit-remaining")}`);
            return;
        }
        const newEvents = await response.json();
        console.log(`Fetched ${newEvents.length} events from GitHub.`);
        if (newEvents.length > 0) {
            await updateKvKey(env, "github_events", newEvents);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
__name(fetchAndSaveGithubEvents, "fetchAndSaveGithubEvents");
async function updateKvKey(env, key, newItems) {
    let currentItems = await env.STORE.get(key, { type: "json" });
    if (!currentItems || !Array.isArray(currentItems)) currentItems = [];
    const MAX_STORE = 500;
    const existingIds = new Set(currentItems.map((item) => item.id));
    const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
    if (uniqueNewItems.length === 0) {
        console.log("No new unique events found.");
        return;
    }
    const combined = [...uniqueNewItems, ...currentItems];
    const finalData = combined.slice(0, MAX_STORE);
    await env.STORE.put(key, JSON.stringify(finalData));
    console.log(`Updated [${key}]: Stored ${finalData.length} events (Added ${uniqueNewItems.length})`);
}
__name(updateKvKey, "updateKvKey");
export {
    index_default as default
};
