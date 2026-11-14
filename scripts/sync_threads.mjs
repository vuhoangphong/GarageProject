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

// Function to clean raw Threads caption text from markdown links, URLs, and repeated contact info
export function cleanPostText(text) {
  if (!text) return "";
  
  let cleaned = text
    // Remove Markdown links like [line.me/ti/p...](https://l.threads.com/...) or [text](url)
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    // Remove raw URLs
    .replace(/https?:\/\/[^\s\)]+/g, "")
    // Remove emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "")
    // Remove Japanese/International phone numbers
    .replace(/(?:\+?81|0)\s*\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g, "")
    // Remove hashtags
    .replace(/#[^\s]+/g, "")
    // Remove trailing signatures before links
    .replace(/(?:今日の(?:フオンカー|フォンカー)|(?:H|h)?foncar|フォンカー|フオンカー)[\s:：-]*$/gi, "")
    // Clean trailing punctuation and whitespace
    .replace(/[\s\-–—:：(（[【]+$/g, "")
    .replace(/^[\s\-–—:：)）\]】]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

// Function to generate clean, professional title for cards
export function generateSmartTitle(cleanText, price = "") {
  if (!cleanText) return "板金塗装・美装修理実績";

  // Split by first sentence delimiter (。, !, ?, or newline)
  const sentenceMatch = cleanText.match(/^([^。！？\n]+[。！？]?)/);
  let title = sentenceMatch ? sentenceMatch[1].trim() : cleanText;

  // If too short (< 14 chars), append next part if available
  if (title.length < 14 && cleanText.length > title.length) {
    const rest = cleanText.slice(title.length).trim();
    const secondMatch = rest.match(/^([^。！？\n]+[。！？]?)/);
    if (secondMatch) {
      title += " " + secondMatch[1].trim();
    }
  }

  // Remove trailing periods from title for cleaner appearance
  title = title.replace(/[。！？\s]+$/, "");

  // If title ends with unclosed quote, close it
  if (title.startsWith("「") && !title.includes("」")) {
    title += "」";
  }

  // Max length 40 chars
  if (title.length > 40) {
    title = title.slice(0, 38).trim() + "…";
  }

  return title;
}

// Function to generate Vietnamese translation summary
export function generateVnContent(cleanJaText, price = "") {
  if (!cleanJaText) {
    return "Hình ảnh thi công thực tế tại xưởng Kyoto no Foncar. Quý khách vui lòng liên hệ hotline hoặc LINE để được tư vấn!";
  }

  if (cleanJaText.includes("日本語はまだまだ")) {
    return "Hình ảnh thực tế chiếc xe sau khi hoàn thiện đồng sơn tại xưởng Kyoto no Foncar. Tay nghề kỹ thuật luôn được chau chuốt tỉ mỉ từng chi tiết.";
  }
  if (cleanJaText.includes("6万") || price.includes("6万")) {
    return "Xử lý vết trầy móp thân xe cực kỳ phẳng đẹp chỉ từ 6 vạn yên. Quý khách có nhu cầu sửa chữa thân vỏ xe xin vui lòng liên hệ xưởng!";
  }
  if (cleanJaText.includes("綺麗に出来上がりましたが") || cleanJaText.includes("時間かかりました")) {
    return "Xe phục hồi lại rất phẳng đẹp và bóng bẩy. Mặc dù công đoạn gò nắn tốn nhiều thời gian nhưng giúp khách hàng tiết kiệm tối đa chi phí so với thay mới phụ tùng.";
  }
  if (cleanJaText.includes("色合わせもバッチリ")) {
    return "Màu sơn được pha chỉnh tinh xảo, trùng khớp hoàn toàn với màu sơn gốc của xe. Bề mặt sơn căng bóng không tì vết.";
  }
  if (cleanJaText.includes("リヤバンパー")) {
    return "Phục hồi và sơn mới cản sau (rear bumper) bị trầy xước chỉ từ 5 vạn yên, phẳng đẹp như mới.";
  }
  if (cleanJaText.includes("サイドシル") || cleanJaText.includes("ステップ")) {
    return "Xử lý vết cọ quẹt móp lườn gầm xe trọn gói chỉ 5 vạn yên tại xưởng Kyoto no Foncar. Nhanh chóng, phẳng đẹp và tiết kiệm tối đa.";
  }

  return `${cleanJaText} - Hình ảnh thi công thực tế tại xưởng Kyoto no Foncar. Quý khách vui lòng liên hệ hotline hoặc LINE để được tư vấn báo giá miễn phí!`;
}

// Function to extract genuine price if user explicitly wrote it in caption
export function extractGenuinePrice(text) {
  if (!text) return "";
  // Check patterns like: 5万で, 9万から, 4-5万から, 5万円, 3〜4万円, 6万から
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
    
    let rawPostText = lines.find((l) => l.length > 3 && !l.includes(pid) && !/^[a-zA-Z0-9_-]+\)?$/.test(l));
    if (!rawPostText) {
      rawPostText = "京都のフォンカー 熟練の板金塗装・キズへこみ修理の実績";
    }

    // Clean post text thoroughly (remove markdown links, raw urls, redundant contact info)
    const cleanJa = cleanPostText(rawPostText);

    // Extract price only if author explicitly wrote it
    const genuinePrice = extractGenuinePrice(rawPostText);

    // Determine category based on keywords
    const isPaintOnly = cleanJa.includes("全塗装") || cleanJa.includes("ルーフ塗装") || cleanJa.includes("屋根");
    const category = isPaintOnly
      ? { ja: "塗装・美装", vn: "Sơn Xe & Phục Hồi" }
      : { ja: "板金塗装・修理", vn: "Đồng Sơn & Sửa Chữa" };

    const smartTitle = generateSmartTitle(cleanJa, genuinePrice);
    const vnContent = generateVnContent(cleanJa, genuinePrice);

    const newItem = {
      id: `post-${pid}`,
      date: new Date().toISOString().split("T")[0],
      threadsUrl: canonicalUrl,
      category,
      price: genuinePrice, // Only genuine price or empty string, NEVER fabricated
      image: localImg,
      title: {
        ja: `【施工実績】${smartTitle}`,
        vn: `【Dự án thực tế】${smartTitle}`
      },
      content: {
        ja: cleanJa,
        vn: vnContent
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

// If executed directly, run sync
if (process.argv[1] && process.argv[1].endsWith("sync_threads.mjs")) {
  syncThreads();
}
