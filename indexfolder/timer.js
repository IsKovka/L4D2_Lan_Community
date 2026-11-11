
/* ======================================
   EVENT KONFIGURATION
====================================== */

const lanName = "Wintermajor 2026";

// HIER DEN TATSÄCHLICHEN STARTTERMIN EINTRAGEN
const nextLan = new Date("2026-10-24T09:00:00");

// Dauer der aktiven LAN-Phase: 24 Stunden
const lanDuration = 24 * 60 * 60 * 1000;


/* ======================================
   HTML ELEMENTE
====================================== */

const countdownEl =
    document.getElementById("countdown");

const countdownLabelEl =
    document.getElementById("countdownLabel");


/* ======================================
   COUNTDOWN AKTUALISIEREN
====================================== */

function updateCountdown() {

    if (!countdownEl || !countdownLabelEl) {
        return;
    }

    const now = Date.now();

    const startTime = nextLan.getTime();

    // Prüfen, ob das Datum gültig ist
    if (isNaN(startTime)) {

        countdownLabelEl.hidden = true;

        countdownEl.textContent =
            "Termin nicht verfügbar";

        return;
    }

    const diff =
        startTime - now;

    const elapsed =
        now - startTime;


    /* ======================================
       PHASE 1: EVENT STEHT NOCH BEVOR
    ====================================== */

    if (diff > 0) {

        countdownLabelEl.hidden = false;

        countdownLabelEl.textContent =
            "STARTET IN:";

        const days =
            Math.floor(
                diff / (1000 * 60 * 60 * 24)
            );

        const hours =
            Math.floor(
                (diff / (1000 * 60 * 60)) % 24
            );

        const mins =
            Math.floor(
                (diff / (1000 * 60)) % 60
            );

        const secs =
            Math.floor(
                (diff / 1000) % 60
            );

        countdownEl.textContent =
            `${days} TAGE ${hours} STUNDEN ` +
            `${mins.toString().padStart(2, "0")} MINUTEN ` +
            `${secs.toString().padStart(2, "0")} SEKUNDEN`;

        return;

    }


    /* ======================================
       PHASE 2: LAN LÄUFT (ERSTE 24 STUNDEN)
    ====================================== */

    if (elapsed < lanDuration) {

        countdownLabelEl.hidden = false;

        countdownLabelEl.textContent =
            "STATUS:";

        countdownEl.textContent =
            "LAN LÄUFT!";

        return;

    }


    /* ======================================
       PHASE 3: LAN BEENDET
    ====================================== */

    countdownLabelEl.hidden = true;

    countdownEl.textContent =
        "ERGEBNISSE";

}


/* ======================================
   INITIALISIERUNG
====================================== */

updateCountdown();

setInterval(updateCountdown, 1000);

