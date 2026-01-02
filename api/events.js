import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  // 🔓 ALLES ERLAUBEN
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN
    });

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      filter: {
        property: "Published",
        checkbox: { equals: true }
      },
      sorts: [{ property: "Date", direction: "ascending" }]
    });

    const items = response.results.map(page => ({
      title: page.properties.Title?.title?.[0]?.plain_text ?? "",
      desc: page.properties.Description?.rich_text?.[0]?.plain_text ?? "",
      region: page.properties.Region?.select?.name ?? "",
      url: page.properties.URL?.url ?? "",
      image:
        page.cover?.external?.url ||
        page.cover?.file?.url ||
        null,
      date: {
        start: page.properties.Date?.date?.start ?? null
      }
    }));

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
