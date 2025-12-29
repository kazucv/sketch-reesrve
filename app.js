const GAS_URL =
  "https://script.google.com/macros/s/AKfycbx2e8Xd8kAQ--kWErdGY7CBtsJ8gDSD87SEQbtDHrfM5HL0xxGhfpzZ8hQ5Qjj8bRg/exec";

async function main() {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "fetching GAS...";

  // ここは「すでにLIFF init & login済み」前提
  const profile = await liff.getProfile();
  const url = `${GAS_URL}?userId=${encodeURIComponent(
    profile.userId
  )}&t=${Date.now()}`; // t はキャッシュ避け

  fetch(url, { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      console.log("GAS:", data);
      if (statusEl) statusEl.textContent = `GAS OK: ${JSON.stringify(data)}`;
    })
    .catch((err) => {
      console.error("fetch error:", err);
      if (statusEl) statusEl.textContent = `GAS NG: ${err?.message || err}`;
    });
}

main();
