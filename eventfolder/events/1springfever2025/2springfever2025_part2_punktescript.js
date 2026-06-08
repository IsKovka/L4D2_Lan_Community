const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQxD90O14S-DPHkTlMkLZOWv6rpY1H641lsw4d9oTq9uSzEdLS4nGPXv8_7PIdiPLy2R3SsdyRus_7M/pub?gid=0&single=true&output=csv";

function normKey(s){
  return (s||'').toString().normalize('NFKD').replace(/\s+/g,' ').trim().toLowerCase();
}
function normText(s){
  return (s||'').toString().normalize('NFKD').replace(/\W+/g,' ').trim().toLowerCase();
}

async function loadScores() {
  try {
    if (typeof Papa === 'undefined') {
      console.error('[sheets] PapaParse nicht vorhanden. <script src="papaparse..."></script> vor sheets.js einfügen.');
      return;
    }

    console.log('[sheets] fetching CSV:', SHEET_CSV_URL);
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    console.log('[sheets] fetch status', res.status, res.statusText);
    if (!res.ok) {
      console.error('[sheets] fetch failed', res.status, res.statusText);
      return;
    }

    const csvText = await res.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    console.log('[sheets] parsed rows:', parsed.data.length, 'fields:', parsed.meta?.fields);

    // Normalize incoming CSV keys to canonical keys
    const rows = parsed.data.map(raw => {
      const out = { kampagne: '', kapitel: '', wolves: '', sharks: '' };
      Object.keys(raw).forEach(k => {
        const nk = normKey(k);
        if (nk.includes('kamp')) out.kampagne = (raw[k]||'').toString().trim();
        else if (nk.includes('kapit')) out.kapitel = (raw[k]||'').toString().trim();
        else if (nk.includes('wolv') || nk.includes('wolf') || nk.includes('wolves')) out.wolves = raw[k];
        else if (nk.includes('shark') || nk.includes('sharks')) out.sharks = raw[k];
        // falls noch andere Header existieren, werden ignoriert
      });
      return out;
    });

    // Debug: zeige erste paar Zeilen
    console.log('[sheets] normalized rows sample:', rows.slice(0,6));

    rows.forEach(row => {
      const kampagne = row.kampagne;
      const kapitel = row.kapitel;
      const wolvesNum = Number(row.wolves) || 0;
      const sharksNum = Number(row.sharks) || 0;

      const table = document.getElementById(kampagne);
      if (!table) {
        console.warn('[sheets] Keine Tabelle für Kampagne gefunden:', kampagne);
        return;
      }

      const rowEl = Array.from(table.querySelectorAll('tr'))
        .find(tr => {
          const cell = tr.cells[0];
          return cell && normText(cell.textContent) === normText(kapitel);
        });

      if (!rowEl) {
        console.warn('[sheets] Keine Tabellen-Zeile gefunden für Kapitel:', { kampagne, kapitel });
        return;
      }

      const wolvesInput = rowEl.querySelector('.wolves');
      const sharksInput = rowEl.querySelector('.sharks');

      if (!wolvesInput) {
        console.warn('[sheets] .wolves Input nicht gefunden in Zeile:', { kampagne, kapitel, rowEl });
      } else {
        wolvesInput.value = wolvesNum;
        // Event dispatch, damit oninput/Listener ausgelöst werden
        wolvesInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      if (!sharksInput) {
        console.warn('[sheets] .sharks Input nicht gefunden in Zeile:', { kampagne, kapitel, rowEl });
      } else {
        sharksInput.value = sharksNum;
        sharksInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // nach der vollständigen Aktualisierung die lokale Update-Logik anstoßen
    if (typeof updateAll === 'function') {
      updateAll();
    } else {
      console.warn('[sheets] updateAll() ist nicht definiert (noch nicht geladen).');
    }
  } catch (err) {
    console.error('[sheets] Fehler in loadScores():', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadScores();
  setInterval(loadScores, 30000);
});