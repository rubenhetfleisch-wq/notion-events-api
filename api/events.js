import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  // 🔓 Public Read API
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

    const items = response.results.map(page => {
      // --- IMAGE (Files & media, robust) ---
      const thumbnailFiles =
        page.properties["Thumbnail image"]?.files ?? [];

      const image =
        thumbnailFiles.length > 0
          ? thumbnailFiles[0].type === "file"
            ? thumbnailFiles[0].file?.url
            : thumbnailFiles[0].external?.url
          : null;

      return {
        // ✅ Title Property heißt "Name"
        title: page.properties.Name?.title?.[0]?.plain_text ?? "",

        // ✅ Description
        desc:
          page.properties.Description?.rich_text
            ?.map(t => t.plain_text)
            .join("") ?? "",

        // ✅ Region Select
        region: page.properties.Region?.select?.name ?? "",

        // ✅ URL Property heißt "super:Link"
        url: page.properties["super:Link"]?.url ?? "",

        // ✅ Image aus "Thumbnail image"
        image,

        // ✅ Date
        date: {
          start: page.properties.Date?.date?.start ?? null
        }
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
