/* TathyoNest — সাইট বানানোর স্ক্রিপ্ট
   Cloudflare Pages প্রতিবার সাইট বানানোর সময় এটা চালায়:
   Supabase থেকে "প্রকাশিত" চাকরি, ফলাফল ও পরীক্ষার তথ্য এনে index.html-এ বসিয়ে দেয়।
   ফলে ভিজিটররা ডেটাবেসে না গিয়ে Cloudflare থেকেই দ্রুত সাইট দেখেন।
   কোনো সমস্যা হলে বিল্ড থেমে যায় এবং আগের সাইটটাই চালু থাকে। */

const fs = require("fs");

const SUPABASE_URL = "https://jzqathsjweryiwyynxzh.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_b5yyz-iIHdembZTYe-HEnA_R7507R5a"; // পাবলিক কী — সাইটে রাখা নিরাপদ

// সাইটের ঠিকানা — নিজের ডোমেইন কিনলে এখানে বদলাবেন (যেমন "https://tathyonest.com")
const SITE = "https://tathyonest.pages.dev";
// Google AdSense অনুমোদনের পর আপনার Publisher ID বসান (যেমন "pub-1234567890123456")।
// বসালে সব পাতায় AdSense কোড আর ads.txt নিজে থেকে যোগ হবে। খালি থাকলে কিছু হবে না।
const ADSENSE_PUB = "";

// আলাদা ঠিকানার পাতা (Google ও AdSense-এর জন্য)
const INFO_PAGES = [
  { id: "about",   title: "আমাদের সম্পর্কে — TathyoNest",       desc: "TathyoNest কী, চাকরির তথ্য কোথা থেকে আসে এবং আমরা কীভাবে কাজ করি।" },
  { id: "contact", title: "যোগাযোগ — TathyoNest",               desc: "প্রশ্ন, পরামর্শ, ভুল তথ্যের খবর বা বিজ্ঞাপনের জন্য TathyoNest-এর সাথে যোগাযোগ করুন।" },
  { id: "privacy", title: "গোপনীয়তা নীতি — TathyoNest",        desc: "TathyoNest আপনার কোন তথ্য ব্যবহার করে, কুকি ও বিজ্ঞাপন সম্পর্কে বিস্তারিত।" },
  { id: "terms",   title: "শর্তাবলি ও দায়মুক্তি — TathyoNest", desc: "TathyoNest ব্যবহারের শর্তাবলি ও দায়মুক্তি।" },
];

