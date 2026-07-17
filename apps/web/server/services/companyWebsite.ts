import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { companyAnalysisConfig, normalizeSearchText } from "@/server/services/companyAnalysis";

export type CompanyWebsitePage = { url: string; text: string };

function privateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const value = address.toLowerCase();
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:") || value.startsWith("::ffff:127.") || value.startsWith("::ffff:10.") || value.startsWith("::ffff:192.168.");
}

async function safeUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  if (!(["http:", "https:"] as string[]).includes(url.protocol)) throw new Error("La web debe usar HTTP o HTTPS.");
  if (url.username || url.password || url.port) throw new Error("La URL de la empresa no es válida.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error("No podemos acceder a esa dirección web.");
  return url;
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

export function visibleText(html: string) {
  return decodeEntities(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|main|header|footer|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function relevantLinks(html: string, base: URL) {
  const wanted = companyAnalysisConfig.website.relevant_link_terms;
  const excluded = companyAnalysisConfig.website.excluded_link_terms;
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        const url = new URL(match[1], base);
        if (url.origin !== base.origin || !(["http:", "https:"] as string[]).includes(url.protocol)) return null;
        url.hash = "";
        const signal = normalizeSearchText(`${url.pathname} ${visibleText(match[2])}`);
        if (excluded.some((term) => signal.includes(normalizeSearchText(term)))) return null;
        const score = wanted.reduce((total, term) => total + (signal.includes(normalizeSearchText(term)) ? 1 : 0), 0);
        return score ? { url: url.toString(), score } : null;
      } catch { return null; }
    })
    .filter((item): item is { url: string; score: number } => Boolean(item));
  return [...new Map(links.sort((a, b) => b.score - a.score || new URL(a.url).pathname.split("/").length - new URL(b.url).pathname.split("/").length).map((item) => [item.url, item])).values()];
}

function requestHtml(url: URL): Promise<{ status: number; headers: http.IncomingHttpHeaders; html: string }> {
  const cfg = companyAnalysisConfig.website;
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(url, {
      method: "GET",
      headers: { "user-agent": "BuenaPro-CompanyProfile/2.0 (+public company website analysis)", accept: "text/html,application/xhtml+xml" },
      maxHeaderSize: cfg.max_header_bytes,
    }, (res) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > cfg.max_html_bytes) req.destroy(new Error("La página es demasiado grande para analizarla."));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, html: Buffer.concat(chunks).toString("utf8") }));
    });
    req.setTimeout(cfg.timeout_ms, () => req.destroy(new Error("La web demoró demasiado en responder.")));
    req.on("error", reject);
    req.end();
  });
}

async function fetchPage(initial: URL) {
  let url = initial;
  for (let redirects = 0; redirects <= companyAnalysisConfig.website.max_redirects; redirects += 1) {
    const response = await requestHtml(url);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location || redirects === companyAnalysisConfig.website.max_redirects) throw new Error("La web redirigió demasiadas veces.");
      url = await safeUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error("No pudimos leer la web de la empresa.");
    const type = String(response.headers["content-type"] ?? "");
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("La dirección no contiene una página web HTML.");
    return { url, html: response.html };
  }
  throw new Error("No pudimos leer la web de la empresa.");
}

export async function readCompanyWebsite(value: string) {
  const home = await fetchPage(await safeUrl(value));
  const queue = relevantLinks(home.html, home.url).map((item) => item.url);
  const rawPages = [home];
  const seen = new Set([home.url.toString()]);
  while (rawPages.length < companyAnalysisConfig.website.max_pages && queue.length) {
    const candidate = queue.shift()!;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try { rawPages.push(await fetchPage(await safeUrl(candidate))); } catch { /* Una subpágina no invalida la portada. */ }
  }
  let remaining = companyAnalysisConfig.website.max_combined_text_chars;
  const pages: CompanyWebsitePage[] = rawPages.map(({ url, html }) => {
    const text = visibleText(html).slice(0, Math.min(companyAnalysisConfig.website.max_text_chars_per_page, remaining));
    remaining -= text.length;
    return { url: url.toString(), text };
  }).filter((page) => page.text.length > 0);
  return { url: home.url.toString(), text: pages.map((page) => page.text).join("\n\n"), pages };
}
