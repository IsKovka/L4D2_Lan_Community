/* =========================================================
   SPRINGFEVER 2027 – ONLINE QUALIFICATION

   Datenquelle: Google Sheets (CSV)
   Darstellung: Rangliste, Spielplan, Match-History
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
const MATCHES_PER_TEAM = 8;


/* =========================================================
   3. SPIELERBILDER
========================================================= */

const PLAYER_IMAGES = {

    "stun": "Stun.png",
    "schokk": "SchoKK.png",
    "serbia": "serbia4life88.png",
    "serbia4life88": "serbia4life88.png",
    "salomon sunday": "Salomon.png",
    "salomon": "Salomon.png",
    "chester244": "Chester244.png",
    "joker": "Alex.png",
    "kovka": "Is_Kovka.png",
    "is_kovka": "Is_Kovka.png",
    "cete": "Cete.png",
    "jabawoozee": "Jabawoozee.png",
    "jaba": "Jabawoozee.png",
    "psytech": "Psytech.png"

};


/* =========================================================
   4. HILFSFUNKTIONEN
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


function normalizeName(value) {
    return clean(value).toLowerCase();
}


function parseNumber(value) {

    if (!hasValue(value)) {
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


function formatPoints(value) {
    return Number(value || 0).toLocaleString("de-DE");
}


function getPlayerImage(playerName) {

    const image = PLAYER_IMAGES[normalizeName(playerName)];

    if (!image) {
        return null;
    }

    return "../../../../spielerfolder/" + image;

}


/* =========================================================
   5. DATUMSFUNKTIONEN
========================================================= */

function parseDate(value) {

    const input = clean(value);

    if (!input) return null;


    // Deutsches Format: 15.12.2026

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


    // ISO-Format: 2026-12-15

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
   6. CSV-DATEN LADEN
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

            transformHeader: function(header) {

                return header
                    .replace(/^\uFEFF/, "")
                    .trim();

            },

            complete: function(results) {

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

                if (!results.data || results.data.length === 0) {

                    reject(new Error(
                        "Die CSV-Datei enthält keine Daten."
                    ));

                    return;

                }

                if (results.errors.length > 0) {

                    console.warn(
                        "CSV-Hinweise:",
                        results.errors
                    );

                }

                resolve(results.data);

            },

            error: function(error) {
                reject(error);
            }

        });

    });

}


/* =========================================================
   7. TEAMS ZUSAMMENFASSEN
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

        if (
            player &&
            !uniqueTeams.get(id).players.includes(player)
        ) {

            uniqueTeams.get(id).players.push(player);

        }

    });

    return Array.from(uniqueTeams.values());

}


function findTeam(identifier) {

    const value = normalizeName(identifier);

    return getUniqueTeams().find(team =>

        normalizeName(team.id) === value ||
        normalizeName(team.name) === value

    );

}


/* =========================================================
   8. ERGEBNISSE GRUPPIEREN
========================================================= */

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


// Eine Kampagne gilt als abgeschlossen, wenn alle Kapitelzeilen
// den Status "Fertig" haben und beide Punktestände eingetragen sind.

function isCampaignComplete(rows) {

    if (!rows || rows.length === 0) {
        return false;
    }

    return rows.every(row =>

        clean(row.Status).toLowerCase() === "fertig" &&

        hasValue(row.Team_Blau_Punkte_kum) &&

        hasValue(row.Team_Rot_Punkte_kum)

    );

}


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
   9. KAPITELPUNKTE UND KAMPAGNENERGEBNISSE
========================================================= */

