// =====================
// LIFF Reserve (JP) - clean version
// =====================

// ====== CONFIG ======
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx2e8Xd8kAQ--kWErdGY7CBtsJ8gDSD87SEQbtDHrfM5HL0xxGhfpzZ8hQ5Qjj8bRg/exec";
const LIFF_ID = "2008793696-IEhzXwEH";

// ====== STATE ======
const state = {
  profile: null,
  allSlots: [],
  loadedYm: null, // "YYYYMM"
  selectedDate: null, // "YYYY-MM-DD"
  selectedSlot: null, // slot object
  form: { name: "", tel: "", note: "" },
};

// ====== DOM ======
const statusEl = document.getElementById("status");

// Views
const viewCalendar = document.getElementById("viewCalendar");
const viewSlots = document.getElementById("viewSlots");
const viewForm = document.getElementById("viewForm");

// Calendar
const calendarHost = document.getElementById("calendar");
const dateInput = document.getElementById("date");

// Slots
const slotCountEl = document.getElementById("slotCount");
const slotsAMRoot = document.getElementById("slotsAM");
const slotsPMRoot = document.getElementById("slotsPM");

// Form
const summaryEl = document.getElementById("summary");
const nameEl = document.getElementById("name");
const telEl = document.getElementById("tel");
const noteEl = document.getElementById("note");
const confirmBtn = document.getElementById("confirmBtn");

// Back buttons
document.getElementById("backToCalendar")?.addEventListener("click", () => {
  showView("calendar");
});
document.getElementById("backToSlots")?.addEventListener("click", () => {
  showView("slots");
});

// ====== UI helpers ======
const log = (msg) => {
  console.log(msg);
  if (statusEl) statusEl.textContent = msg;
};

function showView(name) {
  viewCalendar?.classList.toggle("hidden", name !== "calendar");
  viewSlots?.classList.toggle("hidden", name !== "slots");
  viewForm?.classList.toggle("hidden", name !== "form");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toYm(ymd) {
  return String(ymd || "")
    .replaceAll("-", "")
    .slice(0, 6);
}

function ymdCompact(ymd) {
  return String(ymd || "")
    .replaceAll("-", "")
    .replaceAll("/", "");
}

function clearSlotsUI() {
  if (slotsAMRoot) slotsAMRoot.innerHTML = "";
  if (slotsPMRoot) slotsPMRoot.innerHTML = "";
  if (slotCountEl) slotCountEl.textContent = "";
}

// "20260105T10:00:00+09:00" -> "10:00"
function hhmmFromIsoLike(str) {
  const s = String(str || "");
  const m = s.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : s;
}

function jpDateLabel(ymd) {
  const [y, m, d] = String(ymd).split("-");
  if (!y || !m || !d) return ymd;
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}

function splitAmPm(slots) {
  const am = [];
  const pm = [];
  for (const s of slots) {
    const hh = Number(hhmmFromIsoLike(s.start).slice(0, 2));
    if (hh < 12) am.push(s);
    else pm.push(s);
  }
  return { am, pm };
}

function renderSlotButtons(root, list) {
  if (!root) return;
  root.innerHTML = "";

  if (!list.length) {
    const p = document.createElement("p");
    p.textContent = "空きなし";
    root.appendChild(p);
    return;
  }

  list.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";

    const start = hhmmFromIsoLike(s.start);
    const end = hhmmFromIsoLike(s.end);
    btn.textContent = `${start} 〜 ${end}`;

    btn.addEventListener("click", () => {
      state.selectedSlot = s;
      openForm();
    });

    root.appendChild(btn);
  });
}

// ====== NETWORK ======
async function postJson(url, payload, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // GAS安全策
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`JSON parse failed: ${text.slice(0, 200)}`);
    }

    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function loadSlotsByYm(ym) {
  log("枠を取得中...");

  const payload = {
    action: "getSlots",
    userId: state.profile.userId,
    ym,
  };

  const { data } = await postJson(GAS_URL, payload);

  if (!data?.ok || !Array.isArray(data.slots)) {
    log(`枠取得NG: ${JSON.stringify(data)}`);
    return false;
  }

  state.allSlots = data.slots;
  state.loadedYm = ym;
  return true;
}

async function ensureMonthLoadedForDate(ymd) {
  const ym = toYm(ymd);
  if (state.loadedYm === ym && Array.isArray(state.allSlots)) return true;
  return await loadSlotsByYm(ym);
}

