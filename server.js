/**
 * فایل راه‌انداز برای هاست‌هایی مثل دایرکت‌ادمین که با Passenger کار می‌کنند.
 * روی Vercel و VPS نیازی به این فایل نیست.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res, parse(req.url, true)))
    .listen(port, () => console.log(`ready on ${port}`));
});