function calculateCampaign(rows) {

    let previousBlue = 0;
    let previousRed = 0;

    const chapters = [];

    // Die Reihenfolge der Kapitel aus Google Sheets bleibt erhalten.

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
   10. RANGLISTE BERECHNEN
========================================================= */

function calculateRanking() {

    const ranking = getUniqueTeams().map(team => ({

        ...team,

        totalPoints: 0,
        chapterWins: 0,
        playedCampaigns: 0,
        playedMatches: 0

    }));

    const grouped = groupAllResultsByMatch();


    // Punkte und Kapitelgewinne aus abgeschlossenen Kampagnen übernehmen.

    Object.entries(grouped).forEach(([matchID, campaigns]) => {

        const match = spielplan.find(row =>
            clean(row.Match_ID) === matchID
        );

        if (!match) return;

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        if (!blueTeam || !redTeam) return;

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

            // Abgeschlossene Kampagnen

            blue.playedCampaigns++;
            red.playedCampaigns++;

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


    // Abgeschlossene Begegnungen pro Team zählen.
    // Eine Begegnung zählt erst, wenn beide Kampagnen fertig sind.

    spielplan.forEach(match => {

        const matchID = clean(match.Match_ID);

        const completedCampaigns =
            getCompletedCampaignsForMatch(matchID);

        if (completedCampaigns.length < CAMPAIGNS_PER_MATCH) {
            return;
        }

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        if (!blueTeam || !redTeam) return;

        const blue = ranking.find(team =>
            team.id === blueTeam.id
        );

        const red = ranking.find(team =>
            team.id === redTeam.id
        );

        if (blue) blue.playedMatches++;
        if (red) red.playedMatches++;

    });


    // Ranglistensortierung:
    // 1. Gesamtpunkte
    // 2. Gewonnene Kapitel

    ranking.sort((a, b) =>

        b.totalPoints - a.totalPoints ||
        b.chapterWins - a.chapterWins

    );

    return ranking;

}


/* =========================================================
   11. RANGLISTE ANZEIGEN
========================================================= */

function renderRanking() {

    const container = document.getElementById(
        "rankingContainer"
    );

    if (!container) return;

    const ranking = calculateRanking();

    if (ranking.length === 0) {

        container.innerHTML = `
            <div class="empty-results">
                <h3>KEINE TEAMS GEFUNDEN</h3>
                <p>Die Teamdaten konnten nicht verarbeitet werden.</p>
            </div>
        `;

        return;

    }


    container.innerHTML = ranking.map((team, index) => {

        const position = index + 1;

        const qualified = position <= 2;

        const status = qualified
            ? "qualified"
            : "eliminated";


        const playerHTML = team.players.map(playerName => {

            const imagePath = getPlayerImage(playerName);

            const avatar = imagePath

                ? `
                    <img
                        src="${escapeHTML(imagePath)}"
                        alt="${escapeHTML(playerName)}"
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                `

                : `
                    <span class="ranking-player-placeholder">
                        ${escapeHTML(playerName.charAt(0).toUpperCase())}
                    </span>
                `;

            return `
                <div class="ranking-player">
                    ${avatar}
                    <span>${escapeHTML(playerName)}</span>
                </div>
            `;

        }).join("");


        return `
            <article
                class="ranking-row ${status}"
                data-team-id="${escapeHTML(team.id)}"
                data-position="${position}"
            >

                <div class="ranking-position">

                    <span class="position-number">
                        ${String(position).padStart(2, "0")}
                    </span>

                </div>


                <div class="ranking-team">

                    <div class="ranking-team-logo" aria-hidden="true"></div>

                    <div class="ranking-team-info">

                        <strong>
                            ${escapeHTML(team.name)}
                        </strong>

                        <div class="ranking-player-list">
                            ${playerHTML}
                        </div>

                    </div>

                    <div class="ranking-watermark" aria-hidden="true"></div>

                </div>


                <div class="ranking-games">

                    <strong>
                        ${team.playedMatches} / ${MATCHES_PER_TEAM}
                    </strong>

                    <span>
                        Begegnungen
                    </span>

                </div>


                <div class="ranking-points">

                    ${formatPoints(team.totalPoints)}

                    <span>PUNKTE</span>

                </div>

            </article>
        `;

    }).join("");

}


/* =========================================================
   12. MATCHDATEN UND STATUS
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
   13. ANSTEHENDE BEGEGNUNGEN
========================================================= */

function renderSchedule() {

    const container = document.getElementById(
        "upcomingMatchesContainer"
    );

    const counter = document.getElementById(
        "upcomingMatchCount"
    );

    if (!container) return;


    const sortedMatches = [...spielplan].sort((a, b) => {

        const dateA = parseDate(a.Datum);
        const dateB = parseDate(b.Datum);

        if (!dateA || !dateB) return 0;

        return dateA - dateB;

    });


    // Nur Begegnungen anzeigen, bei denen mindestens
    // eine Kampagne noch nicht abgeschlossen ist.

    const upcomingMatches = sortedMatches.filter(match => {

        const data = getMatchData(match);

        return data.completedCount < CAMPAIGNS_PER_MATCH;

    });


    if (counter) {

        counter.textContent =
            `${upcomingMatches.length} BEGEGNUNGEN`;

    }


    if (upcomingMatches.length === 0) {

        container.innerHTML = `
            <div class="empty-results">

                <div class="empty-results-icon">✓</div>

                <h3>ALLE BEGEGNUNGEN ABGESCHLOSSEN</h3>

                <p>
                    Aktuell stehen keine offenen Begegnungen mehr aus.
                    Die Ergebnisse findest du in der Match-History.
                </p>

            </div>
        `;

        return;

    }


    container.innerHTML = upcomingMatches.map(match => {

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

            ? `${formatPoints(data.blueTotal)} : ${formatPoints(data.redTotal)}`

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
                            <strong>${escapeHTML(blueName)}</strong>
                        </div>

                        <span class="match-vs">VS</span>

                        <div class="match-team">
                            <strong>${escapeHTML(redName)}</strong>
                        </div>

                    </div>


                    <div class="match-details">

                        ${data.completedCount} / ${CAMPAIGNS_PER_MATCH}
                        Kampagnen abgeschlossen

                        · ${campaignText}

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
   14. SPIELER IN DER MATCH-HISTORY
========================================================= */

function renderHistoryPlayers(team) {

    if (!team || !team.players.length) {

        return `
            <span class="history-no-players">
                Keine Spielerdaten verfügbar
            </span>
        `;

    }


    return team.players.map(playerName => {

        const imagePath = getPlayerImage(playerName);

        const avatar = imagePath

            ? `
                <img
                    src="${escapeHTML(imagePath)}"
                    alt="${escapeHTML(playerName)}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            `

            : "";


        return `
            <div class="history-player">

                ${avatar}

                <span>
                    ${escapeHTML(playerName)}
                </span>

            </div>
        `;

    }).join("");

}


function renderHistoryRosters(
    blueTeam,
    redTeam,
    blueName,
    redName,
    bluePoints,
    redPoints
) {
    return `
        <div class="history-rosters">

            <div class="history-roster blue">

                <div class="history-roster-header">
                    <strong>${escapeHTML(blueName)}</strong>
                    <span class="history-roster-score">
                        ${formatPoints(bluePoints)}
                    </span>
                </div>

                <div class="history-player-list">
                    ${renderHistoryPlayers(blueTeam)}
                </div>

            </div>


            <div class="history-roster red">

                <div class="history-roster-header">
                    <strong>${escapeHTML(redName)}</strong>
                    <span class="history-roster-score">
                        ${formatPoints(redPoints)}
                    </span>
                </div>

                <div class="history-player-list">
                    ${renderHistoryPlayers(redTeam)}
                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   15. MATCH-HISTORY – KAMPAGNEN UND KAPITEL
========================================================= */

// Ordnet jeder Kampagne eine Bildnummer zu.
// Beispiel: Kampagne 1 -> 1_0.png, Kapitel 1 -> 1_1.png.

function getCampaignImageNumber(campaignID) {

    const orderedCampaignIDs = [...new Set(

        ergebnisse
            .map(row => clean(row.Kampagne_ID))
            .filter(Boolean)

    )];

    const index = orderedCampaignIDs.indexOf(clean(campaignID));

    return index >= 0 ? index + 1 : null;

}


function renderMatchHistory() {

    const container = document.getElementById(
        "matchHistoryContainer"
    );

    if (!container) return;


    const sortedMatches = [...spielplan]

    .filter(match =>
        getCompletedCampaignsForMatch(
            clean(match.Match_ID)
        ).length >= CAMPAIGNS_PER_MATCH
    )

    .sort((a, b) => {

        const dateA = parseDate(a.Datum)?.getTime() ?? 0;
        const dateB = parseDate(b.Datum)?.getTime() ?? 0;

        // Neueste Begegnung zuerst
        if (dateA !== dateB) {
            return dateB - dateA;
        }

        // Bei identischem Datum nach Match-ID sortieren
        return clean(b.Match_ID).localeCompare(
            clean(a.Match_ID),
            "de",
            { numeric: true }
        );

    });


    if (sortedMatches.length === 0) {

        container.innerHTML = `
            <div class="empty-results">

                <div class="empty-results-icon">—</div>

                <h3>NOCH KEINE ABGESCHLOSSENEN BEGEGNUNGEN</h3>

                <p>
                    Sobald beide Kampagnen einer Begegnung abgeschlossen sind,
                    erscheinen hier die Ergebnisse.
                </p>

            </div>
        `;

        return;

    }


    container.innerHTML = sortedMatches.map(match => {

        const blueTeam = findTeam(match.Team_Blau);
        const redTeam = findTeam(match.Team_Rot);

        const blueName = blueTeam?.name || match.Team_Blau;
        const redName = redTeam?.name || match.Team_Rot;


        const completedCampaigns =
            getCompletedCampaignsForMatch(clean(match.Match_ID));


        const matchData = getMatchData(match);

const playersHTML = renderHistoryRosters(
    blueTeam,
    redTeam,
    blueName,
    redName,
    matchData.blueTotal,
    matchData.redTotal
);


        const campaignHTML = completedCampaigns.map(item => {

            const campaign = calculateCampaign(item.rows);

            const imageNumber = getCampaignImageNumber(
                campaign.campaignID
            );


            const campaignCover = imageNumber

                ? `../../0Allgemein/Kampagnencover/${imageNumber}_0.png`

                : "";


            const maxTotal = campaign.chapters.reduce(
                (sum, chapter) => sum + chapter.maxPoints,
                0
            );


            const blueProgress = maxTotal > 0

                ? Math.min(
                    100,
                    campaign.blueTotal / maxTotal * 100
                )

                : 0;


            const redProgress = maxTotal > 0

                ? Math.min(
                    100,
                    campaign.redTotal / maxTotal * 100
                )

                : 0;


            let campaignWinner = "UNENTSCHIEDEN";

            if (campaign.blueTotal > campaign.redTotal) {
                campaignWinner = blueName;
            }

            if (campaign.redTotal > campaign.blueTotal) {
                campaignWinner = redName;
            }


            const chapterRows = campaign.chapters.map(
                (chapter, index) => {

                    const chapterImage = imageNumber

                        ? `../../0Allgemein/Kampagnencover/${imageNumber}_${index + 1}.png`

                        : "";


                    const diff =
                        chapter.bluePoints - chapter.redPoints;


                    return `
                        <div class="qualification-chapter-row">


                            <div class="qualification-chapter-name">

                                ${chapterImage ? `
                                    <img
                                        src="${escapeHTML(chapterImage)}"
                                        alt=""
                                        loading="lazy"
                                        onerror="this.style.display='none'"
                                    >
                                ` : ""}

                                <span>
                                    ${escapeHTML(chapter.chapter)}
                                </span>

                            </div>


                            <span class="qualification-chapter-max">
                                ${formatPoints(chapter.maxPoints)}
                            </span>


                            <span class="blue">
                                ${formatPoints(chapter.bluePoints)}
                            </span>


                            <span class="red">
                                ${formatPoints(chapter.redPoints)}
                            </span>


                            <span class="${
                                diff > 0
                                    ? "blue"
                                    : diff < 0
                                        ? "red"
                                        : "chapter-draw"
                            }">

                                ${formatPoints(Math.abs(diff))}

                            </span>


                        </div>
                    `;

                }

            ).join("");


            return `
                <details class="campaign-details">


                    <summary class="qualification-campaign-header">


                        <div class="qualification-campaign-left">

                            ${campaignCover ? `
                                <img
                                    class="qualification-campaign-cover"
                                    src="${escapeHTML(campaignCover)}"
                                    alt=""
                                    loading="lazy"
                                    onerror="this.style.display='none'"
                                >
                            ` : ""}


                            <div class="qualification-campaign-meta">

                                <strong>
                                    ${escapeHTML(campaign.campaignName)}
                                </strong>

                                <span>
                                    ${campaign.chapters.length} Kapitel
                                </span>

                            </div>

                        </div>


                        <div class="qualification-campaign-results">


                            <div class="qualification-campaign-team blue">

                                <span>
                                    ${escapeHTML(blueName)}
                                </span>

                                <strong>
                                    ${formatPoints(campaign.blueTotal)}
                                </strong>

                                <div class="qualification-progress">

                                    <div
                                        class="qualification-progress-blue"
                                        style="width:${blueProgress}%">
                                    </div>

                                </div>

                            </div>


                            <div class="qualification-campaign-team red">

                                <span>
                                    ${escapeHTML(redName)}
                                </span>

                                <strong>
                                    ${formatPoints(campaign.redTotal)}
                                </strong>

                                <div class="qualification-progress">

                                    <div
                                        class="qualification-progress-red"
                                        style="width:${redProgress}%">
                                    </div>

                                </div>

                            </div>


                        </div>


                    </summary>


                    <div class="qualification-chapter-table">


                        <div class="qualification-chapter-heading">

                            <span>KAPITEL</span>
                            <span>MAX.</span>
                            <span>${escapeHTML(blueName)}</span>
                            <span>${escapeHTML(redName)}</span>
                            <span>DIFF.</span>

                        </div>


                        ${chapterRows}


                        <div class="qualification-campaign-total">

                            <strong>GESAMT</strong>

                            <strong>
                                ${formatPoints(maxTotal)}
                            </strong>

                            <strong class="blue">
                                ${formatPoints(campaign.blueTotal)}
                            </strong>

                            <strong class="red">
                                ${formatPoints(campaign.redTotal)}
                            </strong>

                            <strong class="${
                                campaign.blueTotal > campaign.redTotal
                                    ? "blue"
                                    : campaign.redTotal > campaign.blueTotal
                                        ? "red"
                                        : "chapter-draw"
                            }">

                                ${formatPoints(
                                    Math.abs(
                                        campaign.blueTotal - campaign.redTotal
                                    )
                                )}

                            </strong>

                        </div>


                        <div class="qualification-campaign-winner">

                            <span>KAMPAGNENSIEGER</span>

                            <strong>
                                ${escapeHTML(campaignWinner)}
                            </strong>

                        </div>


                    </div>


                </details>
            `;

        }).join("");

        const matchWinner = matchData.blueTotal > matchData.redTotal

            ? blueName

            : matchData.redTotal > matchData.blueTotal

                ? redName

                : "UNENTSCHIEDEN";


        return `
            <details class="history-card">


                <summary>


                    <div class="history-summary-main">

                        <strong>
                            ${escapeHTML(blueName)} vs. ${escapeHTML(redName)}
                        </strong>

                        <span>
                            ${escapeHTML(formatDate(match.Datum))}
                            · ${escapeHTML(match.Match_ID)}
                        </span>

                    </div>


                    <div class="history-summary-result">

                        <strong>
                            ${formatPoints(matchData.blueTotal)}
                            :
                            ${formatPoints(matchData.redTotal)}
                        </strong>

                        <span>
                            ${completedCampaigns.length} / ${CAMPAIGNS_PER_MATCH} Kampagnen
                        </span>

                    </div>


                </summary>


                <div class="history-content">


                    ${playersHTML}


                    <div class="history-match-winner">

                        <span>BEGEGNUNGSSIEGER</span>

                        <strong>
                            ${escapeHTML(matchWinner)}
                        </strong>

                    </div>


                    <div class="history-campaigns">

                        <div class="qualification-campaign-section-label">
                            KAMPAGNENÜBERSICHT
                        </div>

                        ${campaignHTML}

                    </div>


                </div>


            </details>
        `;

    }).join("");

}


/* =========================================================
   SAISONFORTSCHRITT – ABGESCHLOSSENE BEGEGNUNGEN
========================================================= */

function renderSeasonProgress() {

    let completedMatches = 0;

    spielplan.forEach(match => {

        const completedCampaigns =
            getCompletedCampaignsForMatch(clean(match.Match_ID));

        if (completedCampaigns.length >= CAMPAIGNS_PER_MATCH) {
            completedMatches++;
        }

    });


    const countElement = document.getElementById(
        "completedMatchProgress"
    );

    const progressElement = document.getElementById(
        "seasonProgressFill"
    );


    if (countElement) {
        countElement.textContent = completedMatches;
    }


    if (progressElement) {

        const percentage = Math.min(
            100,
            (completedMatches / TOTAL_MATCHES) * 100
        );

        progressElement.style.width = percentage + "%";

    }

}


/* =========================================================
   17. ABGESCHLOSSENE BEGEGNUNGEN
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
   18. NÄCHSTE BEGEGNUNG
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

        dateElement.textContent =
            date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit"
            });

    } else {

        dateElement.textContent =
            clean(nextMatch.Datum);

    }


    teamsElement.textContent =
        `${blueName} vs. ${redName}`;

}


/* =========================================================
   19. AKTUELLE FINALISTEN
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
   20. LETZTES UPDATE
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
   21. GESAMTE SEITE AKTUALISIEREN
========================================================= */

function renderPage() {

    // Rangliste

    renderRanking();


    // Offene Begegnungen

    renderSchedule();


    // Abgeschlossene Begegnungen

    renderMatchHistory();


    // Saisonstatus

    renderSeasonProgress();

    renderCompletedMatchCount();

    renderNextMatch();


    // Finale

    renderFinalists();


    // Zeitstempel

    renderLastUpdate();

}


/* =========================================================
   22. DATEN LADEN UND SEITE STARTEN
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

            document.getElementById("upcomingMatchesContainer"),

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
   23. START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initQualification
);