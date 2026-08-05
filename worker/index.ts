/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type ParsedJob = { company: string; role: string; location: string; pageTitle: string };

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.includes(":")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function safeJobUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || isBlockedHostname(url.hostname)) {
    throw new Error("只支持公开的 HTTP/HTTPS 招聘链接");
  }
  return url;
}

async function fetchPublicPage(initialUrl: URL) {
  let url = initialUrl;
  for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutumnRecruitmentCalendar/1.0)" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("招聘页面跳转地址无效");
      url = safeJobUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "该页面需要登录或拒绝自动读取" : `页面读取失败（${response.status}）`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error("该链接不是可解析的招聘网页");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 2_000_000) throw new Error("招聘页面内容过大，无法自动解析");
    return { html: (await response.text()).slice(0, 2_000_000), finalUrl: url.toString() };
  }
  throw new Error("招聘页面跳转次数过多");
}

function decodeHtml(value = "") {
  return value.replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }
  return "";
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findJobPosting(item); if (found) return found; }
    return null;
  }
  const record = value as Record<string, unknown>;
  const type = record["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return record;
  return findJobPosting(record["@graph"]);
}

function parseJobPage(html: string): ParsedJob {
  let posting: Record<string, unknown> | null = null;
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { posting = findJobPosting(JSON.parse(decodeHtml(match[1]))); } catch { /* try the next block */ }
    if (posting) break;
  }
  const pageTitle = decodeHtml(metaContent(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const hiringOrganization = posting?.hiringOrganization;
  const company = decodeHtml(typeof hiringOrganization === "object" && hiringOrganization ? String((hiringOrganization as Record<string, unknown>).name ?? "") : "");
  const role = decodeHtml(String(posting?.title ?? pageTitle.split(/\s+[|｜·_-]\s+/)[0] ?? ""));
  const jobLocation = posting?.jobLocation;
  const address = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
  const addressValue = typeof address === "object" && address ? (address as Record<string, unknown>).address : null;
  const location = typeof addressValue === "object" && addressValue
    ? ["addressLocality", "addressRegion"].map((key) => (addressValue as Record<string, unknown>)[key]).filter(Boolean).join(" · ")
    : "";
  const siteName = metaContent(html, "og:site_name");
  const genericSites = /boss直聘|猎聘|智联招聘|前程无忧|牛客|linkedin|indeed/i;
  return { company: company || (genericSites.test(siteName) ? "" : siteName), role, location: decodeHtml(location), pageTitle };
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/parse-job" && request.method === "POST") {
      try {
        const payload = await request.json() as { url?: string };
        const sourceUrl = safeJobUrl(payload.url?.trim() ?? "");
        const { html, finalUrl } = await fetchPublicPage(sourceUrl);
        const parsed = parseJobPage(html);
        return Response.json({ ...parsed, finalUrl, parsedAt: new Date().toISOString() });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "链接解析失败" }, { status: 400 });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
