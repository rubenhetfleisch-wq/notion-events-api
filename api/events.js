import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  const origin = req.headers.origin;

  // 👉 ALLE Squarespace + AI Austria Origins erlauben
  const allowedOrigins = [
    "https://flute-tortoise-zaj3.squarespace.com", // DEIN AKTUELLER EDITOR
    /^https:\/\/([a-z0-9-]+\.)*aiaustria\.com$/,
    /^https:\/\/([a-z0-9-]+\.)*squarespace\.com$/,
    /^https:\/\/static\d+\.squarespace\.com$/
  ];

  const isAllowed =
    origin &&
    allowedOrigins.some(o =>
      typeof o === "string" ? o === origin : o.test(origin)
    );

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // 👉 DIESE HEADER MÜSSEN IMMER GESETZT SEIN
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  // 👉 PRE-FLIGHT MUSS IMMER DURCHGELASSEN WERDEN
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ❗ AB HIER ERST BUSINESS-LOGIK
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
