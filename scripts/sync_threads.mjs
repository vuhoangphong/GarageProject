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

async function syncThreads() {
  console.log(`[Threads Sync] Fetching profile from ${JINA_ENDPOINT}...`);
  
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

  // Regex to detect posts: links like https://www.threads.com/@hfoncar0895/post/XXXX
  const postUrlRegex = /https:\/\/(?:www\.)?threads\.(?:com|net)\/@hfoncar0895\/post\/([a-zA-Z0-9_-]+)/g;
  const postIds = [];
  let match;
  while ((match = postUrlRegex.exec(markdown)) !== null) {
    if (!postIds.includes(match[1])) {
      postIds.push(match[1]);
    }
  }

  console.log(`[Threads Sync] Found ${postIds.length} unique post IDs on page.`);
  let addedCount = 0;

  for (const pid of postIds) {
    const canonicalUrl = `https://www.threads.com/@hfoncar0895/post/${pid}`;
    if (existingUrls.has(canonicalUrl)) {
      console.log(`[Threads Sync] Post ${pid} already synced. Skipping.`);
      continue;
    }

    console.log(`[Threads Sync] New post detected: ${pid}`);
    // Extract chunk around this post id
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

    // Extract text snippet
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("![") && !l.startsWith("[") && !l.includes("Threads, Say more") && !l.includes("Translate"));
    
    const postText = lines[0] || "京都のフォンカー 最新の施工実績・板金塗装";

    const newItem = {
      id: `post-${pid}`,
      date: new Date().toISOString().split("T")[0],
      threadsUrl: canonicalUrl,
      category: {
        ja: "板金塗装・修理",
        vn: "Đồng Sơn & Sửa Chữa"
      },
      price: "",
      image: localImg,
      title: {
        ja: postText.slice(0, 50),
        vn: `Thi công thực tế: ${postText.slice(0, 50)}`
      },
      content: {
        ja: postText,
        vn: `${postText} - Liên hệ xưởng Kyoto no Foncar để được tư vấn và báo giá chi tiết qua Hotline hoặc LINE!`
      },
      tags: ["#京都フォンカー", "#板金塗装", "#最新施工実績"]
    };

    existingNews.unshift(newItem);
    existingUrls.add(canonicalUrl);
    addedCount++;
  }

  if (addedCount > 0) {
    await fs.writeFile(NEWS_JSON_PATH, JSON.stringify(existingNews, null, 2), "utf-8");
    console.log(`[Threads Sync] Successfully synced ${addedCount} new posts!`);
  } else {
    console.log("[Threads Sync] All posts are up to date. No new posts to add.");
  }
}

syncThreads();