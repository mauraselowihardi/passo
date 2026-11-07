/* PASSO — Fine Dining. Vanilla JS SPA (hash routes). Auth: Supabase (config carried over from EduFunnel). */
const SUPABASE_URL = "https://xhfoihextncecgybzvon.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xvJbg8pQLNoHw_qvf3zswQ_wxX-9SRg";
/* n8n webhook. Test URL only works while n8n is "Listening for test event". For production, activate the workflow and use /webhook/passo instead. */
const N8N_WEBHOOK_URL = "http://localhost:5678/webhook-test/passo";
/* Ask PASSO assistant. To connect your Hermes agent, set HERMES_ENDPOINT to its URL.
   Request  (POST JSON): { message, history:[{role,content}], context:{ restaurant, menu } }
   Response (JSON):      { reply: "..." }   (also accepts message / output / text)
   Leave empty to use the built-in answers. If the agent is unreachable, the built-in answers are used as a fallback. */
const HERMES_ENDPOINT = "";
const HERMES_HEADERS = {}; // e.g. { Authorization: "Bearer ..." } — do not put secret keys here; use a server-side proxy.
/* Photos: drop image URLs/paths here to replace placeholders. */
const IMG = {
  hero: "",
  story: "assets/interior.jpeg",
  chef: "assets/dryaged ribeye.png",
  g1: "assets/maindining.png",
  g2: "assets/candleit.jpeg",
  g3: "assets/chefcounter.jpeg",
  exp1: "assets/winecellar.png",
  exp2: "assets/bar.png",
  "Beef Tartare": "assets/beeftartare.jpeg",
  "Foie Gras Torchon": "assets/foie gras torchon.jpeg",
  "Hamachi Crudo": "assets/Hamachi Crudo.jpeg",
  Velouté: "assets/veloute.jpg",
  "Seared Scallop": "assets/Seared Scallop.jpeg",
  "Rack of Lamb": "assets/Rack of Lamb.jpeg",
  "Duck Breast": "assets/duck breast.jpeg",
  "Dry-Aged Ribeye": "assets/dryaged ribeye.png",
  "Wagyu Short Rib": "assets/wagyu short rib.jpg",
  "Miso Black Cod": "assets/miso black cod.jpeg",
  "Mushroom Risotto": "assets/mushroom risotto.jpeg",
  "Chocolate Soufflé": "assets/chocolate souffle.jpg",
  "Vanilla Pannacotta": "assets/vanilla pannacotta.jpeg",
  "Brown Butter Tart": "assets/brown butter tart.jpeg",
  "Aged Cheese Course": "assets/Aged Cheese Course.jpeg",
  "Passo Old Fashioned": "assets/passo old fashioned.jpeg",
  "Barolo, by the glass": "assets/barolo by the glass.jpeg",
  "Champagne Brut": "assets/champagne brut.jpeg",
  "Aged Tea Pairing": "assets/aged tea pairing.jpeg",
  "Sparkling Yuzu": "assets/sparkling yuzu.jpeg",
};

const PASSO_CONFIG = window.PASSO_CONFIG || {};
const PASSO_DATA = window.PASSO_DATA || {
  months: [],
  reservations: [],
  cancelled: [],
  noShow: [],
  returningPct: [],
  popularMenu: [],
  baseRatings: {},
  reviews: [],
};
/* ---------- Auth: "local" demo mode (accounts stay in this browser) or Supabase ---------- */
const AUTH_LOCAL = (window.PASSO_CONFIG || {}).AUTH_MODE === "local";
const DEMO = {
  email: "demo@passo.id",
  password: "passo1234",
  name: "Demo Guest",
};
const authMsg = (e) =>
  /failed to fetch|networkerror|load failed|fetch/i.test((e && e.message) || "")
    ? "Cannot reach the sign-in service. Please check your connection. If your network blocks it, try another network, a different DNS (1.1.1.1), or a VPN."
    : (e && e.message) || "Something went wrong. Please try again.";