// ====== FLOW ======
async function onPickDate(ymd) {
  // 1) その月の枠を読み込み
  const ok = await ensureMonthLoadedForDate(ymd);
  if (!ok) return;

  // 2) その日の枠を表示
  openSlots(ymd);
}

function openSlots(ymd) {
  state.selectedDate = ymd;
  clearSlotsUI();

  const key = ymdCompact(ymd);
  const slots = (state.allSlots || []).filter((s) =>
    String(s.slotId || "").startsWith(key)
  );

  if (slotCountEl)
    slotCountEl.textContent = `枠OK: ${slots.length}件（押して予約してね）`;

  if (!slots.length) {
    if (slotsAMRoot) slotsAMRoot.textContent = "この日は予約枠がありません。";
    if (slotsPMRoot) slotsPMRoot.textContent = "";
    showView("slots");
    log("この日は枠なし");
    return;
  }

  const { am, pm } = splitAmPm(slots);
  renderSlotButtons(slotsAMRoot, am);
  renderSlotButtons(slotsPMRoot, pm);

  showView("slots");
  log("時間を選んでね");
}

function openForm() {
  const s = state.selectedSlot;
  if (!s) return;

  const start = hhmmFromIsoLike(s.start);
  const end = hhmmFromIsoLike(s.end);

  if (summaryEl) {
    summaryEl.textContent = `日付: ${jpDateLabel(
      state.selectedDate
    )} / 時間: ${start} 〜 ${end}`;
  }

  // keep values
  if (nameEl) nameEl.value = state.form.name || "";
  if (telEl) telEl.value = state.form.tel || "";
  if (noteEl) noteEl.value = state.form.note || "";

  showView("form");
  log("お名前と電話番号を入れてね");
}

async function reserveSelectedSlot() {
  const slot = state.selectedSlot;
  if (!slot) {
    log("時間枠が選択されてないよ");
    return { ok: false };
  }

  log(`予約中... ${slot.slotId}`);

  const payload = {
    action: "createReservation",
    userId: state.profile.userId,
    slotId: slot.slotId,
    name: state.form.name,
    tel: state.form.tel,
    note: state.form.note,
  };

  const r = await postJson(GAS_URL, payload, 10000);

  if (!r.data?.ok) {
    log(`予約NG: ${JSON.stringify(r.data)}`);
    return { ok: false, data: r.data };
  }

  log(`予約OK ✅ ${r.data.reservationId}`);
  return { ok: true, data: r.data };
}

// ====== FORM submit ======
confirmBtn?.addEventListener("click", async () => {
  state.form.name = nameEl?.value?.trim() || "";
  state.form.tel = telEl?.value?.trim() || "";
  state.form.note = noteEl?.value?.trim() || "";

  if (!state.form.name || !state.form.tel) {
    log("お名前と電話番号は必須です");
    return;
  }

  const result = await reserveSelectedSlot();
  if (!result.ok) return;

  // 予約後：同じ月を取り直して、同じ日の枠画面を更新
  await loadSlotsByYm(toYm(state.selectedDate));
  openSlots(state.selectedDate);
});

// ====== MAIN ======
async function run() {
  if (!window.liff) {
    log("LIFF SDKが読み込めてない…");
    return;
  }
  if (!window.flatpickr) {
    log("flatpickr が読み込めてない…（CDN確認）");
    return;
  }

  try {
    log("1) init LIFF...");
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      log("2) login...");
      liff.login();
      return;
    }

    log("3) getting profile...");
    state.profile = await liff.getProfile();
    log(`日付を選んでね`);

    // 初期日付：今日
    const initial = todayYmd();
    state.selectedDate = initial;

    // 初期月の枠を先読み
    await loadSlotsByYm(toYm(initial));

    // ✅ flatpickr はログイン後に初期化（ここが超重要）
    flatpickr(dateInput, {
      locale: "ja",
      inline: true,
      dateFormat: "Y-m-d",
      defaultDate: initial,
      minDate: "today",
      appendTo: calendarHost || undefined,
      onChange: async (_dates, dateStr) => {
        // 日付タップしたら次へ
        await onPickDate(dateStr);
      },
    });

    showView("calendar");
  } catch (e) {
    log(`ERROR: ${e?.name || "Error"} / ${e?.message || e}`);
    console.error(e);
  }
}

run();
