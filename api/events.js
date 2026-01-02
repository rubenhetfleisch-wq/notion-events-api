import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // Erlaubte Origins:
  // - aiaustria.com + alle Subdomains
  // - squarespace.com + alle Subdomains (für Editor / Staging)
  const allowedOrigins = [
    /^https:\/\/([a-z0-9-]+\.)*aiaustria\.com$/,
    /^https:\/\/([a-z0-9-]+\.)*squarespace\.com$/
  ];

  if (origin && allowedOrigins.some(rx => rx.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight (wichtig für Browser!)
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
      sorts: [
        { property: "Date", direction: "ascending" }
      ]
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

    res.status(200).json({ items });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
