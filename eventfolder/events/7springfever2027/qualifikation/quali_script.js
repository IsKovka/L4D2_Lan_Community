

/* =========================================================
   SPRINGFEVER 2027 – ONLINE QUALIFICATION
   Datenquelle: Google Sheets (CSV)
   ========================================================= */


/* =========================================================
   1. GOOGLE SHEETS – DATENQUELLEN
========================================================= */

const CSV_URLS = {

    spielplan:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbGuQj2xs_VuNjc927UZJ3D1lm2Dzxnzu2zdwKEjlQK_q5QIFM1BoDxqlS0Y66aiw-yxLT1D6YE-60/pub?gid=0&single=true&output=csv",

    ergebnisse:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbGuQj2xs_VuNjc927UZJ3D1lm2Dzxnzu2zdwKEjlQK_q5QIFM1BoDxqlS0Y66aiw-yxLT1D6YE-60/pub?gid=887910007&single=true&output=csv",

    teams:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbGuQj2xs_VuNjc927UZJ3D1lm2Dzxnzu2zdwKEjlQK_q5QIFM1BoDxqlS0Y66aiw-yxLT1D6YE-60/pub?gid=276869345&single=true&output=csv"

};


/* =========================================================
   2. ZENTRALE DATEN
========================================================= */

let spielplan = [];
let ergebnisse = [];
let teams = [];

const TOTAL_CAMPAIGNS = 24;
const TOTAL_MATCHES = 12;
const CAMPAIGNS_PER_MATCH = 2;
const CAMPAIGNS_PER_TEAM = 16;


/* =========================================================
   3. HILFSFUNKTIONEN
========================================================= */

function clean(value) {

    return String(value ?? "").trim();

}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

    })[char]);

}


function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return 0;
    }

    const normalized = String(value)
        .trim()
        .replace(",", ".");

    const number = Number(normalized);

    return Number.isFinite(number) ? number : 0;

}


function hasValue(value) {

    return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

}


/* =========================================================
   4. DATUMSFUNKTIONEN
========================================================= */

// Unterstützt:
// 15.12.2026
// 2026-12-15
// 2026-12-15T00:00:00

