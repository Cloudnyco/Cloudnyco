#!/usr/bin/env node
// Builds the profile SVGs in assets/: hero-{dark,light}.svg and stats-{dark,light}.svg.
// Zero dependencies (Node 20+). The visual language follows NCN (nyco.cloud): gray-950 base, emerald accent,
// dotted grid, drifting network log lines, CRT scanlines, a typed mono headline with a gradient second line.
//
//   node scripts/build.mjs            hero + stats (stats need GITHUB_TOKEN; without one the stats SVGs are kept)
//   node scripts/build.mjs --charset  print the non-ASCII characters the SVGs use (input for subset-fonts.py)
//
// SVGs shown through <img> cannot load external fonts, so subsets of JetBrains Mono and Noto Sans SC
// (assets/fonts, OFL-1.1) are embedded as data URIs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const LOGIN = process.env.PROFILE_LOGIN || 'Cloudnyco';

// ---------------------------------------------------------------- copy
const HERO = {
  pill: ['ONLINE', 'AS197817', 'JP'],
  eyebrow: 'NYCO CLOUD NETWORK',
  lineA: 'Cloudnyco',
  lineB: 'Here I Stand',
  subZh: '运营 AS197817 多 PoP 任播网络，并为它打造自托管的运维平台。',
  subEn: 'Running a multi-PoP anycast network and the platform that operates it.',
};
const STATS = {
  title: ['GITHUB ACTIVITY', '动态'],
  synced: 'SYNCED',
  updated: 'UPDATED',
  cells: [
    { zh: '拉取请求', en: 'PULL REQUESTS', hintZh: '已合并', hintEn: 'merged' },
    { zh: '参与项目', en: 'CONTRIBUTED TO', hintZh: '外部仓库', hintEn: 'external repos' },
    { zh: '活跃天数', en: 'ACTIVE DAYS', hintZh: '过去 12 个月', hintEn: 'last 12 months' },
    { zh: '公开仓库', en: 'PUBLIC REPOS', hintZh: '原创', hintEn: 'original' },
  ],
  calendar: ['PR 活动 · 过去 12 个月', 'PULL REQUEST ACTIVITY · LAST 12 MONTHS'],
  less: ['少', 'Less'],
  more: ['More', '多'],
};
// Drifting log lines (documentation prefixes / public resolvers only)
const CLOUD = [
  { y: 0.05, dur: 22, delay: -6, size: 11, hue: 'cyan', text: '2001:db8:18::1  IDLE → ESTABLISHED  AS-PATH 197817 i  pref 100  med 100' },
  { y: 0.14, dur: 26, delay: -12, size: 12, hue: 'pink', text: 'wg0[pop-02]  peer 9xQeWvG7...  828.74 KiB rx  5.12 MiB tx  handshake 23s ago' },
  { y: 0.23, dur: 24, delay: -10, size: 11, hue: 'emerald', text: '2606:4700:4700::/48  unicast  via fe80::1 on eth0 → AS13335' },
  { y: 0.32, dur: 28, delay: -16, size: 10, hue: 'violet', text: 'traceroute 1.1.1.1 → 192.0.2.1 (1.5ms) → 198.51.100.7 (0.6ms) → 1.1.1.1 (0.5ms)' },
  { y: 0.42, dur: 23, delay: -18, size: 11, hue: 'amber', text: 'BIRD 2.17.1 ready · upstream_v6 BGP Established · master6 · 912k routes' },
  { y: 0.53, dur: 27, delay: -20, size: 10, hue: 'blue', text: 'RPKI cache  vrps 542127 valid  +88 invalid  refresh 3m' },
  { y: 0.64, dur: 25, delay: -8, size: 12, hue: 'emerald', text: '[OK] bird table master6 ready · churn 12r/s · age 1h12m · convergence 0.42s' },
  { y: 0.76, dur: 24, delay: -14, size: 10, hue: 'fuchsia', text: 'ip6 fe80::1%eth0  next-hop · pref-life forever · valid forever' },
  { y: 0.88, dur: 26, delay: -4, size: 11, hue: 'cyan', text: 'git push origin main · 4 files changed · checks passed in 1m42s' },
];

