import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const NEWS_JSON_PATH = path.join(PROJECT_ROOT, "src", "data", "news.json");
const NEWS_IMG_DIR = path.join(PROJECT_ROOT, "public", "news");

const THREADS_URL = "https://www.threads.net/@hfoncar0895";
const JINA_ENDPOINT = `https://r.jina.ai/${THREADS_URL}`;

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`Failed to download ${url}:`, err.message);
    return false;
  }
}

// Function to extract genuine price if user explicitly wrote it in caption
function extractGenuinePrice(text) {
  if (!text) return "";
  // Check patterns like: 5万で, 9万から, 4-5万から, 5万円, 3〜4万円
  const match = text.match(/(\d+(?:[〜~-]\d+)?)\s*万(?:円)?\s*(から|で)?/);
  if (match) {
    const val = match[1];
    const isFrom = match[2] === "から" || text.includes(`${val}万から`);
    return `${val}万円${isFrom ? "〜" : ""}`;
  }
  return "";
}

async function syncThreads() {
  console.log(`[Threads Sync] Fetching latest posts from ${JINA_ENDPOINT}...`);
  
  let existingNews = [];
  try {
    const raw = await fs.readFile(NEWS_JSON_PATH, "utf-8");
    existingNews = JSON.parse(raw);
  } catch {
    existingNews = [];
  }

  const existingUrls = new Set(existingNews.map((n) => n.threadsUrl));

  let markdown = "";
  try {
    const res = await fetch(JINA_ENDPOINT, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    markdown = await res.text();
  } catch (err) {
    console.error("[Threads Sync] Error fetching Threads content:", err.message);
    return;
  }

  // Detect post IDs: https://www.threads.com/@hfoncar0895/post/XXXX
  const postUrlRegex = /https:\/\/(?:www\.)?threads\.(?:com|net)\/@hfoncar0895\/post\/([a-zA-Z0-9_-]+)/g;
  const postIds = [];
  let match;
  while ((match = postUrlRegex.exec(markdown)) !== null) {
    if (!postIds.includes(match[1])) {
      postIds.push(match[1]);
    }
  }

  console.log(`[Threads Sync] Found ${postIds.length} post IDs on profile view.`);
  let addedCount = 0;

  for (const pid of postIds) {
    const canonicalUrl = `https://www.threads.com/@hfoncar0895/post/${pid}`;
    if (existingUrls.has(canonicalUrl)) {
      console.log(`[Threads Sync] Post ${pid} already synced. Skipping.`);
      continue;
    }

    console.log(`[Threads Sync] New authentic post detected: ${pid}`);
    const pidIdx = markdown.indexOf(pid);
    const chunk = markdown.slice(pidIdx, pidIdx + 1500);

    // Look for image URL in chunk
    const imgMatch = chunk.match(/!\[(?:Image[^\]]*|[^\]]*)\]\((https:\/\/scontent[^)]+)\)/);
    let localImg = "/news/banner_before_after.png";

    if (imgMatch) {
      const imgUrl = imgMatch[1];
      const imgName = `threads_${pid}.jpg`;
      const localPath = path.join(NEWS_IMG_DIR, imgName);
      const ok = await downloadImage(imgUrl, localPath);
      if (ok) {
        localImg = `/news/${imgName}`;
      }
    }

    // Extract raw text lines
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("![") && !l.startsWith("[") && !l.includes("Threads, Say more") && !l.includes("Translate") && !l.startsWith("http"));
    
    let postText = lines.find((l) => l.length > 5 && !l.includes(pid) && !/^[a-zA-Z0-9_-]+\)?$/.test(l));
    if (!postText) {
      postText = "京都のフォンカー 熟練の板金塗装・キズへこみ修理の実績";
    }

    // Extract price only if author explicitly wrote it
    const genuinePrice = extractGenuinePrice(postText);

    // Determine category based on keywords
    const isPaintOnly = postText.includes("全塗装") || postText.includes("ルーフ塗装") || postText.includes("屋根");
    const category = isPaintOnly
      ? { ja: "塗装・美装", vn: "Sơn Xe & Phục Hồi" }
      : { ja: "板金塗装・修理", vn: "Đồng Sơn & Sửa Chữa" };

    const cleanTitleSnippet = postText.replace(/#[^\s]+/g, "").replace(/https?:\/\/[^\s]+/g, "").replace(/\d{3}-\d{4}-\d{4}/g, "").trim().slice(0, 45);

    const newItem = {
      id: `post-${pid}`,
      date: new Date().toISOString().split("T")[0],
      threadsUrl: canonicalUrl,
      category,
      price: genuinePrice, // Only genuine price or empty string, NEVER fabricated
      image: localImg,
      title: {
        ja: `【施工実績】${cleanTitleSnippet || "板金塗装・修理実績"}`,
        vn: `【Dự án thực tế】${cleanTitleSnippet || "Đồng sơn & phục hồi xe tại xưởng"}`
      },
      content: {
        ja: postText,
        vn: `${postText} - Hình ảnh thi công thực tế tại xưởng Kyoto no Foncar. Quý khách vui lòng liên hệ hotline hoặc LINE để được tư vấn!`
      },
      tags: ["#京都フォンカー", "#フオンカー", "#板金塗装", "#施工実績"]
    };

    existingNews.unshift(newItem);
    existingUrls.add(canonicalUrl);
    addedCount++;
  }

  if (addedCount > 0) {
    await fs.writeFile(NEWS_JSON_PATH, JSON.stringify(existingNews, null, 2) + "\n", "utf-8");
    console.log(`[Threads Sync] Successfully synced ${addedCount} new authentic posts!`);
  } else {
    console.log("[Threads Sync] All posts are up to date. No new posts to add.");
  }
}

syncThreads();