function parseDate(value) {

    const input = clean(value);

    if (!input) return null;

    // Deutsches Datumsformat
    const germanDate = input.match(
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
    );

    if (germanDate) {

        const day = Number(germanDate[1]);
        const month = Number(germanDate[2]) - 1;
        const year = Number(germanDate[3]);

        const date = new Date(year, month, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;

    }

    // ISO-Format
    const isoDate = input.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (isoDate) {

        return new Date(
            Number(isoDate[1]),
            Number(isoDate[2]) - 1,
            Number(isoDate[3])
        );

    }

    return null;

}


function formatDate(value) {

    const date = parseDate(value);

    if (!date) return clean(value);

    return date.toLocaleDateString("de-DE", {

        day: "2-digit",
        month: "2-digit",
        year: "numeric"

    });

}


function getDateParts(value) {

    const date = parseDate(value);

    if (!date) {

        return {
            day: "--",
            month: "",
            year: ""
        };

    }

    return {

        day: String(date.getDate()).padStart(2, "0"),

        month: date.toLocaleDateString("de-DE", {
            month: "short"
        }).replace(".", "").toUpperCase(),

        year: date.getFullYear()

    };

}


/* =========================================================
   5. CSV-DATEN LADEN
========================================================= */

function loadCSV(url, requiredColumns) {

    return new Promise((resolve, reject) => {

        if (!url) {

            reject(new Error("CSV-Link fehlt."));

            return;

        }

        Papa.parse(url, {

            download: true,
            header: true,
            skipEmptyLines: true,

            transformHeader: function (header) {

                return header
                    .replace(/^\uFEFF/, "")
                    .trim();

            },

            complete: function (results) {

                if (results.errors.length > 0) {

                    console.warn(
                        "CSV-Hinweise:",
                        results.errors
                    );

                }

                const availableColumns = results.meta.fields || [];

                const missingColumns = requiredColumns.filter(
                    column => !availableColumns.includes(column)
                );

                if (missingColumns.length > 0) {

                    reject(new Error(
                        "Fehlende Spalten: " +
                        missingColumns.join(", ")
                    ));

                    return;

                }

                resolve(results.data);

            },

            error: function (error) {

                reject(error);

            }

        });

    });

}


/* =========================================================
   6. TEAMS ZUSAMMENFASSEN
========================================================= */

function getUniqueTeams() {

    const uniqueTeams = new Map();

    teams.forEach(row => {

        const id = clean(row.Team_ID);
        const name = clean(row.Teamname);

        if (!id || !name) return;

        if (!uniqueTeams.has(id)) {

            uniqueTeams.set(id, {

                id: id,
                name: name,
                players: []

            });

        }

        const player = clean(row.Spieler);

        if (player) {

            uniqueTeams.get(id).players.push(player);

        }

    });

    return Array.from(uniqueTeams.values());

}


function findTeam(identifier) {

    const value = clean(identifier).toLowerCase();

    return getUniqueTeams().find(team =>

        team.id.toLowerCase() === value ||
        team.name.toLowerCase() === value

    );

}


/* =========================================================
   7. ERGEBNISSE GRUPPIEREN
========================================================= */

// Alle Kampagnenzeilen eines Matches.
// Auch noch nicht abgeschlossene Kampagnen bleiben enthalten.

function groupAllResultsByMatch() {

    const grouped = {};

    ergebnisse.forEach(row => {

        const matchID = clean(row.Match_ID);
        const campaignID = clean(row.Kampagne_ID);

        if (!matchID || !campaignID) return;

        if (!grouped[matchID]) {

            grouped[matchID] = {};

        }

        if (!grouped[matchID][campaignID]) {

            grouped[matchID][campaignID] = [];

        }

        grouped[matchID][campaignID].push(row);

    });

    return grouped;

}


// Eine Kampagne gilt nur dann als abgeschlossen,
// wenn ALLE Kapitelzeilen den Status "Fertig" haben
// und beide kumulierten Punktestände eingetragen sind.

function isCampaignComplete(rows) {

    if (!rows || rows.length === 0) return false;

    return rows.every(row =>

        clean(row.Status).toLowerCase() === "fertig" &&

        hasValue(row.Team_Blau_Punkte_kum) &&

        hasValue(row.Team_Rot_Punkte_kum)

    );

}


// Liefert nur vollständig abgeschlossene Kampagnen.

function getCompletedCampaignsForMatch(matchID) {

    const grouped = groupAllResultsByMatch();

    const campaigns = grouped[matchID] || {};

    return Object.entries(campaigns)

        .filter(([campaignID, rows]) =>

            isCampaignComplete(rows)

        )

        .map(([campaignID, rows]) => ({

            campaignID,
            rows

        }));

}


/* =========================================================
   8. KAPITELPUNKTE UND KAMPAGNENERGEBNISSE
========================================================= */

function calculateCampaign(rows) {

    let previousBlue = 0;
    let previousRed = 0;

    const chapters = [];

    // Wichtig:
    // Die Reihenfolge aus Google Sheets bleibt erhalten.
    // Keine alphabetische Sortierung der Kapitel!

    rows.forEach(row => {

        const currentBlue = parseNumber(
            row.Team_Blau_Punkte_kum
        );

        const currentRed = parseNumber(
            row.Team_Rot_Punkte_kum
        );

        const blueChapterPoints = currentBlue - previousBlue;
        const redChapterPoints = currentRed - previousRed;

        chapters.push({

            chapter: clean(row.Kapitel),

            maxPoints: parseNumber(row.Max_Punkte),

            blueCumulative: currentBlue,
            redCumulative: currentRed,

            bluePoints: blueChapterPoints,
            redPoints: redChapterPoints

        });

        previousBlue = currentBlue;
        previousRed = currentRed;

    });

    return {

        campaignID: clean(rows[0].Kampagne_ID),

        campaignName: clean(rows[0].Kampagne),

        chapters: chapters,

        blueTotal: previousBlue,
        redTotal: previousRed

    };

}


/* =========================================================
   9. RANGLISTE BERECHNEN
========================================================= */

function calculateRanking() {

    const ranking = getUniqueTeams().map(team => ({

        ...team,

        totalPoints: 0,
        campaignWins: 0,
        chapterWins: 0,
        playedCampaigns: 0

    }));

    const grouped = groupAllResultsByMatch();

    Object.entries(grouped).forEach(([matchID, campaigns]) => {

        const match = spielplan.find(row =>

            clean(row.Match_ID) === matchID

        );

        if (!match) return;

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        if (!blueTeam || !redTeam) {

            console.warn(
                "Team nicht gefunden bei Match:",
                matchID
            );

            return;

        }

        const blue = ranking.find(team =>
            team.id === blueTeam.id
        );

        const red = ranking.find(team =>
            team.id === redTeam.id
        );

        if (!blue || !red) return;

        Object.values(campaigns).forEach(rows => {

            if (!isCampaignComplete(rows)) return;

            const campaign = calculateCampaign(rows);

            // Gesamtpunkte
            blue.totalPoints += campaign.blueTotal;
            red.totalPoints += campaign.redTotal;

            // Anzahl gespielter Kampagnen
            blue.playedCampaigns++;
            red.playedCampaigns++;

            // Kampagnensiege
            if (campaign.blueTotal > campaign.redTotal) {

                blue.campaignWins++;

            } else if (campaign.redTotal > campaign.blueTotal) {

                red.campaignWins++;

            }

            // Kapitelgewinne
            campaign.chapters.forEach(chapter => {

                if (chapter.bluePoints > chapter.redPoints) {

                    blue.chapterWins++;

                } else if (chapter.redPoints > chapter.bluePoints) {

                    red.chapterWins++;

                }

            });

        });

    });


    // Ranglistensortierung:
    // 1. Gesamtpunkte
    // 2. Kampagnensiege
    // 3. Kapitelgewinne

    ranking.sort((a, b) =>

        b.totalPoints - a.totalPoints ||

        b.campaignWins - a.campaignWins ||

        b.chapterWins - a.chapterWins

    );

    return ranking;

}


/* =========================================================
   10. RANGLISTE ANZEIGEN
========================================================= */

function renderRanking() {

    const container = document.getElementById(
        "rankingContainer"
    );

    if (!container) return;

    const ranking = calculateRanking();

    container.innerHTML = ranking.map((team, index) => {

        const position = index + 1;

        const qualified = position <= 2;

        const status = qualified
            ? "qualified"
            : "eliminated";

        return `

            <div class="ranking-row ${status}">

                <div class="ranking-position">

                    <span class="position-number">
                        ${String(position).padStart(2, "0")}
                    </span>

                </div>


                <div class="ranking-team">

                    <div>

                        <strong>
                            ${escapeHTML(team.name)}
                        </strong>

                        <span>
                            ${team.players.map(escapeHTML).join(", ")}
                        </span>

                    </div>

                </div>


                <div class="ranking-games">

                    <strong>
                        ${team.playedCampaigns} / ${CAMPAIGNS_PER_TEAM}
                    </strong>

                    <span>Kampagnen</span>

                </div>


                <div class="ranking-points">

                    ${team.totalPoints.toLocaleString("de-DE")}

                </div>


                <div class="ranking-status-cell">

                    <span class="qualification-badge ${qualified ? "" : "pending"}">

                        ${qualified ? "QUALIFIZIERT" : "AUSSERHALB"}

                    </span>

                </div>

            </div>

        `;

    }).join("");

}


/* =========================================================
   11. SPIELPLAN – DATEN UND STATUS
========================================================= */

function getMatchData(match) {

    const matchID = clean(match.Match_ID);

    const grouped = groupAllResultsByMatch();

    const assignedCampaigns = grouped[matchID] || {};

    const completedCampaigns =
        getCompletedCampaignsForMatch(matchID);

    const completedCount = completedCampaigns.length;

    let blueTotal = 0;
    let redTotal = 0;

    completedCampaigns.forEach(item => {

        const campaign = calculateCampaign(item.rows);

        blueTotal += campaign.blueTotal;
        redTotal += campaign.redTotal;

    });

    const campaignNames = Object.values(assignedCampaigns)
        .map(rows => clean(rows[0]?.Kampagne))
        .filter(Boolean);

    let status;
    let statusClass;

    if (completedCount >= CAMPAIGNS_PER_MATCH) {

        status = "ABGESCHLOSSEN";
        statusClass = "completed";

    } else if (completedCount > 0) {

        status = "IN BEARBEITUNG";
        statusClass = "in-progress";

    } else {

        status = "AUSSTEHEND";
        statusClass = "upcoming";

    }

    return {

        completedCount,
        blueTotal,
        redTotal,
        campaignNames,
        status,
        statusClass

    };

}


/* =========================================================
   12. SPIELPLAN ANZEIGEN
========================================================= */

function renderSchedule() {

    const container = document.querySelector(".schedule-list");

    if (!container) return;

    const sortedMatches = [...spielplan].sort((a, b) => {

        const dateA = parseDate(a.Datum);
        const dateB = parseDate(b.Datum);

        if (!dateA || !dateB) return 0;

        return dateA - dateB;

    });


    container.innerHTML = sortedMatches.map(match => {

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        const data = getMatchData(match);

        const date = getDateParts(match.Datum);

        const blueName = blueTeam?.name || match.Team_Blau;
        const redName = redTeam?.name || match.Team_Rot;

        const campaignText = data.campaignNames.length > 0

            ? data.campaignNames.map(escapeHTML).join(" & ")

            : "Kampagnen werden geladen";


        const score = data.completedCount > 0

            ? `${data.blueTotal.toLocaleString("de-DE")} : ${data.redTotal.toLocaleString("de-DE")}`

            : "– : –";


        return `

            <article class="match-card">


                <div class="match-date">

                    <strong>${date.day}</strong>

                    <span>${date.month}</span>

                    <small>${date.year}</small>

                </div>


                <div class="match-content">

                    <div class="match-teams">

                        <div class="match-team">

                            <strong>
                                ${escapeHTML(blueName)}
                            </strong>

                        </div>


                        <span class="match-vs">
                            VS
                        </span>


                        <div class="match-team">

                            <strong>
                                ${escapeHTML(redName)}
                            </strong>

                        </div>

                    </div>


                    <div class="match-details">

                        ${CAMPAIGNS_PER_MATCH} Kampagnen · ${campaignText}

                    </div>

                </div>


                <div class="match-result">

                    <span class="match-status ${data.statusClass}">

                        ${data.status}

                    </span>


                    <span class="match-score">

                        ${score}

                    </span>


                    <span class="match-id">

                        ${escapeHTML(match.Match_ID)}

                    </span>

                </div>


            </article>

        `;

    }).join("");

}


/* =========================================================
   13. MATCH-HISTORIE – KAMPAGNEN UND KAPITEL
========================================================= */

function renderMatchHistory() {

    const container = document.getElementById(
        "matchHistoryContainer"
    );

    if (!container) return;

    const sortedMatches = [...spielplan].sort((a, b) => {

        const dateA = parseDate(a.Datum);
        const dateB = parseDate(b.Datum);

        if (!dateA || !dateB) return 0;

        return dateB - dateA;

    });


    container.innerHTML = sortedMatches.map(match => {

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        const blueName = blueTeam?.name || match.Team_Blau;
        const redName = redTeam?.name || match.Team_Rot;

        const completedCampaigns =
            getCompletedCampaignsForMatch(clean(match.Match_ID));


        const campaignHTML = completedCampaigns.map(item => {

            const campaign = calculateCampaign(item.rows);


            const chaptersHTML = campaign.chapters.map(chapter => `

                <tr>

                    <td>
                        ${escapeHTML(chapter.chapter)}
                    </td>

                    <td>
                        ${chapter.maxPoints.toLocaleString("de-DE")}
                    </td>

                    <td class="blue">
                        ${chapter.bluePoints.toLocaleString("de-DE")}
                    </td>

                    <td class="red">
                        ${chapter.redPoints.toLocaleString("de-DE")}
                    </td>

                </tr>

            `).join("");


            let campaignWinner = "UNENTSCHIEDEN";

            if (campaign.blueTotal > campaign.redTotal) {

                campaignWinner = blueName;

            } else if (campaign.redTotal > campaign.blueTotal) {

                campaignWinner = redName;

            }


            return `

                <details class="campaign-details">


                    <summary>

                        <span>
                            ${escapeHTML(campaign.campaignName)}
                        </span>

                        <strong>

                            ${campaign.blueTotal.toLocaleString("de-DE")}
                            :
                            ${campaign.redTotal.toLocaleString("de-DE")}

                        </strong>

                    </summary>


                    <div class="chapter-table-wrapper">

                        <table class="chapter-table">

                            <thead>

                                <tr>

                                    <th>KAPITEL</th>

                                    <th>MAX.</th>

                                    <th>${escapeHTML(blueName)}</th>

                                    <th>${escapeHTML(redName)}</th>

                                </tr>

                            </thead>


                            <tbody>

                                ${chaptersHTML}

                            </tbody>


                            <tfoot>

                                <tr>

                                    <td colspan="2">
                                        KAMPAGNENSIEGER
                                    </td>

                                    <td colspan="2">
                                        ${escapeHTML(campaignWinner)}
                                    </td>

                                </tr>

                            </tfoot>

                        </table>

                    </div>


                </details>

            `;

        }).join("");


        const completedCount = completedCampaigns.length;


        return `

            <details class="history-card">


                <summary>

                    <div>

                        <strong>

                            ${escapeHTML(blueName)}
                            vs.
                            ${escapeHTML(redName)}

                        </strong>


                        <span>

                            ${escapeHTML(formatDate(match.Datum))}
                            ·
                            ${escapeHTML(match.Match_ID)}

                        </span>

                    </div>


                    <span>

                        ${completedCount} / ${CAMPAIGNS_PER_MATCH} Kampagnen

                    </span>

                </summary>


                <div class="history-content">

                    ${

                        campaignHTML ||

                        `

                            <div class="empty-results">

                                <h3>NOCH KEINE ERGEBNISSE</h3>

                                <p>
                                    Für diese Begegnung liegen noch keine
                                    vollständig abgeschlossenen Kampagnen vor.
                                </p>

                            </div>

                        `

                    }

                </div>


            </details>

        `;

    }).join("");

}


/* =========================================================
   14. SAISONFORTSCHRITT
========================================================= */

function renderSeasonProgress() {

    const grouped = groupAllResultsByMatch();

    let completedCampaignCount = 0;

    Object.values(grouped).forEach(campaigns => {

        Object.values(campaigns).forEach(rows => {

            if (isCampaignComplete(rows)) {

                completedCampaignCount++;

            }

        });

    });


    const countElement = document.getElementById(
        "completedCampaignCount"
    );

    const progressElement = document.getElementById(
        "seasonProgressFill"
    );


    if (countElement) {

        countElement.textContent = completedCampaignCount;

    }


    if (progressElement) {

        const percentage = Math.min(

            100,

            (completedCampaignCount / TOTAL_CAMPAIGNS) * 100

        );

        progressElement.style.width = percentage + "%";

    }

}


/* =========================================================
   15. ABGESCHLOSSENE BEGEGNUNGEN
========================================================= */

function renderCompletedMatchCount() {

    const element = document.getElementById(
        "completedMatchCount"
    );

    if (!element) return;

    let completedMatches = 0;

    spielplan.forEach(match => {

        const completedCampaigns =
            getCompletedCampaignsForMatch(clean(match.Match_ID));

        if (completedCampaigns.length >= CAMPAIGNS_PER_MATCH) {

            completedMatches++;

        }

    });


    element.textContent =

        `${completedMatches} / ${TOTAL_MATCHES} BEGEGNUNGEN`;

}


/* =========================================================
   16. NÄCHSTE BEGEGNUNG
========================================================= */

function renderNextMatch() {

    const dateElement = document.getElementById(
        "nextMatchDate"
    );

    const teamsElement = document.getElementById(
        "nextMatchTeams"
    );

    if (!dateElement || !teamsElement) return;


    const sortedMatches = [...spielplan].sort((a, b) => {

        const dateA = parseDate(a.Datum);
        const dateB = parseDate(b.Datum);

        if (!dateA || !dateB) return 0;

        return dateA - dateB;

    });


    const nextMatch = sortedMatches.find(match => {

        const completedCampaigns =
            getCompletedCampaignsForMatch(clean(match.Match_ID));

        return completedCampaigns.length < CAMPAIGNS_PER_MATCH;

    });


    if (!nextMatch) {

        dateElement.textContent = "ABGESCHLOSSEN";

        teamsElement.textContent =
            "Alle Begegnungen wurden abgeschlossen.";

        return;

    }


    const blueTeam = findTeam(nextMatch.Team_Blau);
    const redTeam = findTeam(nextMatch.Team_Rot);

    const blueName = blueTeam?.name || nextMatch.Team_Blau;
    const redName = redTeam?.name || nextMatch.Team_Rot;

    const date = parseDate(nextMatch.Datum);


    if (date) {

        dateElement.textContent = date.toLocaleDateString("de-DE", {

            day: "2-digit",
            month: "2-digit"

        });

    } else {

        dateElement.textContent = clean(nextMatch.Datum);

    }


    teamsElement.textContent = `${blueName} vs. ${redName}`;

}


/* =========================================================
   17. AKTUELLE FINALISTEN
========================================================= */

function renderFinalists() {

    const finalistElements = document.querySelectorAll(
        ".final-qualification-team strong"
    );

    if (finalistElements.length < 2) return;

    const ranking = calculateRanking();

    const hasResults = ranking.some(team =>
        team.playedCampaigns > 0
    );


    if (!hasResults) {

        finalistElements[0].textContent = "NOCH OFFEN";
        finalistElements[1].textContent = "NOCH OFFEN";

        return;

    }


    finalistElements[0].textContent =
        ranking[0]?.name || "NOCH OFFEN";

    finalistElements[1].textContent =
        ranking[1]?.name || "NOCH OFFEN";

}


/* =========================================================
   18. LETZTES UPDATE
========================================================= */

function renderLastUpdate() {

    const element = document.getElementById("lastUpdate");

    if (!element) return;

    const now = new Date();

    element.textContent =

        "Daten geladen: " +

        now.toLocaleString("de-DE", {

            day: "2-digit",
            month: "2-digit",
            year: "numeric",

            hour: "2-digit",
            minute: "2-digit"

        });

}


/* =========================================================
   19. GESAMTE SEITE AKTUALISIEREN
========================================================= */

function renderPage() {

    renderRanking();

    renderSchedule();

    renderMatchHistory();

    renderSeasonProgress();

    renderCompletedMatchCount();

    renderNextMatch();

    renderFinalists();

    renderLastUpdate();

}


/* =========================================================
   20. DATEN LADEN UND SEITE STARTEN
========================================================= */

async function initQualification() {

    try {

        console.log(
            "Springfever 2027 – Qualifikationsdaten werden geladen."
        );


        const [

            scheduleData,

            resultData,

            teamData

        ] = await Promise.all([


            loadCSV(

                CSV_URLS.spielplan,

                [
                    "Match_ID",
                    "Datum",
                    "Team_Blau",
                    "Team_Rot"
                ]

            ),


            loadCSV(

                CSV_URLS.ergebnisse,

                [
                    "Match_ID",
                    "Kampagne_ID",
                    "Kampagne",
                    "Kapitel",
                    "Max_Punkte",
                    "Team_Blau_Punkte_kum",
                    "Team_Rot_Punkte_kum",
                    "Status"
                ]

            ),


            loadCSV(

                CSV_URLS.teams,

                [
                    "Team_ID",
                    "Teamname",
                    "Spieler"
                ]

            )

        ]);


        spielplan = scheduleData;

        ergebnisse = resultData;

        teams = teamData;


        console.log("CSV-Daten erfolgreich geladen.");

        console.log("Spielplan:", spielplan);

        console.log("Ergebnisse:", ergebnisse);

        console.log("Teams:", teams);


        renderPage();


    } catch (error) {


        console.error(

            "Fehler beim Laden der Qualifikationsdaten:",

            error

        );


        const containers = [

            document.getElementById("rankingContainer"),

            document.querySelector(".schedule-list"),

            document.getElementById("matchHistoryContainer")

        ];


        containers.forEach(container => {

            if (!container) return;

            container.innerHTML = `

                <div class="data-error">

                    Die Qualifikationsdaten konnten nicht geladen werden.

                    Bitte überprüfe die Google-Sheets-Veröffentlichung
                    und die Spaltennamen.

                </div>

            `;

        });

    }

}


/* =========================================================
   21. START
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    initQualification

);


/* ===================================
   TEAMÜBERSICHT
=================================== */

// Zuordnung der Spielernamen zu den vorhandenen Profilbildern
const PLAYER_IMAGES = {
    "Stun": "Stun.png",
    "Schokk": "SchoKK.png",
    "serbia4life88": "serbia4life88.png",
    "salomon sunday": "Salomon.png",
    "chester244": "Chester244.png",
    "joker": "Alex.png",
    "kovka": "Kovka.png",
    "cete": "Cete.png",
    "jabawoozee": "Jabawoozee.png",
    "psytech": "Psytech.png"
};

function normalizePlayerName(name) {
    return String(name || "")
        .trim()
        .toLowerCase();
}

function getPlayerImage(playerName) {
    const image = PLAYER_IMAGES[normalizePlayerName(playerName)];

    if (!image) {
        return null;
    }

    // Qualifikationsseite liegt vier Verzeichnisebenen unter dem Root
    return "../../../../spielerfolder/" + image;
}

function renderTeamOverview(teamRows) {
    const container = document.getElementById("teamOverviewContainer");

    if (!container) return;

    // Teams anhand der Teamnamen gruppieren
    const groupedTeams = {};

    teamRows.forEach(row => {
        const teamName = row.Teamname?.trim();
        const playerName = row.Spieler?.trim();

        if (!teamName || !playerName) return;

        if (!groupedTeams[teamName]) {
            groupedTeams[teamName] = [];
        }

        groupedTeams[teamName].push(playerName);
    });

    // Teamnamen alphabetisch sortieren
    const sortedTeams = Object.entries(groupedTeams)
        .sort(([a], [b]) => a.localeCompare(b, "de"));

    container.innerHTML = sortedTeams.map(([teamName, players]) => {

        const playerHTML = players.map(playerName => {
            const imagePath = getPlayerImage(playerName);

            const avatar = imagePath
                ? `
                    <img
                        src="${imagePath}"
                        alt="${playerName}"
                        onerror="this.outerHTML='<div class=&quot;team-player-placeholder&quot;>${playerName.charAt(0).toUpperCase()}</div>'"
                    >
                `
                : `
                    <div class="team-player-placeholder">
                        ${playerName.charAt(0).toUpperCase()}
                    </div>
                `;

            return `
                <div class="team-player">
                    ${avatar}
                    <span>${playerName}</span>
                </div>
            `;
        }).join("");

        return `
            <article class="team-overview-card">
                <h3>${teamName}</h3>
                <div class="team-player-list">
                    ${playerHTML}
                </div>
            </article>
        `;
    }).join("");
}