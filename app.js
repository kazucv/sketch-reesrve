const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx2e8Xd8kAQ--kWErdGY7CBtsJ8gDSD87SEQbtDHrfM5HL0xxGhfpzZ8hQ5Qjj8bRg/exec";

const LIFF_ID = "2008793696-IEhzXwEH";

const statusEl = document.getElementById("status");
const log = (msg) => {
  console.log(msg);
  if (statusEl) statusEl.textContent = msg;
};

const timeout = (ms) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
  );

async function run() {
  try {
    if (!window.liff) throw new Error("LIFF SDK not loaded");

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

    const url = `${GAS_URL}?userId=${encodeURIComponent(
      profile.userId
    )}&t=${Date.now()}`;

    log("4) fetching GAS...");
    const res = await Promise.race([
      fetch(url, { cache: "no-store" }),
      timeout(8000),
    ]);

    log(`4.5) response: ${res.status}`);

    const text = await res.text();
    log(`4.8) body head: ${text.slice(0, 80)}...`);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    log(`5) GAS OK: ${JSON.stringify(data)}`);
  } catch (e) {
    log(`NG: ${e?.message || e}`);
    console.error(e);
  }
}

run();