const lget = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const lset = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
async function sha(t) {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(t),
    );
    return [...new Uint8Array(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }
  return btoa(unescape(encodeURIComponent(t)));
}
const localAuth = (() => {
  const subs = [],
    KU = "passo_local_users",
    KS = "passo_local_session";
  const mk = (u) => ({
    id: u.id,
    email: u.email,
    user_metadata: { name: u.name },
    app_metadata: { role: u.role || "customer" },
  });
  const emit = (u) =>
    subs.forEach((cb) => cb("AUTH", u ? { user: mk(u) } : null));
  const find = (email) => lget(KU, []).find((x) => x.email === email);
  return {
    async getSession() {
      const u = find(lget(KS, null));
      return { data: { session: u ? { user: mk(u) } : null } };
    },
    onAuthStateChange(cb) {
      subs.push(cb);
    },
    async signUp({ email, password, options }) {
      email = email.toLowerCase();
      if (find(email))
        return {
          data: {},
          error: { message: "An account with this email already exists." },
        };
      const u = {
        id: "local-" + Date.now(),
        email,
        name: (options && options.data && options.data.name) || email,
        pw: await sha(email + password),
      };
      lset(KU, [...lget(KU, []), u]);
      lset(KS, email);
      emit(u);
      return { data: { session: { user: mk(u) } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      email = email.toLowerCase();
      const u = find(email);
      if (!u || u.pw !== (await sha(email + password)))
        return { data: {}, error: { message: "Invalid email or password." } };
      lset(KS, email);
      emit(u);
      return { data: { session: { user: mk(u) } }, error: null };
    },
    async signOut() {
      try {
        localStorage.removeItem(KS);
      } catch {}
      emit(null);
      return { error: null };
    },
    async updateUser({ data }) {
      const e = lget(KS, null),
        us = lget(KU, []).map((x) =>
          x.email === e ? { ...x, name: data.name } : x,
        );
      lset(KU, us);
      emit(us.find((x) => x.email === e));
      return { error: null };
    },
  };
})();
const demoBlock = () =>
  AUTH_LOCAL
    ? `<div class="stack" style="margin-top:28px"><button type="button" class="btn line" id="demoLogin">Continue with demo account</button><p class="small muted">Demo mode: accounts are saved in this browser only. Demo login: ${DEMO.email} / ${DEMO.password}</p></div>`
    : "";
const sb =
  !AUTH_LOCAL && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
const authApi = AUTH_LOCAL ? localAuth : sb ? sb.auth : null;
let user = null;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const idr = (n) => "Rp " + n.toLocaleString("id-ID");
const ph = (k, label, cls = "") =>
  `<figure class="ph ${cls}" role="img" aria-label="${esc(label)}">${IMG[k] ? `<img src="${IMG[k]}" alt="${esc(label)}">` : ""}<span>${IMG[k] ? "" : "Photo: " + esc(label)}</span></figure>`;

const MENU = [
  {
    c: "Appetizer",
    n: "Beef Tartare",
    pop: 1,
    p: 165000,
    v: 0,
    d: "Hand-cut wagyu, quail yolk, capers, bone-marrow toast.",
    i: "wagyu tenderloin, quail yolk, capers, shallot, sourdough",
  },
  {
    c: "Appetizer",
    n: "Foie Gras Torchon",
    p: 210000,
    v: 0,
    d: "Duck liver, fig jam, warm brioche, sauternes gel.",
    i: "duck liver, fig, brioche, sauternes",
  },
  {
    c: "Appetizer",
    n: "Hamachi Crudo",
    p: 145000,
    v: 0,
    d: "Yellowtail, yuzu kosho, cucumber, shaved fennel.",
    i: "hamachi, yuzu, cucumber, fennel, olive oil",
  },
  {
    c: "Appetizer",
    n: "Velouté",
    p: 120000,
    v: 1,
    d: "Burnt leek and black truffle, hazelnut cream.",
    i: "leek, black truffle, hazelnut, cream",
  },
  {
    c: "Appetizer",
    n: "Seared Scallop",
    p: 165000,
    v: 0,
    d: "Hokkaido scallop, cauliflower purée, brown butter.",
    i: "scallop, cauliflower, butter, caper",
  },
  {
    c: "Main Course",
    n: "Wagyu Short Rib",
    pop: 1,
    p: 485000,
    v: 0,
    d: "Twelve-hour braise, bone marrow jus, charred shallot.",
    i: "wagyu short rib, bone marrow, shallot, red wine, thyme",
    sig: 1,
  },
  {
    c: "Main Course",
    n: "Dry-Aged Ribeye",
    pop: 1,
    p: 650000,
    v: 0,
    d: "Forty days on the bone, binchotan-grilled, béarnaise.",
    i: "ribeye 40-day dry-aged, binchotan, shallot, tarragon, butter",
    chef: 1,
  },
  {
    c: "Main Course",
    n: "Rack of Lamb",
    p: 520000,
    v: 0,
    d: "Herb crust, roasted garlic, rosemary jus.",
    i: "lamb rack, rosemary, garlic, thyme, dijon",
  },
  {
    c: "Main Course",
    n: "Duck Breast",
    p: 420000,
    v: 0,
    d: "Dry-aged duck, cherry, charred endive, star anise jus.",
    i: "duck breast, cherry, endive, star anise",
  },
  {
    c: "Main Course",
    n: "Miso Black Cod",
    p: 395000,
    v: 0,
    d: "Sake-miso glaze, pickled ginger, bok choy.",
    i: "black cod, white miso, sake, ginger, bok choy",
  },
  {
    c: "Main Course",
    n: "Mushroom Risotto",
    p: 280000,
    v: 1,
    d: "Carnaroli rice, wild mushrooms, aged parmesan.",
    i: "carnaroli rice, wild mushrooms, parmesan, butter",
  },
  {
    c: "Dessert",
    n: "Chocolate Soufflé",
    pop: 1,
    p: 135000,
    v: 1,
    d: "Single-origin dark chocolate, crème anglaise.",
    i: "dark chocolate, eggs, cream, vanilla",
  },
  {
    c: "Dessert",
    n: "Vanilla Pannacotta",
    p: 105000,
    v: 1,
    d: "Madagascan vanilla, roasted strawberries.",
    i: "vanilla, cream, strawberry, gelatin",
  },
  {
    c: "Dessert",
    n: "Brown Butter Tart",
    p: 115000,
    v: 1,
    d: "Salted caramel, toasted almond, crème fraîche.",
    i: "butter, almond, caramel, crème fraîche",
  },
  {
    c: "Dessert",
    n: "Aged Cheese Course",
    p: 140000,
    v: 0,
    d: "Three farmhouse cheeses, honeycomb, walnut bread.",
    i: "aged cheese, honeycomb, walnut",
  },
  {
    c: "Beverages",
    n: "Passo Old Fashioned",
    p: 150000,
    v: 1,
    d: "Bourbon, demerara, orange bitters, smoked ice.",
    i: "bourbon, demerara, bitters, orange",
  },
  {
    c: "Beverages",
    n: "Barolo, by the glass",
    p: 190000,
    v: 1,
    d: "Structured and deep, made for the ribeye.",
    i: "nebbiolo grape",
  },
  {
    c: "Beverages",
    n: "Champagne Brut",
    p: 240000,
    v: 1,
    d: "Fine bubbles to open the evening.",
    i: "chardonnay, pinot noir",
  },
  {
    c: "Beverages",
    n: "Aged Tea Pairing",
    p: 95000,
    v: 1,
    d: "Three rare teas, chosen to match your courses.",
    i: "aged oolong, white tea, jasmine",
  },
  {
    c: "Beverages",
    n: "Sparkling Yuzu",
    p: 70000,
    v: 1,
    d: "Non-alcoholic. Yuzu, elderflower, soda.",
    i: "yuzu, elderflower, soda water",
  },
];
const CATS = ["All", "Appetizer", "Main Course", "Dessert", "Beverages"];
const INFO = {
  addr: "Jl. Senopati No. 18, Jakarta Selatan",
  hours:
    "Tuesday–Sunday · Lunch 12:00–14:30 · Dinner 18:00–22:30. Closed Monday.",
  tel: "+62 21 5550 1818",
  mail: "reservations@passo.id",
};

/* ---------- storage: reservations (Supabase table `reservations`, local fallback) ---------- */
const lk = () => "passo_res_" + (user ? user.email : "guest");
const localRes = () => {
  try {
    return JSON.parse(localStorage.getItem(lk()) || "[]");
  } catch {
    return [];
  }
};
const setLocal = (a) => {
  try {
    localStorage.setItem(lk(), JSON.stringify(a));
  } catch {}
};
const dbErr = (e) =>
  /failed to fetch|network|load failed/i.test((e && e.message) || "")
    ? "Cannot reach the database. Please check your connection and try again."
    : e && e.code === "42P01"
      ? "The database tables are not set up yet. Run supabase_schema.sql in the Supabase SQL Editor."
      : "We could not save this. Please try again.";
/* Connected to Supabase: reservations are saved ONLY to the database (errors are shown, never faked). Demo/local mode: browser storage. */
async function saveRes(r) {
  r.status = "confirmed";
  r.code = "PS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  if (sb) {
    if (!user) return { error: "Please sign in to reserve a table." };
    const { error } = await sb.from("reservations").insert({
      code: r.code,
      user_id: user.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      res_date: r.date,
      res_time: r.time,
      guests: r.guests,
      notes: r.notes,
      status: r.status,
    });
    if (error) {
      console.error("PASSO reservation:", error);
      return { error: dbErr(error) };
    }
    return r;
  }
  setLocal([r, ...localRes()]);
  return r;
}
async function listRes() {
  if (!sb) return localRes();
  if (!user) return [];
  const { data, error } = await sb
    .from("reservations")
    .select("*")
    .order("res_date", { ascending: false });
  if (error) {
    console.error("PASSO reservations:", error);
    return [];
  }
  return data.map((x) => ({
    code: x.code,
    name: x.name,
    date: x.res_date,
    time: String(x.res_time).slice(0, 5),
    guests: x.guests,
    notes: x.notes,
    status: x.status,
  }));
}
async function cancelRes(code) {
  if (sb && user) {
    await sb
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("code", code);
    return;
  }
  setLocal(
    localRes().map((r) =>
      r.code === code ? { ...r, status: "cancelled" } : r,
    ),
  );
}

/* ---------- chrome ---------- */
const NAV = [
  ["home", "Home"],
  ["story", "Our Story"],
  ["menu", "Menu"],
  ["experience", "Experience"],
  ["dashboard", "Statistics"],
  ["contact", "Contact"],
];
function renderNav(route) {
  $("#nav").innerHTML =
    `<div class="wrap"><a class="logo" href="#/home" aria-label="passo home">passo</a>
  <nav class="links" id="links">${NAV.map(([k, l]) => `<a href="#/${k}" class="${route === k ? "on" : ""}">${l}</a>`).join("")}</nav>
  <div class="nav-r">${user ? `<a class="hide-m" href="#/account">My Account</a>` : `<a class="hide-m" href="#/login">Sign in</a>`}<a class="btn sm" href="#/reserve">Reserve a Table</a>
  <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i></button></div></div>`;
  $("#burger").onclick = (e) => {
    const o = $("#links").classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", o);
  };
}
function renderFoot() {
  $("#foot").innerHTML =
    `<div class="wrap"><div class="big" aria-hidden="true">Passo</div><div class="cols"><div><div class="logo" style="color:var(--ivory)">passo</div><p class="small" style="margin-top:16px">A quiet room, a long table, and a kitchen that takes its time.</p></div>
  <div><h3>Visit</h3><p class="small">${INFO.addr}</p></div><div><h3>Hours</h3><p class="small">${INFO.hours}</p></div>
  <div><h3>Contact</h3><p class="small"><a href="tel:${INFO.tel.replace(/\s/g, "")}">${INFO.tel}</a><br><a href="mailto:${INFO.mail}">${INFO.mail}</a><br><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a> · <a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a></p></div></div>
  <div class="bt">© 2026 PASSO Fine Dining. All rights reserved.</div></div>`;
}

/* ---------- pages ---------- */
const P = {};
const dishCard = (m) =>
  `<article tabindex="0" data-dish="${esc(m.n)}">${ph(m.n, m.n)}<h3>${esc(m.n)}</h3><p class="muted small">${esc(m.d)}</p><span class="price">${idr(m.p)}</span></article>`;
P.home = () => {
  const f = ["Wagyu Short Rib", "Velouté", "Chocolate Soufflé"].map((n) =>
    MENU.find((m) => m.n === n),
  );
  const chef = MENU.find((m) => m.chef);
  return `<section class="hero2">${ph("hero", "Plated signature dish, candlelit table", "bg")}<div class="hc"><div class="ht"><h1><span class="hl" style="--n:0"><span>An Art of</span></span><span class="hl" style="--n:1"><span>Fine Dining.</span></span></h1><div class="hrow"><p>A seasonal tasting room in the heart of Jakarta, where unhurried service and patient cooking turn an evening into an occasion.</p><div class="acts"><a class="btn lt" href="#/reserve">Reserve a Table</a><a class="tlink lt" href="#/menu">View the menu</a></div></div></div></div><div class="hb"><span>${INFO.addr}</span><span>Tuesday – Sunday · Dinner from 18:00</span><span class="pic">Pictured: Wagyu Short Rib</span></div></section>
  <section class="s"><div class="wrap intro"><p class="lead">We believe a meal should be remembered, not just eaten.</p><div class="stack"><p>Every course at PASSO is built from a few honest ingredients, handled with restraint. We cook with the seasons, set the pace of the evening ourselves, and leave the rest to the table.</p><a class="tlink" href="#/story">Read our story</a></div></div></section>
  <section class="s alt"><div class="wrap"><h2>Featured dishes</h2><div class="dish">${f.map(dishCard).join("")}</div></div></section>
  <section class="chef split">${ph("chef", "Chef plating " + chef.n)}<div class="stack ct"><h2>Chef’s recommendation</h2><h3>${chef.n}</h3><p class="muted">${chef.d} Paired with a glass of Barolo, it is the cut our chef orders on his night off.</p><button class="btn" data-dish="${chef.n}">View dish</button></div></section>
  <section class="quote"><p>We cook with the seasons, and let the table set the pace.</p><small>The PASSO kitchen</small></section>
  <section class="s" style="padding-top:0"><div class="wrap"><h2>The room</h2><div class="gal">${ph("g1", "Main dining room")}${ph("g2", "Candlelit table")}${ph("g3", "Chef’s counter")}${ph("exp1", "Wine cellar")}${ph("exp2", "Bar")}</div></div></section>
  ${reviewsSection()}
  <section class="s alt cta"><div class="wrap"><h2>Join us for dinner.</h2><p class="muted">Tables are limited each evening. Reserve ahead for birthdays, anniversaries and quieter occasions.</p><a class="btn" href="#/reserve">Reserve a Table</a></div></section>`;
};
P.story =
  () => `<div class="wrap page-h"><h1>Our Story</h1><p class="muted">PASSO means “step” in Italian — one deliberate step at a time.</p></div>
  <section class="s"><div class="wrap two">${ph("story", "Interior of PASSO")}<div class="stack"><h2>Begun with a single table.</h2><p>PASSO opened in 2019 as a supper club for twelve guests. The idea was simple: cook slowly, serve generously, and never rush a conversation.</p><p>Today the room seats forty, but the philosophy has not changed. Menus follow the market, techniques are classical, and every plate leaves room for silence.</p></div></div></section>
  <section class="s alt"><div class="wrap rows"><div><h3>Concept</h3><p>A modern European kitchen with Indonesian produce at its centre — local seafood, highland vegetables, and spice used with a light hand.</p></div><div><h3>Experience</h3><p>Warm lighting, no music louder than conversation, and service that anticipates rather than interrupts.</p></div><div><h3>Philosophy</h3><p>Fewer ingredients, better ingredients, and the discipline to stop adding.</p></div></div></section>
  <section class="s cta"><div class="wrap"><a class="btn" href="#/reserve">Reserve a Table</a></div></section>`;
P.menu =
  () => `<div class="wrap page-h"><h1>Our Menu</h1><p class="muted">Seasonal and subject to change. Select a dish for ingredients and notes.</p></div>
  <section class="s" style="padding-top:0"><div class="wrap"><div class="tabs" role="tablist">${CATS.map((c, i) => `<button role="tab" data-cat="${c}" class="${i ? "" : "on"}">${c}</button>`).join("")}</div><div class="mwrap"><div class="mlist" id="menuGrid"></div><aside class="mprev" id="mPrev" aria-live="polite"></aside></div></div></section>`;
const menuRow = (m) =>
  `<article tabindex="0" data-dish="${esc(m.n)}"><div class="mh"><h3>${esc(m.n)}${m.v ? "<sup>v</sup>" : ""}</h3><i></i><span class="price">${idr(m.p)}</span></div><p class="muted small">${esc(m.d)}</p></article>`;
const menuItems = (cat) =>
  (cat === "All" ? CATS.slice(1) : [cat])
    .map(
      (c) =>
        `<div class="mc">${cat === "All" ? `<h2>${c}</h2>` : ""}${MENU.filter(
          (m) => m.c === c,
        )
          .map(menuRow)
          .join("")}</div>`,
    )
    .join("");
P.experience =
  () => `<div class="wrap page-h"><h1>The Experience</h1><p class="muted">An evening at PASSO, from the first glass to the last cup of tea.</p></div>
  ${[
    [
      "Ambience",
      "Low light, linen, walnut and brass. The room is designed to be quiet enough for a whispered toast.",
      "exp1",
    ],
    [
      "Chef’s table",
      "Eight seats facing the pass. A tasting of seven courses, narrated by the kitchen.",
      "chef",
    ],
    [
      "Special occasions",
      "Anniversaries, proposals and private dinners for up to twenty. Tell us what you are celebrating and we will handle the rest.",
      "exp2",
    ],
  ]
    .map(
      ([t, d, k], i) =>
        `<section class="s ${i % 2 ? "alt" : ""}"><div class="wrap two">${i % 2 ? "" : ph(k, t)}<div class="stack"><h2>${t}</h2><p>${d}</p><a class="tlink" href="#/reserve">Reserve a Table</a></div>${i % 2 ? ph(k, t) : ""}</div></section>`,
    )
    .join("")}`;
P.contact =
  () => `<div class="wrap page-h"><h1>Contact</h1></div><section class="s"><div class="wrap two top"><div class="stack"><h3>Visit</h3><p>${INFO.addr}</p><h3>Hours</h3><p>${INFO.hours}</p><h3>Reach us</h3><p><a href="tel:${INFO.tel.replace(/\s/g, "")}">${INFO.tel}</a><br><a href="mailto:${INFO.mail}">${INFO.mail}</a></p></div>
  <form id="contactForm" novalidate>${fld("cn", "Name", "text")}${fld("ce", "Email", "email")}<div class="f"><label for="cm">Message</label><textarea id="cm" rows="5"></textarea><span class="err"></span></div><button class="btn" type="submit">Send message</button><div id="cOut"></div></form></div></section>`;

function fld(id, label, type, extra = "") {
  return `<div class="f"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${extra}><span class="err" aria-live="polite"></span></div>`;
}
function check(form, rules) {
  let ok = true;
  Object.entries(rules).forEach(([id, fn]) => {
    const el = $("#" + id, form),
      box = el.closest(".f"),
      m = fn(el.value.trim());
    box.classList.toggle("bad", !!m);
    $(".err", box).textContent = m || "";
    if (m) ok = false;
  });
  return ok;
}
const need = (l) => (v) => (v ? "" : l + " is required.");
const emailR = (v) =>
  !v
    ? "Email is required."
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? ""
      : "Enter a valid email.";
const phoneR = (v) =>
  !v
    ? "Phone number is required."
    : /^[+\d][\d\s-]{7,16}$/.test(v)
      ? ""
      : "Enter a valid phone number.";
const pwR = (v) => (v.length >= 8 ? "" : "At least 8 characters.");

const slots = () => {
  const s = [];
  for (let h = 12; h < 23; h++) {
    if (h === 15 || h === 16 || h === 17) continue;
    [0, 30].forEach((m) => {
      if ((h === 14 && m === 30) || h < 14 || h >= 18) {
        if (h === 22 && m === 30) return;
        s.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
      }
    });
  }
  return s;
};
P.reserve = () => {
  const today = new Date().toISOString().slice(0, 10);
  return `<section class="resplit"><aside class="resl">${ph("res", "Candlelit table", "bg")}<div class="stack"><h2>An evening, held for you.</h2><p>Tables are held for fifteen minutes. For parties above ten, please call ${INFO.tel}.</p><p class="small">${INFO.hours}</p></div></aside><div class="resr"><form id="resForm" novalidate>
  ${fld("rn", "Full name", "text", `autocomplete="name" value="${esc(user?.user_metadata?.name || "")}"`)}
  <div class="g2">${fld("re", "Email", "email", `autocomplete="email" value="${esc(user?.email || "")}"`)}${fld("rp", "Phone", "tel", 'autocomplete="tel"')}</div>
  <div class="g2">${fld("rd", "Date", "date", `min="${today}"`)}<div class="f"><label for="rt">Time</label><select id="rt"><option value="">Select a time</option>${slots()
    .map((t) => `<option>${t}</option>`)
    .join("")}</select><span class="err"></span></div></div>
  <div class="f"><label for="rg">Guests</label><select id="rg">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}" ${n === 2 ? "selected" : ""}>${n} ${n > 1 ? "guests" : "guest"}</option>`).join("")}</select><span class="err"></span></div>
  <div class="f"><label for="rs">Special requests</label><textarea id="rs" rows="3" placeholder="Allergies, celebrations, seating preferences"></textarea></div>
  <button class="btn" type="submit">Confirm Reservation</button></form></div></section>`;
};
P.login = () =>
  `<div class="auth"><h1>Welcome back</h1><p class="muted">Sign in to manage your reservations.</p>${loginNote ? `<p class="note" role="status" style="margin-top:20px">${esc(loginNote)}</p>` : ""}<form id="loginForm" novalidate>${fld("le", "Email", "email", 'autocomplete="email"')}${fld("lp", "Password", "password", 'autocomplete="current-password"')}<button class="btn" type="submit">Sign in</button><div id="aOut"></div></form>${demoBlock()}<p class="small" style="margin-top:24px">New to PASSO? <a class="tlink" href="#/register">Create an account</a></p></div>`;
P.register = () =>
  `<div class="auth"><h1>Create account</h1><p class="muted">Save your details and view your reservation history.</p><form id="regForm" novalidate>${fld("gn", "Full name", "text", 'autocomplete="name"')}${fld("ge", "Email", "email", 'autocomplete="email"')}${fld("gp", "Password", "password", 'autocomplete="new-password"')}${fld("gc", "Confirm password", "password", 'autocomplete="new-password"')}<button class="btn" type="submit">Create account</button><div id="aOut"></div></form><p class="small" style="margin-top:24px">Already a guest? <a class="tlink" href="#/login">Sign in</a></p></div>`;
P.account = () =>
  `<div class="wrap dash"><nav aria-label="Account">${[
    ["overview", "Overview"],
    ["upcoming", "My Reservations"],
    ["history", "Reservation History"],
    ["profile", "My Profile"],
  ]
    .map(
      ([k, l], i) =>
        `<button data-tab="${k}" class="${i ? "" : "on"}">${l}</button>`,
    )
    .join(
      "",
    )}<button id="logout">Logout</button></nav><div id="dtab"><p class="muted">Loading…</p></div></div>`;

const isUp = (r) =>
  r.status !== "cancelled" && new Date(r.date + "T23:59") >= new Date();
const resRow = (r, can) =>
  `<div class="res"><div><h3>${new Date(r.date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${r.time}</h3><p class="small muted">${r.guests} ${r.guests > 1 ? "guests" : "guest"} · ${esc(r.code)}${r.notes ? " · " + esc(r.notes) : ""}</p></div><div>${can ? `<button class="btn line sm" data-cancel="${esc(r.code)}">Cancel</button>` : `<span class="tag">${r.status}</span>`}</div></div>`;
async function dashTab(k) {
  const el = $("#dtab");
  if (!el) return;
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("on", b.dataset.tab === k));
  const all = await listRes(),
    up = all.filter(isUp),
    past = all.filter((r) => !isUp(r));
  const name = user.user_metadata?.name || user.email;
  if (k === "overview")
    el.innerHTML = `<h1 style="font-size:3.4rem">Good evening, ${esc(name.split(" ")[0])}.</h1><div class="stats"><div><b>${up.length}</b><span class="small muted">Upcoming</span></div><div><b>${past.length}</b><span class="small muted">Past visits</span></div></div>${up[0] ? `<h3 style="margin-bottom:8px">Next reservation</h3>${resRow(up[0], true)}` : `<div class="empty"><p class="muted">No upcoming reservations.</p><a class="btn" href="#/reserve" style="margin-top:20px">Reserve a Table</a></div>`}`;
  if (k === "upcoming")
    el.innerHTML = `<h2>My Reservations</h2><div style="margin-top:32px">${up.map((r) => resRow(r, true)).join("") || `<div class="empty"><p class="muted">Nothing booked yet.</p></div>`}</div>`;
  if (k === "history")
    el.innerHTML = `<h2>Reservation History</h2><div style="margin-top:32px">${past.map((r) => resRow(r, false)).join("") || `<div class="empty"><p class="muted">Your past visits will appear here.</p></div>`}</div>`;
  if (k === "profile")
    el.innerHTML = `<h2>My Profile</h2><form id="profForm" style="margin-top:32px;max-width:440px" novalidate>${fld("pn", "Full name", "text", `value="${esc(user.user_metadata?.name || "")}"`)}${fld("pe", "Email", "email", `value="${esc(user.email)}" disabled`)}<button class="btn" type="submit">Save changes</button><div id="pOut"></div></form>`;
}

/* ---------- modal ---------- */
const modal = (html) => {
  const d = $("#modal");
  d.innerHTML = `<div class="in"><button class="x" aria-label="Close" data-close>×</button>${html}</div>`;
  if (!d.open) d.showModal();
};
const dishModal = (n) => {
  const m = MENU.find((x) => x.n === n);
  if (!m) return;
  modal(
    `<div class="dm">${ph(m.n, m.n)}<div class="stack"><h2>${esc(m.n)}</h2><p class="muted small">${m.c}${m.v ? " · Vegetarian" : ""}${m.sig ? " · Signature" : ""}</p><p>${esc(m.d)}</p><p class="small"><b>Ingredients:</b> ${esc(m.i)}</p><h3>${idr(m.p)}</h3><a class="btn" href="#/reserve" data-close>Reserve a Table</a></div></div>`,
  );
};

/* ---------- router ---------- */
const AUTHED = [
  "account",
  "reserve",
]; /* pages that need a signed-in user; Statistics is public */
let pendingHash = "",
  loginNote = ""; /* where to go after signing in */
async function route() {
  let r = (location.hash.replace("#/", "") || "home").split("?")[0];
  if (!P[r]) r = "home";
  if (AUTHED.includes(r) && !user) {
    pendingHash = "#/" + r;
    loginNote =
      r === "reserve"
        ? "Please sign in to reserve a table."
        : "Please sign in to continue.";
    r = "login";
  } else if (r !== "login" && r !== "register") {
    pendingHash = "";
    loginNote = "";
  }
  if ((r === "login" || r === "register") && user) r = "account";
  renderNav(r === "account" ? "" : r);
  document.body.classList.toggle("on-hero", r === "home");
  const v = $("#view");
  v.innerHTML = `<div class="fade">${P[r]()}</div>`;
  window.scrollTo(0, 0);
  document.title =
    "passo — " +
    (r === "home" ? "Fine Dining" : r[0].toUpperCase() + r.slice(1));
  bind(r);
}
/* ---------- Reviews (display + n8n submit) ---------- */
const fmt = (n) => n.toLocaleString("id-ID");
const pct = (a, b) => Math.round((a / b) * 1000) / 10;
const STAR =
  "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";
const stars = (n, sz = 16) =>
  `<span class="stars" role="img" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="${i <= n ? "f" : ""}" viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true"><path d="${STAR}"/></svg>`).join("")}</span>`;
const SEED = PASSO_DATA.reviews;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const localRev = () => lget("passo_reviews", []);
let dbReviews = [];
const userRev = () => (sb ? dbReviews : localRev());
async function fetchReviews() {
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("reviews")
      .select("name,rating,comment,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data)
      dbReviews = data.map((x) => ({
        n: x.name,
        r: x.rating,
        t: x.comment,
        d: fmtDate(x.created_at),
      }));
  } catch {}
}
function paintReviews() {
  const g = $("#rgrid");
  if (!g) return;
  const all = [...userRev(), ...SEED];
  g.innerHTML = revCards(all);
  $("#avg").textContent = revAvg(all);
  $("#cnt").textContent = all.length + " guest reviews";
}
async function saveReview(p) {
  if (sb) {
    const { error } = await sb.from("reviews").insert({
      name: p.name,
      rating: p.rating,
      comment: p.comment,
      user_id: user ? user.id : null,
    });
    if (error) {
      console.error("PASSO review:", error);
      return {
        ok: false,
        reason: /failed to fetch|network|load failed/i.test(error.message || "")
          ? "network"
          : "http",
      };
    }
    /* also notify n8n; never blocks or fails the review (already saved in Supabase) */
    sendReview(p).then((r) => {
      if (!r.ok) console.warn("PASSO n8n webhook:", r);
    });
    await fetchReviews();
    return { ok: true };
  }
  if (!AUTH_LOCAL) return { ok: false, reason: "network" };
  lset(
    "passo_reviews",
    [
      { n: p.name, r: p.rating, t: p.comment, d: fmtDate(new Date()) },
      ...localRev(),
    ].slice(0, 20),
  );
  return { ok: true };
}
const revCards = (all) =>
  all
    .slice(0, 6)
    .map(
      (r) =>
        `<article class="rcard">${stars(r.r)}<p>“${esc(r.t)}”</p><div class="who"><b>${esc(r.n)}</b><time>${esc(r.d)}</time></div></article>`,
    )
    .join("");
const revAvg = (all) =>
  (all.reduce((a, r) => a + r.r, 0) / all.length).toFixed(1);
function reviewsSection() {
  const all = [...userRev(), ...SEED];
  return `<section class="s" id="reviews"><div class="wrap"><div class="rv-head"><h2>What Our Guests Say</h2><div class="avg"><b id="avg">${revAvg(all)}</b><div>${stars(5, 18)}<p class="small muted" id="cnt">${all.length} guest reviews</p></div></div></div>
  <div class="rgrid" id="rgrid">${revCards(all)}</div>
  <div class="rform"><div class="stack"><h3>Share your experience</h3><p class="muted">Dined with us recently? Tell us about the food, the room and the service. Your words help us refine every evening.</p></div>
  <form id="revForm" novalidate>${fld("vn", "Your name", "text", 'autocomplete="name"')}
  <div class="f"><label id="vrl">Rating</label><div class="sin" role="radiogroup" aria-labelledby="vrl">${[1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" aria-checked="false" aria-label="${i} star${i > 1 ? "s" : ""}"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="${STAR}"/></svg></button>`).join("")}</div><input type="hidden" id="vr"><span class="err" aria-live="polite"></span></div>
  <div class="f"><label for="vc">Your experience</label><textarea id="vc" rows="4"></textarea><span class="err" aria-live="polite"></span></div>
  <button class="btn" type="submit">Submit Review</button><div id="rOut"></div></form></div></div></section>`;
}
/* n8n: POST JSON { name, rating, comment, timestamp } to PASSO_CONFIG.N8N_WEBHOOK_URL. Never called while the URL is a placeholder. */
const hookReady = (u) =>
  /^https?:\/\//.test(u || "") && !/YOUR_N8N_WEBHOOK_URL/.test(u);
async function sendReview(payload) {
  /* config.js wins if it holds a real URL; otherwise use the constant at the top of this file */
  const url = hookReady(PASSO_CONFIG.N8N_WEBHOOK_URL)
    ? PASSO_CONFIG.N8N_WEBHOOK_URL
    : N8N_WEBHOOK_URL;
  if (!hookReady(url)) {
    console.warn("PASSO: N8N_WEBHOOK_URL is not set.");
    return { ok: false, reason: "config" };
  }
  const ctl = new AbortController(),
    t = setTimeout(() => ctl.abort(), PASSO_CONFIG.WEBHOOK_TIMEOUT_MS || 10000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    return r.ok
      ? { ok: true }
      : { ok: false, reason: "http", status: r.status };
  } catch (e) {
    return {
      ok: false,
      reason: e.name === "AbortError" ? "timeout" : "network",
    };
  } finally {
    clearTimeout(t);
  }
}
const REV_ERR = {
  config: "Review submission is not available yet. Please try again later.",
  http: "We could not save your review. Please try again in a moment.",
  timeout: "The request took too long. Please try again.",
  network:
    "We could not reach the server. Please check your connection and try again.",
};
function reviewsInit() {
  const f = $("#revForm");
  if (!f) return;
  const btns = [...f.querySelectorAll(".sin button")],
    val = $("#vr"),
    out = $("#rOut"),
    submit = $("button[type=submit]", f),
    paint = (n) => btns.forEach((b, i) => b.classList.toggle("on", i < n));
  btns.forEach((b, i) => {
    b.onclick = () => {
      val.value = i + 1;
      paint(i + 1);
      btns.forEach((x, j) => x.setAttribute("aria-checked", j === i));
      const box = b.closest(".f");
      box.classList.remove("bad");
      $(".err", box).textContent = "";
    };
    b.onmouseenter = () => paint(i + 1);
  });
  $(".sin", f).onmouseleave = () => paint(+val.value || 0);
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (f.dataset.busy) return;
    out.innerHTML = "";
    if (
      !check(f, {
        vn: (v) => (v.length < 2 ? "Please enter your name." : ""),
        vr: (v) => (v ? "" : "Please choose a rating."),
        vc: (v) =>
          !v
            ? "Please share your experience."
            : v.length < 10
              ? "Please write at least 10 characters."
              : "",
      })
    )
      return;
    const name = $("#vn").value.trim(),
      rating = +val.value,
      comment = $("#vc").value.trim();
    f.dataset.busy = "1";
    submit.disabled = true;
    submit.textContent = "Sending…";
    f.setAttribute("aria-busy", "true");
    const res = await saveReview({
      name,
      rating,
      comment,
      timestamp: new Date().toISOString(),
    });
    delete f.dataset.busy;
    submit.disabled = false;
    submit.textContent = "Submit Review";
    f.removeAttribute("aria-busy");
    if (!res.ok) {
      out.innerHTML = `<p class="note bad" role="alert">${REV_ERR[res.reason]}</p>`;
      return;
    }
    paintReviews();
    f.reset();
    paint(0);
    val.value = "";
    btns.forEach((x) => x.setAttribute("aria-checked", "false"));
    out.innerHTML = `<p class="note" role="status">Thank you, ${esc(name.split(" ")[0])}. Your review has been received.</p>`;
  };
}

/* ---------- Manager dashboard (dummy data from js/dummy_data.js) ---------- */
const sum = (a) => a.reduce((x, y) => x + y, 0);
const ns = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 4, 5, 10].map((x) => x * p).find((x) => x >= v - 1e-9);
};
function ratingStats() {
  const c = { ...PASSO_DATA.baseRatings };
  userRev().forEach((r) => (c[r.r] = (c[r.r] || 0) + 1));
  const tot = sum(Object.values(c));
  return { c, tot, avg: sum(Object.entries(c).map(([k, v]) => k * v)) / tot };
}
function dashModel(n) {
  const D = PASSO_DATA,
    L = D.months.length,
    comp = D.reservations.map((t, i) => t - D.cancelled[i] - D.noShow[i]);
  const ret = comp.map((c, i) => Math.round((c * D.returningPct[i]) / 100)),
    nw = comp.map((c, i) => c - ret[i]);
  const win = (a, k = 0) => a.slice(L - n - k * n, L - k * n);
  const agg = (k) => {
    if (L - n - k * n < 0) return null;
    const t = sum(win(D.reservations, k)),
      cp = sum(win(comp, k));
    return {
      t,
      canc: (sum(win(D.cancelled, k)) / t) * 100,
      succ: (cp / t) * 100,
      retp: (sum(win(ret, k)) / cp) * 100,
    };
  };
  return { D, comp, ret, nw, win, cur: agg(0), prev: agg(1) };
}
function chartGrid(max, step, W, pl, pr, pt, ih) {
  let g = "";
  for (let k = 0; k <= 4; k++) {
    const y = pt + ih - (k * step * ih) / max;
    g += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${k * step}</text>`;
  }
  return g;
}
function stackBars(labels, layers, aria) {
  const W = 560,
    H = 270,
    pl = 38,
    pr = 6,
    pt = 10,
    pb = 26,
    ih = H - pt - pb,
    tot = labels.map((_, i) => sum(layers.map((l) => l.v[i])));
  const step = ns(Math.max(...tot) / 4),
    max = step * 4,
    bw = (W - pl - pr) / labels.length,
    w = Math.min(34, bw * 0.58);
  let g = chartGrid(max, step, W, pl, pr, pt, ih);
  labels.forEach((lb, i) => {
    const x = pl + bw * i + (bw - w) / 2;
    let y = pt + ih;
    layers.forEach((l) => {
      const h = (l.v[i] * ih) / max;
      y -= h;
      g += `<rect class="dbar" style="--i:${i}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${l.c}" data-tip="${lb} · ${l.n}: ${l.v[i]}"/>`;
    });
    g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${lb}</text>`;
  });
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${g}</svg>`;
}
function lineChart(labels, series, aria) {
  const W = 560,
    H = 250,
    pl = 38,
    pr = 14,
    pt = 10,
    pb = 26,
    ih = H - pt - pb,
    step = ns(Math.max(...series.flatMap((s) => s.v)) / 4),
    max = step * 4,
    n = labels.length;
  const X = (i) => pl + ((W - pl - pr) * (i + 0.5)) / n,
    Y = (v) => pt + ih - (v * ih) / max;
  let g = chartGrid(max, step, W, pl, pr, pt, ih);
  labels.forEach(
    (lb, i) =>
      (g += `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${lb}</text>`),
  );
  series.forEach((s) => {
    g += `<path class="ln" pathLength="1" d="${s.v.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ")}" stroke="${s.c}" fill="none"/>`;
    s.v.forEach(
      (v, i) =>
        (g += `<circle class="dot" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" stroke="${s.c}" data-tip="${labels[i]} · ${s.n}: ${v}"/>`),
    );
  });
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="${aria}">${g}</svg>`;
}
function hBars(items, aria, color = "var(--choc)") {
  const W = 520,
    lw = 168,
    rh = 40,
    max = Math.max(...items.map((i) => i.v)),
    tw = W - lw - 56;
  const g = items
    .map((it, i) => {
      const y = i * rh;
      return `<text x="0" y="${y + 24}">${it.l}</text><rect class="hbar" style="--i:${i}" x="${lw}" y="${y + 14}" width="${((it.v / max) * tw).toFixed(1)}" height="12" fill="${color}" data-tip="${it.tip}"/><text x="${lw + (it.v / max) * tw + 10}" y="${y + 25}" class="v">${it.v}</text>`;
    })
    .join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${items.length * rh}" role="img" aria-label="${aria}">${g}</svg>`;
}
function dashBody(n) {
  const m = dashModel(n),
    { D, cur, prev } = m,
    rs = ratingStats(),
    pop = D.popularMenu
      .slice(0, 6)
      .map((p) => ({ ...p, o: Math.round((p.orders * n) / 12) }));
  const dl = (a, b, kind, goodUp) => {
    if (!prev) return `<span class="d">Last ${n} months</span>`;
    const diff = kind === "pct" ? ((a - b) / b) * 100 : a - b,
      good = goodUp ? diff >= 0 : diff <= 0;
    return `<span class="d ${good ? "up" : "down"}">${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}${kind === "pct" ? "%" : " pts"} vs previous ${n} months</span>`;
  };
  const kpi = (l, v, d, cls = "") =>
    `<div class="kpi"><span class="l">${l}</span><b class="${cls}">${v}</b>${d}</div>`;
  const kpis = [
    kpi("Total Reservations", fmt(cur.t), dl(cur.t, prev?.t, "pct", true)),
    kpi(
      "Returning Customers",
      cur.retp.toFixed(1) + "%",
      dl(cur.retp, prev?.retp, "pts", true),
    ),
    kpi(
      "Reservation Success Rate",
      cur.succ.toFixed(1) + "%",
      dl(cur.succ, prev?.succ, "pts", true),
    ),
    kpi(
      "Cancellation Rate",
      cur.canc.toFixed(1) + "%",
      dl(cur.canc, prev?.canc, "pts", false),
    ),
    kpi(
      "Popular Menu",
      esc(pop[0].name),
      `<span class="d">${fmt(pop[0].o)} orders</span>`,
      "txt",
    ),
    kpi(
      "Customer Satisfaction",
      rs.avg.toFixed(1) + "<small> / 5</small>",
      `<span class="d">${fmt(rs.tot)} guest reviews</span>`,
    ),
  ].join("");
  const L = (c, t) => `<span style="--c:${c}"><i></i>${t}</span>`;
  const latest = [...userRev(), ...SEED]
    .sort((a, b) => new Date(b.d) - new Date(a.d))
    .slice(0, 3)
    .map(
      (r) =>
        `<article class="fb">${stars(r.r)}<p>“${esc(r.t)}”</p><span class="small muted">${esc(r.n)} · ${esc(r.d)}</span></article>`,
    )
    .join("");
  return `<div class="kpis">${kpis}</div><div class="dgrid">
  <section class="dp"><h3>Reservation progress</h3><p class="sub">Monthly reservations by outcome</p><div class="legend">${L("var(--choc)", "Completed")}${L("var(--taupe)", "No-show")}${L("var(--beige)", "Cancelled")}</div>${stackBars(
    m.win(D.months),
    [
      { n: "Completed", c: "#3B2921", v: m.win(m.comp) },
      { n: "No-show", c: "#A18B78", v: m.win(D.noShow) },
      { n: "Cancelled", c: "#E5D8C8", v: m.win(D.cancelled) },
    ],
    "Monthly reservations by outcome",
  )}</section>
  <section class="dp"><h3>Customer satisfaction</h3><p class="sub">Rating distribution, ${fmt(rs.tot)} reviews</p>${hBars(
    [5, 4, 3, 2, 1].map((k) => ({
      l: k + (k > 1 ? " stars" : " star"),
      v: rs.c[k] || 0,
      tip: `${k} stars: ${rs.c[k] || 0} reviews`,
    })),
    "Rating distribution",
    "var(--esp)",
  )}</section>
  <section class="dp"><h3>Customer growth</h3><p class="sub">New and returning guests per month</p><div class="legend">${L("var(--choc)", "Returning")}${L("var(--taupe)", "New")}</div>${lineChart(
    m.win(D.months),
    [
      { n: "Returning", c: "#3B2921", v: m.win(m.ret) },
      { n: "New", c: "#A18B78", v: m.win(m.nw) },
    ],
    "New and returning guests per month",
  )}</section>
  <section class="dp"><h3>Popular menu</h3><p class="sub">Most ordered dishes, last ${n} months</p>${hBars(
    pop.map((p) => ({ l: p.name, v: p.o, tip: `${p.name}: ${p.o} orders` })),
    "Most ordered dishes",
  )}</section></div>
  <section class="dp" style="margin-top:72px"><h3>Latest guest feedback</h3><p class="sub">Most recent reviews from the website</p><div class="fbs">${latest}</div></section>`;
}
P.dashboard = () => {
  const denied =
    PASSO_CONFIG.DASHBOARD_REQUIRE_MANAGER &&
    user?.app_metadata?.role !== "manager";
  if (denied)
    return `<div class="auth"><h1>Restricted</h1><p class="muted">The restaurant dashboard is available to PASSO managers only.</p></div>`;
  return `<div class="wrap db"><div class="db-head"><div><h1>Restaurant dashboard</h1><p class="muted">Reservations, guests and satisfaction at a glance.</p></div><div class="seg" id="dbRange" role="group" aria-label="Period">${[
    [3, "3 months"],
    [6, "6 months"],
    [12, "12 months"],
  ]
    .map(
      ([n, l]) =>
        `<button type="button" data-n="${n}" class="${n === 6 ? "on" : ""}" aria-pressed="${n === 6}">${l}</button>`,
    )
    .join(
      "",
    )}</div></div><div id="dbBody">${dashBody(6)}</div><p class="small muted" style="margin-top:56px">${PASSO_DATA.note}</p></div>`;
};
function dashInit() {
  const body = $("#dbBody");
  if (!body) return;
  let tip = $("#tip");
  if (!tip) {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="tip" id="tip" role="tooltip"></div>',
    );
    tip = $("#tip");
  }
  $("#dbRange").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    document.querySelectorAll("#dbRange button").forEach((x) => {
      x.classList.toggle("on", x === b);
      x.setAttribute("aria-pressed", x === b);
    });
    body.innerHTML = dashBody(+b.dataset.n);
  };
  body.onmousemove = (e) => {
    const t = e.target.closest("[data-tip]");
    if (!t) {
      tip.style.opacity = 0;
      return;
    }
    tip.textContent = t.dataset.tip;
    tip.style.left = Math.min(e.clientX + 14, innerWidth - 200) + "px";
    tip.style.top = e.clientY + 16 + "px";
    tip.style.opacity = 1;
  };
  body.onmouseleave = () => (tip.style.opacity = 0);
}
function menuPrev(n) {
  const box = $("#mPrev");
  if (!box) return;
  const m =
    MENU.find((x) => x.n === n) ||
    MENU.find(
      (x) =>
        x.n === document.querySelector("#menuGrid [data-dish]")?.dataset.dish,
    );
  if (!m || box.dataset.cur === m.n) return;
  box.dataset.cur = m.n;
  box.innerHTML = `<div class="pv">${ph(m.n, m.n)}<div class="stack"><p class="small muted">${m.c}${m.sig ? " · Signature" : ""}${m.chef ? " · Chef’s recommendation" : ""}${m.v ? " · Vegetarian" : ""}</p><h3>${esc(m.n)}</h3><p class="small muted">${esc(m.i)}</p><p class="price">${idr(m.p)}</p></div></div>`;
}
/* ---------- scroll motion: one shared, smoothed loop (reveals + parallax + progress) ---------- */
const mo = {
  raf: 0,
  until: 0,
  img: [],
  par: [],
  hero: null,
  hc: null,
  hb: null,
};
const lerp = (o, k, v, f = 0.1) => (o[k] = (o[k] ?? v) + (v - (o[k] ?? v)) * f);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function tick(now) {
  const vh = innerHeight,
    y = scrollY;
  document.documentElement.style.setProperty(
    "--p",
    (y / Math.max(1, document.documentElement.scrollHeight - vh)).toFixed(4),
  );
  mo.img.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.88 && r.bottom > 0) el.classList.add("in");
    if (r.bottom < -200 || r.top > vh + 200) return;
    const lim = r.height * 0.08;
    el.style.setProperty(
      "--py",
      lerp(
        el,
        "_v",
        clamp(-(r.top + r.height / 2 - vh / 2) * 0.1, -lim, lim),
      ).toFixed(1) + "px",
    );
  });
  mo.par.forEach(([el, host, sp]) => {
    const r = host.getBoundingClientRect();
    el.style.translate =
      "0 " +
      lerp(el, "_t", (r.top + r.height / 2 - vh / 2) * sp).toFixed(1) +
      "px";
  });
  if (mo.hero) {
    mo.hero.style.setProperty(
      "--hy",
      lerp(mo, "_hy", Math.min(y, vh * 1.2) * 0.35).toFixed(1) + "px",
    );
    const o = clamp(1 - y / (vh * 0.55), 0, 1);
    mo.hc.style.opacity = o;
    mo.hc.style.translate = "0 " + lerp(mo, "_hc", y * 0.22).toFixed(1) + "px";
    if (mo.hb) mo.hb.style.opacity = o;
  }
  mo.raf = now < mo.until ? requestAnimationFrame(tick) : 0;
}
function kick() {
  mo.until = performance.now() + 1200;
  if (!mo.raf && window.requestAnimationFrame)
    mo.raf = requestAnimationFrame(tick);
}
document.body.insertAdjacentHTML(
  "beforeend",
  '<div class="prog" aria-hidden="true"></div>',
);
addEventListener("scroll", kick, { passive: true });
addEventListener("resize", kick);
function motion() {
  const V = $("#view"),
    reduce = !!(
      window.matchMedia &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  mo.img = [...V.querySelectorAll(".ph")].filter(
    (e) => !e.classList.contains("bg") && !e.closest(".mwrap"),
  );
  const txt = [
    ...V.querySelectorAll(
      ".intro > *,.quote > *,.rows > div,.two .stack,.two > h2,.dish article > :not(.ph),.page-h > *,.cta > *,.chef .ct,.fn-head > *,.rv-head > *,.rcard,.rform > *",
    ),
  ].filter((e) => !e.classList.contains("ph"));
  mo.par = reduce
    ? []
    : [...V.querySelectorAll(".dish article")]
        .map((el, i) => [el, el.parentElement, [0.05, -0.04, 0.07][i % 3]])
        .concat(
          [...V.querySelectorAll(".intro .stack")].map((el) => [
            el,
            el.parentElement,
            -0.04,
          ]),
        );
  mo.hero = reduce ? null : V.querySelector(".hero2 .bg");
  mo.hc = V.querySelector(".hc");
  mo.hb = V.querySelector(".hb");
  const all = [...mo.img.map((e) => [e, "imgr"]), ...txt.map((e) => [e, "rv"])];
  all.forEach(([e, c]) => {
    e.classList.add(c);
    e.style.transitionDelay =
      ([...e.parentNode.children].indexOf(e) % 4) * 120 + "ms";
  });
  if (reduce || !("IntersectionObserver" in window))
    all.forEach(([e]) => e.classList.add("in"));
  else {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    all.filter(([, c]) => c === "rv").forEach(([e]) => io.observe(e));
  }
  kick();
}
function bind(r) {
  motion();
  if (r === "dashboard") dashInit();
  reviewsInit();
  if (r === "menu") {
    const g0 = () =>
      ($("#menuGrid").innerHTML = menuItems(
        document.querySelector(".tabs .on").dataset.cat,
      ));
    const g = () => {
      g0();
      menuPrev();
    };
    ["mouseover", "focusin"].forEach((ev) =>
      $("#menuGrid").addEventListener(ev, (e) => {
        const a = e.target.closest("[data-dish]");
        if (a) menuPrev(a.dataset.dish);
      }),
    );
    g();
    document.querySelectorAll("[data-cat]").forEach(
      (b) =>
        (b.onclick = () => {
          document
            .querySelectorAll("[data-cat]")
            .forEach((x) => x.classList.toggle("on", x === b));
          g();
        }),
    );
  }
  if (r === "account") {
    dashTab("overview");
  }
  const f = (id) => $("#" + id);
  if (f("contactForm"))
    f("contactForm").onsubmit = (e) => {
      e.preventDefault();
      if (
        check(e.target, { cn: need("Name"), ce: emailR, cm: need("Message") })
      ) {
        e.target.reset();
        $("#cOut").innerHTML =
          `<p class="note">Thank you. We will reply within one business day.</p>`;
      }
    };
  if (f("resForm"))
    f("resForm").onsubmit = async (e) => {
      e.preventDefault();
      const t = e.target;
      if (
        !check(t, {
          rn: need("Name"),
          re: emailR,
          rp: phoneR,
          rd: (v) =>
            !v
              ? "Choose a date."
              : new Date(v + "T23:59") < new Date()
                ? "Date is in the past."
                : new Date(v + "T12:00").getDay() === 1
                  ? "We are closed on Mondays."
                  : "",
          rt: need("Time"),
          rg: need("Guests"),
        })
      )
        return;
      const btn = $("button", t);
      btn.disabled = true;
      btn.textContent = "Confirming…";
      const r = await saveRes({
        name: f("rn").value.trim(),
        email: f("re").value.trim(),
        phone: f("rp").value.trim(),
        date: f("rd").value,
        time: f("rt").value,
        guests: +f("rg").value,
        notes: f("rs").value.trim(),
      });
      if (r.error) {
        let box = $("#resOut");
        if (!box) {
          box = document.createElement("div");
          box.id = "resOut";
          btn.after(box);
        }
        box.innerHTML = `<p class="note bad" role="alert">${esc(r.error)}</p>`;
        btn.disabled = false;
        btn.textContent = "Confirm Reservation";
        return;
      }
      if ($("#resOut")) $("#resOut").innerHTML = "";
      modal(
        `<div class="stack"><h2>Reservation confirmed</h2><p>Thank you, ${esc(r.name.split(" ")[0])}. We look forward to welcoming you.</p><p class="small"><b>${new Date(r.date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${r.time}</b><br>${r.guests} guests · Reference ${r.code}</p>${user ? `<a class="btn" href="#/account" data-close>View my reservations</a>` : `<p class="small muted">Create an account to manage this booking.</p><a class="btn" href="#/register" data-close>Create account</a>`}</div>`,
      );
      t.reset();
      btn.disabled = false;
      btn.textContent = "Confirm Reservation";
    };
  if (f("loginForm"))
    f("loginForm").onsubmit = async (e) => {
      e.preventDefault();
      if (!check(e.target, { le: emailR, lp: need("Password") })) return;
      const out = $("#aOut");
      if (!authApi)
        return (out.innerHTML = `<p class="note bad">Authentication service unavailable.</p>`);
      const { error } = await authApi.signInWithPassword({
        email: f("le").value.trim(),
        password: f("lp").value,
      });
      if (error)
        out.innerHTML = `<p class="note bad">${esc(authMsg(error))}</p>`;
    };
  if (f("demoLogin"))
    f("demoLogin").onclick = async () => {
      await localAuth.signUp({
        email: DEMO.email,
        password: DEMO.password,
        options: { data: { name: DEMO.name } },
      });
      const { error } = await localAuth.signInWithPassword({
        email: DEMO.email,
        password: DEMO.password,
      });
      if (error)
        $("#aOut").innerHTML = `<p class="note bad">${esc(error.message)}</p>`;
    };
  if (f("regForm"))
    f("regForm").onsubmit = async (e) => {
      e.preventDefault();
      if (
        !check(e.target, {
          gn: need("Name"),
          ge: emailR,
          gp: pwR,
          gc: (v) => (v === f("gp").value ? "" : "Passwords do not match."),
        })
      )
        return;
      const out = $("#aOut");
      if (!authApi)
        return (out.innerHTML = `<p class="note bad">Authentication service unavailable.</p>`);
      const { data, error } = await authApi.signUp({
        email: f("ge").value.trim(),
        password: f("gp").value,
        options: { data: { name: f("gn").value.trim() } },
      });
      out.innerHTML = error
        ? `<p class="note bad">${esc(authMsg(error))}</p>`
        : data.session
          ? ""
          : `<p class="note">Account created. Check your email to confirm, then sign in.</p>`;
    };
}
document.addEventListener("click", async (e) => {
  const t = e.target.closest(
    "[data-dish],[data-close],[data-tab],[data-cancel],#logout",
  );
  if (!t) return;
  if (t.dataset.dish) dishModal(t.dataset.dish);
  if (t.hasAttribute("data-close")) {
    const d = $("#modal");
    if (d.open) d.close();
  }
  if (t.dataset.tab) dashTab(t.dataset.tab);
  if (t.dataset.cancel && confirm("Cancel this reservation?")) {
    await cancelRes(t.dataset.cancel);
    dashTab("upcoming");
  }
  if (t.id === "logout") {
    if (authApi) await authApi.signOut();
    user = null;
    location.hash = "#/home";
    route();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("article[data-dish]"))
    dishModal(e.target.dataset.dish);
});
document.addEventListener("submit", async (e) => {
  if (e.target.id === "profForm") {
    e.preventDefault();
    const n = $("#pn").value.trim();
    if (!check(e.target, { pn: need("Name") })) return;
    const { error } = authApi
      ? await authApi.updateUser({ data: { name: n } })
      : { error: { message: "Unavailable" } };
    $("#pOut").innerHTML = error
      ? `<p class="note bad">${esc(authMsg(error))}</p>`
      : `<p class="note">Profile updated.</p>`;
  }
});
$("#modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") e.target.close();
});
window.addEventListener("hashchange", route);
addEventListener(
  "scroll",
  () => document.body.classList.toggle("scrolled", scrollY > 60),
  { passive: true },
);