// ---------------------------------------------------------------- themes (NCN tokens; light = v7 zinc)
const HUES = {
  dark: { cyan: '#67e8f9', pink: '#f472b6', emerald: '#34d399', violet: '#a78bfa', amber: '#fcd34d', blue: '#93c5fd', fuchsia: '#e879f9' },
  light: { cyan: '#0e7490', pink: '#be185d', emerald: '#047857', violet: '#6d28d9', amber: '#b45309', blue: '#1d4ed8', fuchsia: '#a21caf' },
};
const THEMES = {
  dark: {
    name: 'dark', bg: '#030712', panel: 'rgba(17,24,39,0.5)', border: 'rgba(31,41,55,0.7)',
    g100: '#f3f4f6', g300: '#d1d5db', g400: '#9ca3af', g500: '#6b7280', g600: '#4b5563', g800: '#1f2937',
    dot: 'rgba(255,255,255,0.07)', scan: 'rgba(255,255,255,0.025)', glow: 'rgba(168,247,236,0.35)', spot: 'rgba(16,185,129,0.10)',
    blend: 'screen', cloudOpacity: 0.5, caret: '#ffffff', accent: '#10b981',
    grad: ['#f3f4f6', '#3b82f6', '#ec4899', '#10b981', '#f3f4f6'],
    stat: ['#34d399', '#60a5fa', '#f472b6', '#f3f4f6'],
    heat: ['#111827', '#064e3b', '#047857', '#10b981', '#6ee7b7'],
  },
  light: {
    name: 'light', bg: '#fafafa', panel: '#ffffff', border: '#e4e4e7',
    g100: '#18181b', g300: '#3f3f46', g400: '#52525b', g500: '#71717a', g600: '#a1a1aa', g800: '#e4e4e7',
    dot: 'rgba(24,24,27,0.07)', scan: 'rgba(9,9,11,0.015)', glow: 'rgba(16,185,129,0.12)', spot: 'rgba(16,185,129,0.09)',
    blend: 'multiply', cloudOpacity: 0.55, caret: '#18181b', accent: '#059669',
    grad: ['#18181b', '#2563eb', '#db2777', '#059669', '#18181b'],
    stat: ['#059669', '#2563eb', '#db2777', '#18181b'],
    heat: ['#ececef', '#a7f3d0', '#34d399', '#059669', '#065f46'],
  },
};

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONO = 0.6; // JetBrains Mono advance width (em)
const FONT_FILES = [
  ['JBM', 400, 'jetbrains-mono-400.woff2'], ['JBM', 700, 'jetbrains-mono-700.woff2'],
  ['NotoSC', 400, 'noto-sans-sc-400.woff2'], ['NotoSC', 700, 'noto-sans-sc-700.woff2'],
];
const FAMILY = `'JBM', 'NotoSC', ui-monospace, monospace`;

