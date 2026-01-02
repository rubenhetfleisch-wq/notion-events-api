import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  // Public read API
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
      sorts: [
        { property: "Event Date", direction: "ascending" }
      ]
    });

    const items = response.results.map(page => {
      /* ---------- THUMBNAIL IMAGE ---------- */
      const files =
        page.properties["Thumbnail image"]?.files ?? [];

      let image = null;
      for (const f of files) {
        if (f.type === "file" && f.file?.url) {
          image = f.file.url;
          break;
        }
        if (f.type === "external" && f.external?.url) {
          image = f.external.url;
          break;
        }
      }

      /* ---------- DESCRIPTION (FULL TEXT) ---------- */
      const description =
        page.properties.Description?.rich_text
          ?.map(t => t.plain_text)
          .join("") ?? "";

      return {
        // Title
        title: page.properties.Eventname?.title?.[0]?.plain_text ?? "",

        // Description
        desc: description,

        // Region
        region: page.properties.Region?.select?.name ?? "",

        // External link
        url: page.properties["super:Link"]?.url ?? "",

        // Image
        image,

        // Date
        date: {
          start:
            page.properties["Event Date"]?.date?.start ??
            null
        },

        // Optional flags
        featured:
          page.properties.Featured?.checkbox ?? false
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
