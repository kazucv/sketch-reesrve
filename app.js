console.log("APP VERSION: 2025-12-29 UI-CLICK-RESERVE");

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx2e8Xd8kAQ--kWErdGY7CBtsJ8gDSD87SEQbtDHrfM5HL0xxGhfpzZ8hQ5Qjj8bRg/exec";
const LIFF_ID = "2008793696-IEhzXwEH";

const statusEl = document.getElementById("status");
const log = (msg) => {
  console.log(msg);
  if (statusEl) statusEl.textContent = msg;
};

async function postJson(url, payload, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
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

function clearBodyBelowStatus_() {
  // status以外の表示領域をざっくり作り直す（雑だけどデバッグに強い）
  const root = document.getElementById("root");
  if (root) root.remove();

  const div = document.createElement("div");
  div.id = "root";
  document.body.appendChild(div);
  return div;
}

function renderSlots_(root, slots, onClick) {
  const ul = document.createElement("ul");
  slots.forEach((s) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `${s.start} 〜 ${s.end}`;
    btn.style.fontSize = "16px";
    btn.style.padding = "10px 12px";
    btn.style.margin = "6px 0";
    btn.onclick = () => onClick(s);
    li.appendChild(btn);
    ul.appendChild(li);
  });
  root.appendChild(ul);
}

async function run() {
  if (!window.liff) {
    log("LIFF SDKが読み込めてない…");
    return;
  }

  try {
    log("1) init LIFF...");
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      log("ログインへ…");
      liff.login();
      return;
    }

    log("2) getting profile...");
    const profile = await liff.getProfile();

    log("3) getSlots...");
    const payload = {
      action: "getSlots",
      userId: profile.userId,
      ym: "202601",
    };
    const { data } = await postJson(GAS_URL, payload);

    if (!data?.ok || !Array.isArray(data.slots)) {
      log(`枠取得NG: ${JSON.stringify(data)}`);
      return;
    }

    log(`枠OK: ${data.slots.length} 件（押して予約してね）`);

    const root = clearBodyBelowStatus_();

    renderSlots_(root, data.slots, async (slot) => {
      try {
        log("予約中…");

        const payload2 = {
          action: "createReservation",
          userId: profile.userId,
          slotId: slot.slotId,
          name: "テスト太郎",
          tel: "09012345678",
          note: "LIFFテスト予約",
        };

        const r2 = await postJson(GAS_URL, payload2);

        if (!r2.data?.ok) {
          log(`予約NG: ${JSON.stringify(r2.data)}`);
          return;
        }

        log(`予約OK: ${r2.data.reservationId}`);
      } catch (e) {
        log(`予約ERROR: ${e?.message || e}`);
      }
    });
  } catch (e) {
    log(`ERROR: ${e?.name || "Error"} / ${e?.message || e}`);
    console.error(e);
  }
}

run();