function fontFaces() {
  return FONT_FILES.map(([fam, w, file]) => {
    const b64 = fs.readFileSync(path.join(ASSETS, 'fonts', file)).toString('base64');
    return `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }).join('\n');
}

/** Every non-ASCII character the SVGs render; the font subsets must cover them (checked in main()). */
function charset() {
  const strings = [Object.values(HERO).flat(), JSON.stringify(STATS), CLOUD.map((r) => r.text)].flat().join('');
  return [...new Set([...strings].filter((c) => c.charCodeAt(0) > 0x7e))].sort().join('');
}

// ---------------------------------------------------------------- hero
function hero(t) {
  const W = 960, H = 380, cx = W / 2;
  const fsH = 64, lineA = { y: 180, text: HERO.lineA }, lineB = { y: 250, text: HERO.lineB };
  for (const l of [lineA, lineB]) { l.w = l.text.length * fsH * MONO; l.x = cx - l.w / 2; }
  const cw = fsH * MONO;
  // typing timeline (seconds): A types 0.4→, pause, B types; one step per character
  const step = 0.085, a0 = 0.4, b0 = a0 + lineA.text.length * step + 0.35;
  const end = b0 + lineB.text.length * step;
  const widths = (n) => Array.from({ length: n + 1 }, (_, i) => (i * cw).toFixed(1)).join(';');
  // caret path: follows A, jumps to B, follows B, then rests at the end of B
  const caretX = [], caretY = [], keyT = [];
  const total = end + 0.01;
  for (let i = 0; i <= lineA.text.length; i++) { keyT.push((a0 + i * step) / total); caretX.push(lineA.x + i * cw); caretY.push(lineA.y); }
  for (let i = 0; i <= lineB.text.length; i++) { keyT.push((b0 + i * step) / total); caretX.push(lineB.x + i * cw); caretY.push(lineB.y); }
  keyT.unshift(0); caretX.unshift(lineA.x); caretY.unshift(lineA.y);
  const kt = keyT.map((k) => Math.min(1, k).toFixed(4)).join(';');

  const pillText = HERO.pill;
  const pillChars = pillText.join(' · ').length;
  const pillW = 34 + pillChars * 11 * (MONO + 0.2), pillX = cx - pillW / 2;
  const cloud = CLOUD.map((r, i) => {
    const y = Math.round(r.y * H) + r.size;
    const dir = i % 2 ? 'reverse' : 'normal';
    return `<text class="row" x="0" y="${y}" font-size="${r.size}" fill="${HUES[t.name][r.hue]}" style="animation-duration:${r.dur}s;animation-delay:${r.delay}s;animation-direction:${dir}">${esc(r.text)}</text>`;
  }).join('\n      ');

  const pillParts = [];
  let px = pillX + 26;
  pillText.forEach((p, i) => {
    if (i) { pillParts.push(`<tspan fill="${t.g600}"> · </tspan>`); }
    pillParts.push(`<tspan fill="${i === 0 ? t.g400 : t.g500}">${esc(p)}</tspan>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(`${HERO.lineA} — ${HERO.lineB}`)}</title>
  <desc id="d">${esc(`${HERO.subZh} ${HERO.subEn}`)}</desc>
  <style>
${fontFaces()}
text{font-family:${FAMILY};}
.row{animation:flow 24s linear infinite;}
@keyframes flow{from{transform:translateX(-${Math.round(W * 0.9)}px)}to{transform:translateX(${Math.round(W * 0.9)}px)}}
.scan{animation:scan 7s linear infinite;}
@keyframes scan{from{transform:translateY(0)}to{transform:translateY(4px)}}
.grid{animation:grid 24s linear infinite;}
@keyframes grid{from{transform:translate(0,0)}to{transform:translate(26px,26px)}}
.headline{animation:breathe 3.6s ease-in-out infinite alternate;}
@keyframes breathe{from{opacity:.92}to{opacity:1}}
.flowgrad{animation:gx 6s ease-in-out infinite;}
@keyframes gx{0%,100%{transform:translateX(0)}50%{transform:translateX(-${lineB.w.toFixed(1)}px)}}
.caret{animation:blink 1.05s steps(1,end) infinite;}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
.pulse{animation:pulse 1.4s cubic-bezier(.4,0,.6,1) infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.row,.scan,.grid,.headline,.flowgrad,.caret,.pulse{animation:none}}
  </style>
  <defs>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1" fill="${t.dot}"/></pattern>
    <pattern id="lines" width="4" height="4" patternUnits="userSpaceOnUse"><rect y="3" width="4" height="1" fill="${t.scan}"/></pattern>
    <radialGradient id="spot" cx="${cx}" cy="${H * 0.3}" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.spot}"/><stop offset=".7" stop-color="${t.spot}" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="hush" cx="${cx}" cy="${H * 0.52}" r="${W * 0.42}" gradientTransform="translate(0 ${H * 0.52}) scale(1 .55) translate(0 -${H * 0.52})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".8"/><stop offset=".6" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <mask id="cloudmask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fade)"/><rect width="${W}" height="${H}" fill="url(#hush)"/></mask>
    <linearGradient id="hgrad" gradientUnits="userSpaceOnUse" x1="${lineB.x}" y1="0" x2="${lineB.x + lineB.w * 2}" y2="0">
      ${t.grad.map((c, i) => `<stop offset="${i / (t.grad.length - 1)}" stop-color="${c}"/>`).join('')}
    </linearGradient>
    <clipPath id="typeA"><rect x="${lineA.x}" y="${lineA.y - fsH}" height="${fsH * 1.3}" width="0"><animate attributeName="width" values="${widths(lineA.text.length)}" begin="${a0}s" dur="${(lineA.text.length + 1) * step}s" calcMode="discrete" fill="freeze"/></rect></clipPath>
    <clipPath id="typeB"><rect x="${lineB.x}" y="${lineB.y - fsH}" height="${fsH * 1.3}" width="0"><animate attributeName="width" values="${widths(lineB.text.length)}" begin="${b0}s" dur="${(lineB.text.length + 1) * step}s" calcMode="discrete" fill="freeze"/></rect></clipPath>
    <clipPath id="textB"><text x="${lineB.x}" y="${lineB.y}" font-size="${fsH}" font-weight="700">${esc(lineB.text)}</text></clipPath>
    <filter id="glow" x="-10%" y="-40%" width="120%" height="180%"><feFlood flood-color="${t.glow}"/><feComposite operator="in" in2="SourceAlpha"/><feGaussianBlur stdDeviation="7"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="caretglow" x="-300%" y="-20%" width="700%" height="140%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect class="grid" x="-26" y="-26" width="${W + 52}" height="${H + 52}" fill="url(#dots)"/>
  <g mask="url(#cloudmask)" style="mix-blend-mode:${t.blend}" opacity="${t.cloudOpacity}" aria-hidden="true">
      ${cloud}
  </g>
  <rect class="scan" y="-4" width="${W}" height="${H + 8}" fill="url(#lines)"/>
  <rect width="${W}" height="${H}" fill="url(#spot)"/>

  <g>
    <rect x="${pillX}" y="34" width="${pillW}" height="30" fill="${t.panel}" stroke="${t.border}"/>
    <rect class="pulse" x="${pillX + 13}" y="46" width="6" height="6" fill="${t.accent}"/>
    <text x="${px}" y="53.5" font-size="11" letter-spacing="2.2">${pillParts.join('')}</text>
  </g>
  <text x="${cx}" y="106" font-size="13" letter-spacing="3.9" text-anchor="middle" fill="${t.g500}">${esc(HERO.eyebrow)}</text>

  <g class="headline" filter="url(#glow)">
    <text clip-path="url(#typeA)" x="${lineA.x}" y="${lineA.y}" font-size="${fsH}" font-weight="700" fill="${t.g100}">${esc(lineA.text)}</text>
    <g clip-path="url(#typeB)"><g clip-path="url(#textB)"><rect class="flowgrad" x="${lineB.x}" y="${lineB.y - fsH}" width="${lineB.w * 2}" height="${fsH * 1.4}" fill="url(#hgrad)"/></g></g>
  </g>
  <rect class="caret" filter="url(#caretglow)" x="${lineA.x}" y="${lineA.y - fsH * 0.78}" width="${(fsH * 0.08).toFixed(1)}" height="${(fsH * 0.92).toFixed(1)}" fill="${t.caret}">
    <animate attributeName="x" values="${caretX.map((v) => (v + fsH * 0.08).toFixed(1)).join(';')}" keyTimes="${kt}" dur="${total.toFixed(3)}s" calcMode="discrete" fill="freeze"/>
    <animate attributeName="y" values="${caretY.map((v) => (v - fsH * 0.78).toFixed(1)).join(';')}" keyTimes="${kt}" dur="${total.toFixed(3)}s" calcMode="discrete" fill="freeze"/>
  </rect>

  <text x="${cx}" y="310" font-size="16" text-anchor="middle" fill="${t.g400}">${esc(HERO.subZh)}</text>
  <text x="${cx}" y="338" font-size="14" text-anchor="middle" fill="${t.g500}">${esc(HERO.subEn)}</text>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${t.border}"/>
</svg>
`;
}

// ---------------------------------------------------------------- stats
// Counts come from the user's pull requests in public repositories (search API), not from the contribution
// calendar: GitHub's calendar reads 0 for this account although its pull requests are public. Private repositories
// are left out so the output is the same whatever token runs the build.
async function gql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': `${LOGIN}-profile` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`GraphQL: ${res.status} ${JSON.stringify(body.errors || body)}`);
  return body.data;
}

async function fetchStats(token) {
  const prs = [];
  for (let after = null; ;) {
    const d = await gql(token, `query($q:String!, $after:String){ search(query:$q, type:ISSUE, first:100, after:$after){
      pageInfo{ hasNextPage endCursor }
      nodes{ ... on PullRequest { createdAt merged repository{ nameWithOwner isPrivate owner{ login } } } } } }`,
    { q: `author:${LOGIN} is:pr`, after });
    prs.push(...d.search.nodes.filter((n) => n.repository && !n.repository.isPrivate));
    if (!d.search.pageInfo.hasNextPage) break;
    after = d.search.pageInfo.endCursor;
  }
  const u = (await gql(token, `query($login:String!){ user(login:$login){
    repositories(ownerAffiliations:OWNER, privacy:PUBLIC, first:100){ totalCount nodes{ isFork } } } }`, { login: LOGIN })).user;

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - 52 * 7 - today.getUTCDay()); // a Sunday, 53 columns
  const perDay = new Map();
  for (const pr of prs) {
    const day = pr.createdAt.slice(0, 10);
    if (new Date(`${day}T00:00:00Z`) >= start) perDay.set(day, (perDay.get(day) || 0) + 1);
  }
  const weeks = [];
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weeks.push([]);
    const date = d.toISOString().slice(0, 10);
    weeks[weeks.length - 1].push({ date, n: perDay.get(date) || 0 });
  }
  return {
    prs: prs.length, merged: prs.filter((p) => p.merged).length,
    contributedTo: new Set(prs.filter((p) => p.repository.owner.login !== LOGIN).map((p) => p.repository.nameWithOwner)).size,
    activeDays: perDay.size,
    repos: u.repositories.totalCount, original: u.repositories.nodes.filter((r) => !r.isFork).length,
    weeks, updated: today.toISOString().slice(0, 10),
  };
}

const level = (n) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : 4);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stats(t, s) {
  const W = 960, H = 360, pad = 28;
  const num = (n) => n.toLocaleString('en-US');
  const values = [
    [num(s.prs), `${STATS.cells[0].hintZh} ${num(s.merged)}`, `${num(s.merged)} ${STATS.cells[0].hintEn}`],
    [num(s.contributedTo), STATS.cells[1].hintZh, STATS.cells[1].hintEn],
    [num(s.activeDays), STATS.cells[2].hintZh, STATS.cells[2].hintEn],
    [num(s.repos), `${STATS.cells[3].hintZh} ${num(s.original)}`, `${num(s.original)} ${STATS.cells[3].hintEn}`],
  ];
  const colW = W / 4, gridY = 50, gridH = 120;
  const cells = STATS.cells.map((c, i) => {
    const x = i * colW + pad;
    return `<g>
    ${i ? `<line x1="${i * colW}" y1="${gridY}" x2="${i * colW}" y2="${gridY + gridH}" stroke="${t.border}"/>` : ''}
    <text x="${x}" y="${gridY + 30}" font-size="12" letter-spacing="1.2" fill="${t.g500}">${esc(c.zh)} · ${esc(c.en)}</text>
    <text x="${x}" y="${gridY + 74}" font-size="34" font-weight="700" fill="${t.stat[i]}">${esc(values[i][0])}</text>
    <text x="${x}" y="${gridY + 100}" font-size="11" letter-spacing=".5" fill="${t.g600}">${esc(values[i][1])} · ${esc(values[i][2])}</text>
  </g>`;
  }).join('\n  ');

  // contribution calendar: 53 weeks × 7 days, phosphor-emerald levels
  const cell = 11, gap = 3, weeks = s.weeks.slice(-53);
  const calW = weeks.length * (cell + gap) - gap;
  const calX = Math.round((W - calW) / 2), calY = gridY + gridH + 58;
  const rects = [];
  const months = [];
  let lastMonth = -1;
  weeks.forEach((wk, wi) => {
    const m = Number(wk[0].date.slice(5, 7)) - 1;
    if (m !== lastMonth && wk[0].date.slice(8) <= '07' && wi < weeks.length - 2) {
      months.push(`<text x="${calX + wi * (cell + gap)}" y="${calY - 8}" font-size="11" fill="${t.g500}">${MONTHS[m]}</text>`);
      lastMonth = m;
    }
    wk.forEach((d) => {
      const di = new Date(`${d.date}T00:00:00Z`).getUTCDay();
      rects.push(`<rect x="${calX + wi * (cell + gap)}" y="${calY + di * (cell + gap)}" width="${cell}" height="${cell}" fill="${t.heat[level(d.n)]}"/>`);
    });
  });
  const legendY = calY + 7 * (cell + gap) + 16;
  const legendX = calX + calW - (5 * (cell + gap) - gap);
  const legend = t.heat.map((c, i) => `<rect x="${legendX + i * (cell + gap)}" y="${legendY - 9}" width="${cell}" height="${cell}" fill="${c}"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
  <title id="t">${esc(`${LOGIN} · GitHub activity`)}</title>
  <desc id="d">${esc(`${s.prs} pull requests in public repositories (${s.merged} merged) across ${s.contributedTo} external repositories; active on ${s.activeDays} days in the last 12 months; ${s.repos} public repositories. Updated ${s.updated}.`)}</desc>
  <style>
${fontFaces()}
text{font-family:${FAMILY};}
.pulse{animation:pulse 1.4s cubic-bezier(.4,0,.6,1) infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion: reduce){.pulse{animation:none}}
  </style>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="${t.bg}" stroke="${t.border}"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="${t.panel}"/>
  <rect class="pulse" x="${pad}" y="22" width="6" height="6" fill="${t.accent}"/>
  <text x="${pad + 16}" y="30" font-size="12" letter-spacing="2.2" fill="${t.g400}">${esc(STATS.title[0])} <tspan fill="${t.g600}">·</tspan> ${esc(STATS.title[1])}</text>
  <text x="${W - pad}" y="30" font-size="12" letter-spacing="2.2" text-anchor="end" fill="${t.g500}">${esc(STATS.synced)} <tspan fill="${t.g600}">·</tspan> ${esc(s.updated)} UTC</text>
  <line x1="0" y1="${gridY}" x2="${W}" y2="${gridY}" stroke="${t.border}"/>
  ${cells}
  <line x1="0" y1="${gridY + gridH}" x2="${W}" y2="${gridY + gridH}" stroke="${t.border}"/>
  <text x="${calX}" y="${calY - 30}" font-size="12" letter-spacing="1.2" fill="${t.g500}">${esc(STATS.calendar[0])} · ${esc(STATS.calendar[1])}</text>
  ${months.join('\n  ')}
  <g>${rects.join('')}</g>
  <text x="${legendX - 8}" y="${legendY}" font-size="11" text-anchor="end" fill="${t.g500}">${esc(STATS.less[1])} ${esc(STATS.less[0])}</text>
  ${legend}
  <text x="${legendX + 5 * (cell + gap) + 5}" y="${legendY}" font-size="11" fill="${t.g500}">${esc(STATS.more[0])} ${esc(STATS.more[1])}</text>
</svg>
`;
}

// ---------------------------------------------------------------- main
async function main() {
  if (process.argv.includes('--charset')) { process.stdout.write(charset()); return; }
  const covered = fs.readFileSync(path.join(ASSETS, 'fonts', 'charset.txt'), 'utf8');
  const missing = [...charset()].filter((c) => !covered.includes(c));
  if (missing.length) throw new Error(`font subsets miss ${missing.join('')}; run scripts/subset-fonts.py`);

  for (const t of Object.values(THEMES)) fs.writeFileSync(path.join(ASSETS, `hero-${t.name}.svg`), hero(t));
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) { console.log('hero written; no GITHUB_TOKEN, stats kept as they are'); return; }
  const s = await fetchStats(token);
  for (const t of Object.values(THEMES)) fs.writeFileSync(path.join(ASSETS, `stats-${t.name}.svg`), stats(t, s));
  console.log(`hero + stats written (${s.prs} PRs, ${s.merged} merged, ${s.contributedTo} repos, ${s.activeDays} active days, updated ${s.updated})`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
