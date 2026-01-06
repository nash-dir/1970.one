var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

var index_default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === "/update") {
            await fetchAndSaveBtcData(env);
            return new Response("BTC Update Triggered", { status: 200 });
        }
        const cachedData = await env.STORE.get("btc_events", { type: "json" });
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
        ctx.waitUntil(fetchAndSaveBtcData(env));
    }
};
async function fetchAndSaveBtcData(env) {
    console.log("Fetching BTC Mempool Data...");
    try {
        const priceRes = await fetch("https://blockchain.info/ticker");
        const priceData = await priceRes.json();
        const currentPrice = priceData.USD.last;
        let collectedTxs = [];
        const LOOP_COUNT = 3;
        for (let i = 0; i < LOOP_COUNT; i++) {
            const txRes = await fetch("https://mempool.space/api/mempool/recent");
            if (txRes.ok) {
                const txs = await txRes.json();
                collectedTxs = [...collectedTxs, ...txs];
            }
            if (i < LOOP_COUNT - 1) await new Promise((r) => setTimeout(r, 1500));
        }
        console.log(`Collected ${collectedTxs.length} raw transactions.`);
        const formattedEvents = collectedTxs.map((tx) => {
            const btcValue = (tx.value / 1e8).toFixed(8);
            return {
                theme: "btc",
                id: tx.txid,
                hash: tx.txid,
                btc: btcValue,
                url: `https://mempool.space/tx/${tx.txid}`,
                time: Math.floor(Date.now() / 1e3),
                price_snapshot: currentPrice,
                raw: {
                    fee: tx.fee,
                    vsize: tx.vsize,
                    value_sats: tx.value,
                    relayed_by: "mempool.space"
                }
            };
        });
        if (formattedEvents.length > 0) {
            await updateKvKey(env, "btc_events", formattedEvents);
        }
    } catch (e) {
        console.error("BTC Fetch Error:", e);
    }
}
__name(fetchAndSaveBtcData, "fetchAndSaveBtcData");
async function updateKvKey(env, key, newItems) {
    let currentItems = await env.STORE.get(key, { type: "json" });
    if (!currentItems || !Array.isArray(currentItems)) currentItems = [];
    const MAX_STORE = 500;
    const existingIds = new Set(currentItems.map((item) => item.id));
    const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
    if (uniqueNewItems.length === 0) return;
    const combined = [...uniqueNewItems, ...currentItems];
    const finalData = combined.slice(0, MAX_STORE);
    await env.STORE.put(key, JSON.stringify(finalData));
    console.log(`Updated [${key}]: Stored ${finalData.length} txs (Added ${uniqueNewItems.length})`);
}
__name(updateKvKey, "updateKvKey");
export {
    index_default as default
};
