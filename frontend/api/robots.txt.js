module.exports = (req, res) => {
  const body = `User-agent: *
Allow: /

Sitemap: https://www.knoledgr.com/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(body);
};
