module.exports = (req, res) => {
  const urls = [
    { loc: "https://www.knoledgr.com/", changefreq: "weekly", priority: "1.0" },
    { loc: "https://www.knoledgr.com/home", changefreq: "weekly", priority: "0.9" },
    { loc: "https://www.knoledgr.com/login", changefreq: "monthly", priority: "0.8" },
    { loc: "https://www.knoledgr.com/security", changefreq: "monthly", priority: "0.7" },
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
