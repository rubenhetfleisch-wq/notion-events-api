export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/events") {
      return new Response("Not found", { status: 404 });
    }

    const notionRes = await fetch(
      ⁠ https://api.notion.com/v1/databases/${env.DATABASE_ID}/query ⁠,
      {
        method: "POST",
        headers: {
          "Authorization": ⁠ Bearer ${env.NOTION_SECRET} ⁠,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!notionRes.ok) {
      return new Response(await notionRes.text(), { status: notionRes.status });
    }

    const data = await notionRes.json();

    const items = (data.results || [])
      .map(p => {
        const props = p.properties || {};

        return {
          id: p.id,
          title: (props["name"]?.title || []).map(t => t.plain_text).join(""),
          desc: (props["Description"]?.rich_text || []).map(t => t.plain_text).join(" "),
          date: props["Event Date"]?.date || props["Date"]?.date || null,
          region: props["Region"]?.select?.name || "",
          url: props["url"]?.url || "",
          image:
            p.cover?.external?.url ||
            p.cover?.file?.url ||
            props["image"]?.files?.[0]?.external?.url ||
            props["image"]?.files?.[0]?.file?.url ||
            null,
        };
      })
      // ✅ NUR nach Datum sortieren – kein Published-Filter
      .sort((a, b) => {
        const da = a.date?.start ? new Date(a.date.start).getTime() : Infinity;
        const db = b.date?.start ? new Date(b.date.start).getTime() : Infinity;
        return da - db;
      });

    return new Response(JSON.stringify({ items }), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  },
};
