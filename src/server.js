const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_ROOT = path.join(ROOT, "public");
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const LABELS = {
  civil: "\u516c\u52a1\u5458",
  publicInstitution: "\u4e8b\u4e1a\u5355\u4f4d",
  selection: "\u9009\u8c03/\u9074\u9009",
  general: "\u7efc\u5408\u8003\u8bd5",
  latest: "\u6700\u65b0",
  recent: "\u8fd1\u671f",
  history: "\u5386\u53f2",
  pending: "\u5f85\u786e\u8ba4",
  apply: "\u53ef\u62a5\u540d\u5173\u6ce8",
  written: "\u7b14\u8bd5\u9636\u6bb5",
  process: "\u540e\u7eed\u6d41\u7a0b",
  publish: "\u516c\u793a",
  notice: "\u901a\u77e5"
};

const SOURCES = [
  {
    id: "rsksw",
    name: "\u5929\u6d25\u4eba\u4e8b\u8003\u8bd5\u7f51\u901a\u77e5\u516c\u544a",
    type: LABELS.general,
    url: "https://hrss.tj.gov.cn/jsdw/rsksw/tzgg4/",
    baseUrl: "https://hrss.tj.gov.cn/jsdw/rsksw/tzgg4/",
    categoryHints: [
      [LABELS.civil, LABELS.civil],
      [LABELS.publicInstitution, LABELS.publicInstitution],
      ["\u9009\u8c03", LABELS.selection],
      ["\u9074\u9009", LABELS.selection]
    ]
  },
  {
    id: "sydw",
    name: "\u5929\u6d25\u5e02\u4e8b\u4e1a\u5355\u4f4d\u516c\u5f00\u62db\u8058",
    type: LABELS.publicInstitution,
    url: "https://hrss.tj.gov.cn/ztzl/ztzl1/sydwgkzp/",
    baseUrl: "https://hrss.tj.gov.cn/ztzl/ztzl1/sydwgkzp/",
    forcedCategory: LABELS.publicInstitution
  }
];

let cache = {
  payload: null,
  refreshing: null
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_ROOT, safePath);

  if (!filePath.startsWith(PUBLIC_ROOT)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "public, max-age=300"
    });
    res.end(data);
  });
}

async function getExams(force = false) {
  if (!force && cache.payload) {
    return { ...cache.payload, cached: true };
  }
  return refreshExams();
}

async function refreshExams() {
  if (cache.refreshing) return cache.refreshing;

  cache.refreshing = fetchAllSources()
    .then((payload) => {
      cache.payload = payload;
      return { ...payload, cached: false };
    })
    .finally(() => {
      cache.refreshing = null;
    });

  return cache.refreshing;
}