async function fetchTable(table, order, cols = "*") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&status=eq.published&order=${order}&limit=5000`;
  const res = await fetch(url, { headers: { apikey: PUBLISHABLE_KEY, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${table} আনা যায়নি: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(`${table}: অপ্রত্যাশিত উত্তর`);
  return rows;
}

// খালি ঘর বাদ দিয়ে সাইটের পুরোনো ফরম্যাটে সাজানো
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null && v !== undefined));

function toJob(r) {
  return clean({
    divs: r.divs, type: r.type, title: r.title, org: r.org, cat: r.cat, posts: r.posts,
    salary: r.salary, edu: r.edu, exp: r.exp, area: r.area,
    date: r.deadline, time: r.deadline_time, apply: r.apply_url, source: r.source, sourceUrl: r.source_url,
  });
}
function toResult(r) {
  return clean({ kind: r.kind, title: r.title, org: r.org, date: r.pub_date, text: r.details, link: r.link, source: r.source, sourceUrl: r.source_url });
}
// সঠিক উত্তর ও ব্যাখ্যা পাতায় রাখা হয় না — জমা দিলে সার্ভার (mcq_submit) নম্বর গোনে
function toMcq(r) {
  return { id: r.id, c: r.category, q: r.question, o: [r.opt1, r.opt2, r.opt3, r.opt4] };
}
function toExam(r) {
  const e = clean({ title: r.title, org: r.org, end: r.end_date, when: r.when_text, text: r.details, link: r.link, source: r.source, sourceUrl: r.source_url });
  e.date = r.exam_date || ""; // সাইটের কোড date না থাকলে "" আশা করে
  return e;
}

// <script>-এর ভেতরে নিরাপদে বসানোর জন্য
const LS = new RegExp("\\u2028", "g"), PS = new RegExp("\\u2029", "g");
const js = (v) => JSON.stringify(v, null, 1).replace(/</g, "\\u003c").replace(LS, "\\u2028").replace(PS, "\\u2029");

async function main() {
  const [jobs, results, exams] = await Promise.all([
    fetchTable("jobs", "deadline.asc"),
    fetchTable("results", "pub_date.desc"),
    fetchTable("exams", "exam_date.asc.nullsfirst"),
  ]);

  // MCQ: টেবিল না থাকলে বা সমস্যা হলে আগের প্রশ্নগুলোই রেখে দেওয়া হয়, বিল্ড থামে না
  let mcqBlock;
  try {
    const rows = await fetchTable("mcq_questions", "category.asc,created_at.asc", "id,category,question,opt1,opt2,opt3,opt4");
    mcqBlock = `const MCQS = ${js(rows.map(toMcq))};\n`;
    console.log(`✓ MCQ: ${rows.length}টি প্রশ্ন`);
  } catch (e) {
    const cur = fs.readFileSync("index.html", "utf8");
    const m = cur.match(/const MCQS = [\s\S]*?\];\n/);
    mcqBlock = m && /"id":/.test(m[0]) && !/"a":/.test(m[0]) ? m[0] : "const MCQS = [];\n";
    console.warn("! MCQ আনা যায়নি, আগের প্রশ্ন রাখা হলো:", e.message);
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const block =
    "/*DATA:START — এই অংশ admin প্যানেল থেকে নিজে নিজে বদলায়। এখানে হাতে কিছু লিখবেন না। */\n" +
    `const UPDATED = ${js(today)};\n` +
    `const JOBS = ${js(jobs.map(toJob))};\n` +
    `const RESULTS = ${js(results.map(toResult))};\n` +
    `const EXAMS = ${js(exams.map(toExam))};\n` +
    mcqBlock +
    "/*DATA:END*/";

  const file = "index.html";
  const html = fs.readFileSync(file, "utf8");
  const start = html.indexOf("/*DATA:START");
  const end = html.indexOf("/*DATA:END*/");
  if (start < 0 || end < 0 || end < start) throw new Error("index.html-এ /*DATA:START*/ ... /*DATA:END*/ চিহ্ন পাওয়া যায়নি");

  let out = html.slice(0, start) + block + html.slice(end + "/*DATA:END*/".length);
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const head = (h, extra) => h.replace("</head>", extra + "\n</head>");
  const adsTag = ADSENSE_PUB ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${ADSENSE_PUB}" crossorigin="anonymous"></script>` : "";

  // প্রথম পাতা
  fs.writeFileSync(file, head(out, `<link rel="canonical" href="${SITE}/">${adsTag}`));

  // আলাদা ঠিকানার তথ্য-পাতা: /about, /contact, /privacy, /terms
  for (const p of INFO_PAGES) {
    let h = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
               .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(p.desc)}">`);
    h = head(h, `<link rel="canonical" href="${SITE}/${p.id}"><script>window.START_PAGE="${p.id}"</script>${adsTag}`);
    fs.writeFileSync(p.id + ".html", h);
  }

  // sitemap.xml ও robots.txt
  const urls = ["/", ...INFO_PAGES.map((p) => "/" + p.id)];
  fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod>${u === "/" ? "<changefreq>daily</changefreq>" : ""}</url>`).join("\n") + "\n</urlset>\n");
  fs.writeFileSync("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE}/sitemap.xml\n`);

  // ads.txt (AdSense)
  if (ADSENSE_PUB) fs.writeFileSync("ads.txt", `google.com, ${ADSENSE_PUB}, DIRECT, f08c47fec0942fa0\n`);
  console.log(`✓ সাইট তৈরি: ${jobs.length}টি চাকরি, ${results.length}টি ফলাফল, ${exams.length}টি পরীক্ষা (হালনাগাদ ${today})`);
}

main().catch((err) => {
  console.error("✗ বিল্ড ব্যর্থ — আগের সাইটটাই চালু থাকবে।\n", err);
  process.exit(1);
});