/* ---------- Ask PASSO — dining assistant ---------- */
const SUGG = [
  "What is your most popular dish?",
  "What are the ingredients of the Beef Tartare?",
  "How can I make a reservation?",
  "Can you recommend something for two?",
  "Do you have vegetarian options?",
];
const list = (a) => a.map((m) => `${m.n} (${idr(m.p)})`).join("\n");
function hermesLocal(q) {
  const s = q.toLowerCase(),
    SKIP = [
      "glass",
      "course",
      "short",
      "brown",
      "butter",
      "black",
      "passo",
      "aged",
      "rack",
      "pairing",
      "sparkling",
    ],
    dish =
      MENU.find((m) => s.includes(m.n.toLowerCase())) ||
      MENU.find((m) =>
        m.n
          .toLowerCase()
          .split(/[\s,]+/)
          .some((w) => w.length >= 4 && !SKIP.includes(w) && s.includes(w)),
      );
  if (dish)
    return `${dish.n}: ${dish.d}\nIngredients: ${dish.i}.\n${idr(dish.p)}${dish.v ? " · Vegetarian" : ""}`;
  const bud = s.match(/(\d[\d.,]*)\s*(k|rb|ribu|juta|jt)?/);
  if (/budget|under|below|cheap|afford|rp|idr/.test(s) && bud) {
    let n = parseFloat(bud[1].replace(/[.,]/g, ""));
    const u = bud[2];
    if (u === "k" || u === "rb" || u === "ribu") n *= 1000;
    if (u === "juta" || u === "jt") n *= 1e6;
    if (n < 1000) n *= 1000;
    const f = MENU.filter((m) => m.p <= n);
    return f.length
      ? `Within ${idr(n)} per dish:\n${list(f)}`
      : "Our lowest-priced dish is " +
          idr(Math.min(...MENU.map((m) => m.p))) +
          ".";
  }
  if (
    /popular|favou?rite|best.?sell|most (ordered|loved)|top (dish|menu)/.test(s)
  )
    return (
      "Our most ordered dishes:\n" +
      list(MENU.filter((m) => m.pop)) +
      "\nThe Wagyu Short Rib is our signature."
    );
  if (/ingredient|made (of|with)|contain|allerg|gluten|nut|dairy/.test(s))
    return "Tell me the dish and I will list its ingredients, for example “Beef Tartare” or “Dry-Aged Ribeye”. For allergies, please note them in your reservation so the kitchen can prepare.";
  if (/signature|best|famous/.test(s))
    return (
      "Our signature is the Wagyu Short Rib — a twelve-hour braise with bone marrow jus. " +
      idr(485000)
    );
  if (/two|couple|date|anniversar|share/.test(s))
    return "For two, I would suggest:\nHamachi Crudo to share, the Wagyu Short Rib and the Miso Black Cod, and a Chocolate Soufflé with two spoons.";
  if (/dessert|sweet/.test(s))
    return "Desserts:\n" + list(MENU.filter((m) => m.c === "Dessert"));
  if (/vegetarian|vegan|plant/.test(s))
    return (
      "Vegetarian dishes:\n" +
      list(MENU.filter((m) => m.v && m.c !== "Beverages")) +
      "\nFor vegan or allergy needs, note them in your reservation."
    );
  if (/drink|beverage|wine|cocktail|tea/.test(s))
    return "Beverages:\n" + list(MENU.filter((m) => m.c === "Beverages"));
  if (/starter|appetizer/.test(s))
    return "Appetizers:\n" + list(MENU.filter((m) => m.c === "Appetizer"));
  if (/main|entree|dinner/.test(s))
    return "Main courses:\n" + list(MENU.filter((m) => m.c === "Main Course"));
  if (/recommend|suggest|chef/.test(s))
    return "The chef’s recommendation is the Dry-Aged Ribeye — forty days on the bone, binchotan-grilled, with béarnaise.";
  if (/reserv|book|table/.test(s))
    return (
      "To reserve: sign in or create an account, then tap Reserve a Table, enter your name, email, phone, date, time and number of guests, then press Confirm Reservation. You will receive a reference code. We are closed on Mondays, tables are held for 15 minutes, and parties above ten should call " +
      INFO.tel +
      "."
    );
  if (/hour|open|close|time/.test(s)) return INFO.hours;
  if (/where|locat|address|park/.test(s)) return INFO.addr;
  if (/dress|code/.test(s)) return "Smart elegant. Jackets are not required.";
  if (/hello|hi\b|hey/.test(s))
    return "Welcome to PASSO. How may I help you today?";
  return "I can help with the menu, ingredients, recommendations, hours, location and reservations. Try one of the suggestions below.";
}
const chatHist = [];
async function hermesAsk(q) {
  let reply = "";
  if (HERMES_ENDPOINT) {
    try {
      const r = await fetch(HERMES_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...HERMES_HEADERS },
        body: JSON.stringify({
          message: q,
          history: chatHist.slice(-10),
          context: { restaurant: INFO, menu: MENU },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        reply = j.reply || j.message || j.output || j.text || "";
      }
    } catch {}
  }
  reply = reply || hermesLocal(q);
  chatHist.push(
    { role: "user", content: q },
    { role: "assistant", content: reply },
  );
  return reply;
}
function initHermes() {
  $("#hermes").innerHTML =
    `<button class="hfab" id="hOpen" aria-label="Open PASSO assistant">Ask PASSO</button><section class="hwin" id="hWin" aria-label="PASSO assistant"><div class="hh"><div><b>PASSO</b><span>Your Personal Dining Concierge</span></div><button id="hClose" aria-label="Close chat">×</button></div><div class="hm" id="hMsg" aria-live="polite"></div><form class="hf" id="hForm"><input id="hIn" placeholder="Ask about the menu, hours, reservations…" aria-label="Message PASSO" autocomplete="off"><button type="submit">Send</button></form></section>`;
  const msg = $("#hMsg"),
    add = (t, c) => {
      const d = document.createElement("div");
      d.className = "b " + c;
      d.textContent = t;
      msg.appendChild(d);
      msg.scrollTop = msg.scrollHeight;
      return d;
    };
  const chips = () => {
    const c = document.createElement("div");
    c.className = "chips";
    c.innerHTML = SUGG.map((q) => `<button type="button">${q}</button>`).join(
      "",
    );
    c.onclick = (e) => {
      if (e.target.tagName === "BUTTON") send(e.target.textContent);
    };
    msg.appendChild(c);
    msg.scrollTop = msg.scrollHeight;
  };
  add(
    "Welcome to PASSO. I can help with our menu and ingredients, popular dishes, hours and reservations. How may I help?",
    "h",
  );
  chips();
  async function send(q) {
    document.querySelectorAll(".chips").forEach((c) => c.remove());
    add(q, "u");
    const w = add("…", "h");
    const a = await hermesAsk(q);
    w.textContent = a;
    if (/reserv|book|table/i.test(q)) {
      const l = document.createElement("a");
      l.className = "btn sm";
      l.href = "#/reserve";
      l.textContent = "Reserve a Table";
      l.onclick = () => $("#hWin").classList.remove("open");
      msg.appendChild(l);
    }
    chips();
  }
  $("#hOpen").onclick = () => {
    $("#hWin").classList.add("open");
    $("#hOpen").style.display = "none";
    $("#hIn").focus();
  };
  $("#hClose").onclick = () => {
    $("#hWin").classList.remove("open");
    $("#hOpen").style.display = "";
  };
  $("#hForm").onsubmit = (e) => {
    e.preventDefault();
    const v = $("#hIn").value.trim();
    if (v) {
      $("#hIn").value = "";
      send(v);
    }
  };
}

/* ---------- boot ---------- */
(async function () {
  renderFoot();
  initHermes();
  if (authApi) {
    const { data } = await authApi.getSession();
    user = data.session?.user || null;
    authApi.onAuthStateChange((_e, s) => {
      const was = user;
      user = s?.user || null;
      if (!!was !== !!user) {
        location.hash = user ? pendingHash || "#/account" : "#/home";
        pendingHash = "";
        route();
      }
    });
  }
  route();
  fetchReviews().then(paintReviews);
})();
