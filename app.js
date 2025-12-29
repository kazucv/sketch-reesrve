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
      // ↑GASは application/json でも動くこと多いけど、環境差の事故を避けるため text/plain 推奨
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await res.text(); // まずtextで受ける（JSONパース失敗の切り分けが楽）
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

async function run() {
  if (!window.liff) {
    log("LIFF SDKが読み込めてない…");
    throw new Error("LIFF SDK not loaded");
  }

  try {
    log("1) init LIFF...");
    await liff.init({ liffId: LIFF_ID });

    log(`2) isLoggedIn: ${liff.isLoggedIn()}`);
    if (!liff.isLoggedIn()) {
      log("2.5) redirecting to login...");
      liff.login();
      return;
    }

    log("3) getting profile...");
    const profile = await liff.getProfile();
    log(`3.5) got profile: ${profile.displayName}`);

    // ✅ ここが本命：GASへPOST
    const payload = {
      action: "getSlots",
      userId: profile.userId,
      ym: "202601", // ← いったん固定でOK（あとでUIで選ぶ）
    };

    log("4) POST getSlots to GAS...");
    const { status, data } = await postJson(GAS_URL, payload, 10000);

    log(`5) GAS response: ${status}`);
    if (!data?.ok) {
      log(`NG: ${JSON.stringify(data)}`);
      return;
    }

    // とりあえず見える化（UIは後で）
    const slots = data.slots || [];
    log(`6) slots: ${slots.length}`);

    // 画面に出す（最小）
    const ul = document.createElement("ul");
    slots.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = `${s.start} 〜 ${s.end}`;
      ul.appendChild(li);
    });
    document.body.appendChild(ul);
  } catch (e) {
    log(`ERROR: ${e?.name || "Error"} / ${e?.message || e}`);
    console.error(e);
  }
}

run();
