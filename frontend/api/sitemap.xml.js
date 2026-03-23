module.exports = (req, res) => {
  const urls = [
    { loc: "https://knoledgr.com/", changefreq: "weekly", priority: "1.0" },
    { loc: "https://knoledgr.com/docs", changefreq: "weekly", priority: "0.8" },
    { loc: "https://knoledgr.com/partners", changefreq: "weekly", priority: "0.7" },
    { loc: "https://knoledgr.com/feedback", changefreq: "weekly", priority: "0.7" },
    { loc: "https://knoledgr.com/privacy", changefreq: "yearly", priority: "0.5" },
    { loc: "https://knoledgr.com/terms", changefreq: "yearly", priority: "0.5" },
    { loc: "https://knoledgr.com/security-annex", changefreq: "yearly", priority: "0.5" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(xml);
};
