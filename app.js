const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx2e8Xd8kAQ--kWErdGY7CBtsJ8gDSD87SEQbtDHrfM5HL0xxGhfpzZ8hQ5Qjj8bRg/exec";

const statusEl = document.getElementById("status");

async function init() {
  try {
    if (statusEl) statusEl.textContent = "LIFF init...";

    await liff.init({ liffId: "2008793696-IEhzXwEH" });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();

    if (statusEl) statusEl.textContent = "fetching GAS...";

    const url = `${GAS_URL}?userId=${encodeURIComponent(profile.userId)}`;

    const r = await fetch(url, { cache: "no-store" });
    const data = await r.json();

    console.log("GAS:", data);
    if (statusEl) statusEl.textContent = `GAS OK: ${JSON.stringify(data)}`;
  } catch (err) {
    console.error("error:", err);
    if (statusEl) statusEl.textContent = `NG: ${err?.message || err}`;
  }
}

init();
