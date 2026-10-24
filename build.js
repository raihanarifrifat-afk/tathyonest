/* TathyoNest — সাইট বানানোর স্ক্রিপ্ট
   Cloudflare Pages প্রতিবার সাইট বানানোর সময় এটা চালায়:
   Supabase থেকে "প্রকাশিত" চাকরি, ফলাফল ও পরীক্ষার তথ্য এনে index.html-এ বসিয়ে দেয়।
   ফলে ভিজিটররা ডেটাবেসে না গিয়ে Cloudflare থেকেই দ্রুত সাইট দেখেন।
   কোনো সমস্যা হলে বিল্ড থেমে যায় এবং আগের সাইটটাই চালু থাকে। */

const fs = require("fs");

const SUPABASE_URL = "https://jzqathsjweryiwyynxzh.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_b5yyz-iIHdembZTYe-HEnA_R7507R5a"; // পাবলিক কী — সাইটে রাখা নিরাপদ

async function fetchTable(table, order) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&status=eq.published&order=${order}&limit=5000`;
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

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const block =
    "/*DATA:START — এই অংশ admin প্যানেল থেকে নিজে নিজে বদলায়। এখানে হাতে কিছু লিখবেন না। */\n" +
    `const UPDATED = ${js(today)};\n` +
    `const JOBS = ${js(jobs.map(toJob))};\n` +
    `const RESULTS = ${js(results.map(toResult))};\n` +
    `const EXAMS = ${js(exams.map(toExam))};\n` +
    "/*DATA:END*/";

  const file = "index.html";
  const html = fs.readFileSync(file, "utf8");
  const start = html.indexOf("/*DATA:START");
  const end = html.indexOf("/*DATA:END*/");
  if (start < 0 || end < 0 || end < start) throw new Error("index.html-এ /*DATA:START*/ ... /*DATA:END*/ চিহ্ন পাওয়া যায়নি");

  fs.writeFileSync(file, html.slice(0, start) + block + html.slice(end + "/*DATA:END*/".length));
  console.log(`✓ সাইট তৈরি: ${jobs.length}টি চাকরি, ${results.length}টি ফলাফল, ${exams.length}টি পরীক্ষা (হালনাগাদ ${today})`);
}

main().catch((err) => {
  console.error("✗ বিল্ড ব্যর্থ — আগের সাইটটাই চালু থাকবে।\n", err);
  process.exit(1);
});
