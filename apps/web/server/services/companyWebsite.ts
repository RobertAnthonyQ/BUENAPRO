import dns from "node:dns/promises";
import net from "node:net";

const MAX_HTML_BYTES = 750_000;

function privateAddress(address: string) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.");
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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function visibleText(html: string) {
  return decodeEntities(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|main|header|footer|h[1-6]|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 24_000);
}

export async function readCompanyWebsite(value: string) {
  let url = await safeUrl(value);
  for (let redirects = 0; redirects <= 2; redirects += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": "BuenaPro-CompanyProfile/1.0 (+public company website analysis)" },
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 2) throw new Error("La web redirigió demasiadas veces.");
      url = await safeUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error("No pudimos leer la web de la empresa.");
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error("La dirección no contiene una página web HTML.");
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_HTML_BYTES) throw new Error("La página es demasiado grande para analizarla.");
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    return { url: url.toString(), text: visibleText(html) };
  }
  throw new Error("No pudimos leer la web de la empresa.");
}
