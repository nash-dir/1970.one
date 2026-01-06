export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === "/update") {
            await scrapeAndSaveToKV(env);
            return new Response("Forced Update Complete", { status: 200 });
        }
        const lang = url.searchParams.get("lang");
        const key = lang === "en" ? "en_events" : "global_events";
        const cachedData = await env.STORE.get(key, { type: "json" });
        const responseData = cachedData ? JSON.stringify(cachedData) : "[]";

        return new Response(responseData, {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=600"
            }
        });
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(scrapeAndSaveToKV(env));
    }
};

//
async function scrapeAndSaveToKV(env) {
    console.log("Starting Hybrid Scrape Job...");
    const rawEvents = await scrapeRawStream(80);
    console.log(`Raw events captured: ${rawEvents.length}`);

    if (rawEvents.length > 0) {
        const RICH_LIMIT = 10;
        const globalRich = rawEvents.slice(0, RICH_LIMIT);
        const globalLite = rawEvents.slice(RICH_LIMIT);
        const richSummaries = await fetchSummariesParallel(globalRich);
        const liteSummaries = globalLite.map(item => ({ ...item, summary: null }));
        const finalGlobal = [
            ...richSummaries,
            ...liteSummaries
        ].map(item => applyFallback(item));

        await updateKvKey(env, "global_events", finalGlobal);

        const enEvents = rawEvents.filter(e => e.lang === 'EN');
        if (enEvents.length > 0) {
            const enRich = enEvents.slice(0, RICH_LIMIT);
            const enLite = enEvents.slice(RICH_LIMIT);

            const enRichSummaries = await fetchSummariesParallel(enRich);
            const enLiteSummaries = enLite.map(item => ({ ...item, summary: null }));

            const finalEn = [
                ...enRichSummaries,
                ...enLiteSummaries
            ].map(item => applyFallback(item));

            await updateKvKey(env, "en_events", finalEn);
        }
    }
}

function applyFallback(item) {
    if (item.summary) return item;
    return { ...item, summary: null };
}

async function updateKvKey(env, key, newItems) {
    if (newItems.length === 0) return;
    let currentItems = await env.STORE.get(key, { type: "json" });
    if (!currentItems || !Array.isArray(currentItems)) currentItems = [];
    const MAX_STORE = 500;

    const updatedList = [...currentItems, ...newItems];
    const finalData = updatedList.slice(-MAX_STORE);

    await env.STORE.put(key, JSON.stringify(finalData));
    console.log(`Updated [${key}]: Total ${finalData.length} (Added ${newItems.length})`);
}

async function scrapeRawStream(targetCount) {
    const streamUrl = 'https://stream.wikimedia.org/v2/stream/recentchange';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const collectedEvents = [];

    try {
        const response = await fetch(streamUrl, {
            headers: { 'User-Agent': '1970-One-Bot/1.0' },
            signal: controller.signal
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        const startTime = Date.now();
        const MAX_DURATION = 5000;

        while (collectedEvents.length < targetCount) {
            if (Date.now() - startTime > MAX_DURATION) break;

            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        if (data.namespace === 0 &&
                            (data.type === 'edit' || data.type === 'new') &&
                            !data.bot &&
                            data.server_name.endsWith('wikipedia.org')) {

                            collectedEvents.push({
                                title: data.title,
                                user: data.user,
                                url: data.server_url + '/wiki/' + encodeURIComponent(data.title),
                                timestamp: data.timestamp,
                                server_name: data.server_name,
                                lang: data.server_name.split('.')[0].toUpperCase(),
                                raw: { comment: data.comment }
                            });
                        }
                    } catch (e) { }
                }
                if (collectedEvents.length >= targetCount) break;
            }
        }
        return collectedEvents;

    } catch (e) {
        return collectedEvents;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchSummariesParallel(events) {
    const promises = events.map(async (event) => {
        try {
            const summary = await fetchPageSummary(event.server_name, event.title);
            return { ...event, summary: summary };
        } catch (e) {
            return { ...event, summary: null };
        }
    });

    return await Promise.all(promises);
}

async function fetchPageSummary(serverName, title) {
    try {
        const apiUrl = `https://${serverName}/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(apiUrl, {
            headers: { 'User-Agent': '1970-One-Bot/1.0' },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const json = await res.json();
            if (json.extract) return json.extract;
        }
    } catch (e) { }
    return null;
}