async function fetchAllSources() {
  const settled = await Promise.allSettled(SOURCES.map(fetchSource));
  const exams = [];
  const errors = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      exams.push(...result.value);
    } else {
      errors.push({
        source: SOURCES[index].name,
        message: result.reason?.message || "\u62c9\u53d6\u5931\u8d25"
      });
    }
  });

  const seen = new Set();
  const unique = exams
    .filter((item) => {
      const key = `${item.title}|${item.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => dateValue(b.date) - dateValue(a.date));

  return {
    updatedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + REFRESH_INTERVAL_MS).toISOString(),
    refreshIntervalMinutes: REFRESH_INTERVAL_MS / 60000,
    sources: SOURCES.map(({ name, url, type }) => ({ name, url, type })),
    errors,
    exams: unique
  };
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 TianjinExamRadar/1.0",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseNotices(html, source);
}

function parseNotices(html, source) {
  const anchors = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const attrs = match[1];
    const rawText = stripTags(match[2]);
    const href = getAttr(attrs, "href");
    if (!href || !rawText) continue;
    if (/^(javascript:|#)/i.test(href)) continue;

    const title = normalizeText(rawText);
    const date = findNearbyDate(html, match.index, anchorPattern.lastIndex) || findDate(title);
    const cleanedTitle = title.replace(/\s*\d{4}-\d{2}-\d{2}\s*$/, "").trim();
    const category = inferCategory(cleanedTitle, source);

    if (!isExamNotice(cleanedTitle, category) || cleanedTitle === category) continue;

    anchors.push({
      id: createId(`${source.id}-${cleanedTitle}-${href}`),
      title: cleanedTitle,
      category,
      date,
      source: source.name,
      sourceType: source.type,
      url: toAbsoluteUrl(href, source.baseUrl),
      highlight: inferHighlight(cleanedTitle),
      status: inferStatus(date)
    });
  }

  return anchors.slice(0, 60);
}

function getAttr(attrs, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return attrs.match(pattern)?.[1] || "";
}

function stripTags(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function normalizeText(value) {
  return decodeEntities(value)
    .replace(/\s+/g, " ")
    .replace(/[\u00b7\u2022]/g, "")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function findNearbyDate(html, start, end) {
  const before = html.slice(Math.max(0, start - 80), start);
  const after = html.slice(end, Math.min(html.length, end + 80));
  return findDate(`${before} ${after}`);
}

function findDate(text) {
  const full = text.match(/20\d{2}[-\u5e74.\/]\d{1,2}[-\u6708.\/]\d{1,2}/);
  if (full) return normalizeDate(full[0]);

  const short = text.match(/\[(\d{1,2})-(\d{1,2})\]/) || text.match(/\s(\d{1,2})-(\d{1,2})\s/);
  if (short) return `${new Date().getFullYear()}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;

  return "";
}

function normalizeDate(value) {
  const parts = value.match(/(20\d{2})[-\u5e74.\/](\d{1,2})[-\u6708.\/](\d{1,2})/);
  if (!parts) return "";
  return `${parts[1]}-${parts[2].padStart(2, "0")}-${parts[3].padStart(2, "0")}`;
}

function inferCategory(title, source) {
  if (source.forcedCategory) return source.forcedCategory;
  for (const [hint, label] of source.categoryHints || []) {
    if (title.includes(hint)) return label;
  }
  if (/\u62db\u8058|\u516c\u5f00\u62db\u8058|\u4e8b\u4e1a\u7f16/.test(title)) return LABELS.publicInstitution;
  if (/\u62db\u8003|\u5f55\u7528|\u516c\u52a1\u5458/.test(title)) return LABELS.civil;
  return source.type;
}

function isExamNotice(title, category) {
  const topicMatched = /\u516c\u52a1\u5458|\u4e8b\u4e1a\u5355\u4f4d|\u516c\u5f00\u62db\u8058|\u62db\u8003|\u5f55\u7528|\u9009\u8c03|\u9074\u9009|\u5c97\u4f4d|\u62a5\u540d|\u7b14\u8bd5|\u9762\u8bd5|\u8d44\u683c\u590d\u5ba1/.test(title);
  const excluded = /\u516c\u793a|\u6210\u7ee9|\u62df\u5f55\u7528|\u62df\u8058\u7528|\u4f53\u68c0|\u8003\u5bdf|\u8d44\u683c\u590d\u5ba1|\u4e3b\u4efb\u7535\u8bdd|\u57f9\u8bad\u4f1a|\u6d3b\u52a8|\u8bc1\u4e66\u9886\u53d6|\u804c\u4e1a\u8d44\u683c|\u4e13\u4e1a\u6280\u672f|\u54a8\u8be2\u5de5\u7a0b\u5e08|\u7edf\u8ba1\u8d44\u683c|\u6d88\u9632\u5de5\u7a0b\u5e08/.test(title);
  return topicMatched && !excluded && category !== LABELS.general;
}

function inferHighlight(title) {
  if (/\u62a5\u540d|\u516c\u544a|\u65b9\u6848|\u62db\u8058/.test(title)) return LABELS.apply;
  if (/\u7b14\u8bd5|\u51c6\u8003\u8bc1/.test(title)) return LABELS.written;
  if (/\u9762\u8bd5|\u8d44\u683c\u590d\u5ba1|\u4f53\u68c0|\u8003\u5bdf/.test(title)) return LABELS.process;
  if (/\u62df\u5f55\u7528|\u516c\u793a/.test(title)) return LABELS.publish;
  return LABELS.notice;
}

function inferStatus(date) {
  if (!date) return LABELS.pending;
  const days = (Date.now() - dateValue(date)) / 86400000;
  if (days <= 14) return LABELS.latest;
  if (days <= 45) return LABELS.recent;
  return LABELS.history;
}

function dateValue(date) {
  const time = Date.parse(date);
  return Number.isNaN(time) ? 0 : time;
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function createId(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function startAutoRefresh() {
  refreshExams().catch((error) => {
    console.error(`Initial refresh failed: ${error.message}`);
  });

  return setInterval(() => {
    refreshExams().catch((error) => {
      console.error(`Scheduled refresh failed: ${error.message}`);
    });
  }, REFRESH_INTERVAL_MS);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/exams") {
    try {
      const payload = await getExams(url.searchParams.get("refresh") === "1");
      send(res, 200, JSON.stringify(payload));
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message || "\u670d\u52a1\u5668\u9519\u8bef" }));
    }
    return;
  }

  serveStatic(req, res);
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Tianjin exam radar is running at http://localhost:${PORT}`);
    console.log(`Auto refresh interval: ${REFRESH_INTERVAL_MS / 60000} minutes`);
    startAutoRefresh();
  });
}

module.exports = {
  parseNotices,
  inferCategory,
  isExamNotice,
  refreshExams,
  REFRESH_INTERVAL_MS
};
