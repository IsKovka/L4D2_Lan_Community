
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

    "serbia4life88": "serbia4life88.png",

    "salomon sunday": "Salomon.png",

    "chester244": "Chester244.png",

    "joker": "Alex.png",

    "kovka": "Is_Kovka.png",

    "cete": "Cete.png",

    "kenji": "Kenji.png",

    "twarisch52": "Twarisch52.png",

    "jabawoozee": "Jabawoozee.png",

    "psytech": "Psytech.png"

};


/* =========================================================
   4. TEAMLOGOS
========================================================= */

const TEAM_LOGOS = {

    "sharks": "../Teamlogos/logo_sharks.png",

    "wolves": "../Teamlogos/logo_wolves.png",

    "dagestani bears": "../Teamlogos/logo_bears.png",

    "bears": "../Teamlogos/logo_bears.png"

};


function getTeamLogo(team) {

    if (!team) return null;

    const candidates = [

        normalizeName(team.id),

        normalizeName(team.name)

    ];

    for (const candidate of candidates) {

        if (TEAM_LOGOS[candidate]) {

            return TEAM_LOGOS[candidate];

        }

    }

    return null;

}


/* =========================================================
   5. HILFSFUNKTIONEN
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

    if (!hasValue(value)) return 0;

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

    if (!image) return null;

    return "../../../../spielerfolder/" + image;

}


/* =========================================================
   6. DATUMSFUNKTIONEN
========================================================= */

function parseDate(value) {

    const input = clean(value);

    if (!input) return null;

    // Deutsches Format: 27.12.2026 oder 27.12.26

    const germanDate = input.match(

        /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s.*)?$/

    );

    if (germanDate) {

        const day = Number(germanDate[1]);

        const month = Number(germanDate[2]) - 1;

        let year = Number(germanDate[3]);

        if (year < 100) {

            year += year <= 69 ? 2000 : 1900;

        }

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

    // ISO-Format: 2026-12-27

    const isoDate = input.match(

        /^(\d{4})-(\d{2})-(\d{2})/

    );

    if (isoDate) {

        const year = Number(isoDate[1]);

        const month = Number(isoDate[2]) - 1;

        const day = Number(isoDate[3]);

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
   7. CSV-DATEN LADEN
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
   8. TEAMS ZUSAMMENFASSEN
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
   9. ERGEBNISSE GRUPPIEREN
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

    if (!rows || rows.length === 0) return false;

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
   10. KAPITELPUNKTE UND KAMPAGNENERGEBNISSE
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
   11. RANGLISTE BERECHNEN
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

            blue.totalPoints += campaign.blueTotal;

            red.totalPoints += campaign.redTotal;

            blue.playedCampaigns++;

            red.playedCampaigns++;

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
   12. RANGLISTE ANZEIGEN
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

        const status = qualified ? "qualified" : "eliminated";

        const logoPath = getTeamLogo(team);

        const logoHTML = logoPath

            ? `

                <img

                    class="ranking-team-logo"

                    src="${escapeHTML(logoPath)}"

                    alt="${escapeHTML(team.name)}"

                >

            `

            : "";


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

                    ${logoHTML}

                    <div class="ranking-team-info">

                        <strong>${escapeHTML(team.name)}</strong>

                        <div class="ranking-player-list">

                            ${playerHTML}

                        </div>

                    </div>

                </div>

                <div class="ranking-games">

                    <strong>

                        ${team.playedMatches} / ${MATCHES_PER_TEAM}

                    </strong>

                    <span>Begegnungen</span>

                </div>

                <div class="ranking-points">

                    ${formatPoints(team.totalPoints)}

                    <span>PUNKTE</span>

                </div>

            </article>

        `;

    }).join("");


    /* -----------------------------------------------------
       GEMEINSAME SPIELERSPALTEN FÜR ALLE TEAMS

       Die Breite jeder Spalte richtet sich nach dem längsten
       Spielereintrag an derselben Position über alle Teams.

       Dadurch bleiben sämtliche Spielerbilder senkrecht
       untereinander, ohne unnötige Freiräume.
    ----------------------------------------------------- */

    const playerLists = Array.from(

        container.querySelectorAll(".ranking-player-list")

    );

    const columnWidths = [0, 0, 0, 0];


    // Für die Messung zunächst natürliche Inhaltsbreiten nutzen.

    playerLists.forEach(list => {

        list.style.gridTemplateColumns = "repeat(4, max-content)";

    });


    // Größten Eintrag je Spalte über alle Teams ermitteln.

    playerLists.forEach(list => {

        Array.from(list.children).forEach((player, index) => {

            const column = index % 4;

            const width = player.getBoundingClientRect().width;

            columnWidths[column] = Math.max(

                columnWidths[column],

                width

            );

        });

    });


    // Gemeinsame Spaltenbreiten als CSS-Variablen hinterlegen.

    const widths = columnWidths.map(width =>

        Math.max(60, Math.ceil(width))

    );

    container.style.setProperty(

        "--ranking-player-col-1",

        `${widths[0]}px`

    );

    container.style.setProperty(

        "--ranking-player-col-2",

        `${widths[1]}px`

    );

    container.style.setProperty(

        "--ranking-player-col-3",

        `${widths[2]}px`

    );

    container.style.setProperty(

        "--ranking-player-col-4",

        `${widths[3]}px`

    );

    // Gemeinsame Breiten für die Tablet-Ansicht mit zwei Spalten.

    container.style.setProperty(

        "--ranking-player-col-13",

        `${Math.max(widths[0], widths[2])}px`

    );

    container.style.setProperty(

        "--ranking-player-col-24",

        `${Math.max(widths[1], widths[3])}px`

    );

    // Größte Breite für die einspaltige Smartphone-Ansicht.

    container.style.setProperty(

        "--ranking-player-col-all",

        `${Math.max(...widths)}px`

    );


    // Temporäre Messwerte entfernen. Die CSS-Variablen übernehmen.

    playerLists.forEach(list => {

        list.style.gridTemplateColumns = "";

    });

}



/* =========================================================
   13. MATCHDATEN UND STATUS
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
   14. ANSTEHENDE BEGEGNUNGEN – MATCH DOSSIER
========================================================= */

// Liefert die zu einer Begegnung eingetragenen Kampagnen
// einschließlich ihrer Vorschaubilder.

function getAssignedCampaignsForMatch(matchID) {

    const grouped = groupAllResultsByMatch();

    const assignedCampaigns = grouped[clean(matchID)] || {};

    return Object.entries(assignedCampaigns).map(

        ([campaignID, rows]) => {

            const campaignName = clean(rows[0]?.Kampagne);

            const imageNumber = getCampaignImageNumber(campaignID);

            const cover = imageNumber

                ? `../../0allgemein/Kampagnencover/${imageNumber}_0.png`

                : null;

            return {

                id: campaignID,

                name: campaignName || "Kampagne",

                cover,

                chapterCount: rows.length,

                complete: isCampaignComplete(rows)

            };

        }

    );

}


// Rendert die Spieler eines Teams im Stil der Match-History.

function renderSchedulePlayers(team) {

    if (!team || !team.players || team.players.length === 0) {

        return `

            <span class="schedule-no-players">

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

            : `

                <span class="schedule-player-placeholder">

                    ${escapeHTML(playerName.charAt(0).toUpperCase())}

                </span>

            `;

        return `

            <div class="schedule-player">

                ${avatar}

                <span>${escapeHTML(playerName)}</span>

            </div>

        `;

    }).join("");

}


// Rendert eine Teamkarte mit normalem Logo, Namen und Spielern.
// Große Wasserzeichen werden hier bewusst nicht verwendet.

function renderScheduleTeam(team, fallbackName, color) {

    const teamName = team?.name || fallbackName || "Team";

    const logoPath = getTeamLogo(team);

    const logoHTML = logoPath

        ? `

            <img

                class="schedule-team-logo"

                src="${escapeHTML(logoPath)}"

                alt="${escapeHTML(teamName)}"

                loading="lazy"

                onerror="this.style.display='none'"

            >

        `

        : `

            <span class="schedule-team-logo-placeholder">

                ${escapeHTML(teamName.charAt(0).toUpperCase())}

            </span>

        `;

    return `

        <div class="schedule-team-card ${color}">

            <div class="schedule-team-header">

                ${logoHTML}

                <strong class="schedule-team-name">

                    ${escapeHTML(teamName)}

                </strong>

            </div>

            <div class="schedule-player-list">

                ${renderSchedulePlayers(team)}

            </div>

        </div>

    `;

}


// Kleine Kampagnenvorschau für die geschlossene Karte.

function renderScheduleCampaignPreview(campaign, index) {

    const coverHTML = campaign.cover

        ? `

            <img

                class="schedule-preview-cover"

                src="${escapeHTML(campaign.cover)}"

                alt="${escapeHTML(campaign.name)}"

                loading="lazy"

            >

        `

        : `

            <span class="schedule-preview-placeholder">

                ${String(index + 1).padStart(2, "0")}

            </span>

        `;

    return `

        <div class="schedule-preview-campaign">

            ${coverHTML}

            <span class="schedule-preview-name">

                ${escapeHTML(campaign.name)}

            </span>

        </div>

    `;

}


// Große Kampagnenkarte für die geöffnete Begegnung.

function renderScheduleCampaign(campaign, index) {

    const coverHTML = campaign.cover

        ? `

            <img

                class="schedule-campaign-cover"

                src="${escapeHTML(campaign.cover)}"

                alt="${escapeHTML(campaign.name)}"

                loading="lazy"

                onerror="this.style.display='none'"

            >

        `

        : `

            <div class="schedule-campaign-placeholder">

                ${String(index + 1).padStart(2, "0")}

            </div>

        `;

    return `

        <div class="schedule-campaign-card">

            ${coverHTML}

            <div class="schedule-campaign-info">

                <strong>${escapeHTML(campaign.name)}</strong>

            </div>

        </div>

    `;

}


function renderSchedule() {

    const container = document.getElementById(

        "upcomingMatchesContainer"

    );

    const counter = document.getElementById(

        "upcomingMatchCount"

    );

    if (!container) return;


    // Begegnungen chronologisch sortieren.

    const sortedMatches = [...spielplan].sort((a, b) => {

        const dateA = parseDate(a.Datum);

        const dateB = parseDate(b.Datum);

        if (!dateA && !dateB) return 0;

        if (!dateA) return 1;

        if (!dateB) return -1;

        return dateA - dateB;

    });


    // Nur noch nicht vollständig abgeschlossene Begegnungen.

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


    container.innerHTML = upcomingMatches.map((match, index) => {

        const blueTeam = findTeam(match.Team_Blau);

        const redTeam = findTeam(match.Team_Rot);

        const blueName = blueTeam?.name || match.Team_Blau;

        const redName = redTeam?.name || match.Team_Rot;

        const blueLogoPath = getTeamLogo(blueTeam);

        const redLogoPath = getTeamLogo(redTeam);


        // Beide Logos liegen auf einer gemeinsamen Ebene
        // über der vollständigen geschlossenen Kartenfläche.

        const dossierWatermarks = `

            <div class="schedule-dossier-watermarks" aria-hidden="true">

                ${blueLogoPath ? `

                    <img

                        class="schedule-dossier-watermark blue"

                        src="${escapeHTML(blueLogoPath)}"

                        alt=""

                    >

                ` : ""}

                ${redLogoPath ? `

                    <img

                        class="schedule-dossier-watermark red"

                        src="${escapeHTML(redLogoPath)}"

                        alt=""

                    >

                ` : ""}

            </div>

        `;


        // Datum aufbereiten.

        const parsedDate = parseDate(match.Datum);

        const date = getDateParts(match.Datum);

        const dateLabel = parsedDate

            ? `${date.day} ${date.month} ${date.year}`

            : clean(match.Datum) || "TERMIN OFFEN";


        const expandedDateHTML = parsedDate

            ? `

                <strong>${date.day}</strong>

                <span>${date.month}</span>

                <small>${date.year}</small>

            `

            : `

                <strong>--</strong>

                <span>TERMIN</span>

                <small>OFFEN</small>

            `;


        // Kampagnen laden.

        const campaigns = getAssignedCampaignsForMatch(

            match.Match_ID

        );

        const previewCampaigns = campaigns

            .slice(0, 2)

            .map(renderScheduleCampaignPreview)

            .join("");

        const campaignHTML = campaigns.length > 0

            ? campaigns.map(renderScheduleCampaign).join("")

            : `

                <div class="schedule-campaign-empty">

                    Keine Kampagneninformationen verfügbar

                </div>

            `;

        const campaignCount = campaigns.length > 0

            ? `${campaigns.length} KAMPAGNEN`

            : "KAMPAGNEN WERDEN GELADEN";


        // Kompakte, geschlossene Ansicht.

        return `

            <details

                class="schedule-match-card"

                data-match-id="${escapeHTML(match.Match_ID)}"

            >

                <summary class="schedule-match-summary">

                    <div class="schedule-summary-collapsed">

                        ${dossierWatermarks}

                        <div class="schedule-dossier-top">

                            <span class="schedule-dossier-kicker">

                                MATCH ${String(index + 1).padStart(2, "0")}

                                / SPRINGFEVER 2027

                            </span>

                            <span class="schedule-dossier-date">

                                ${escapeHTML(dateLabel)}

                            </span>

                        </div>


                        <div class="schedule-dossier-faceoff">

                            <div class="schedule-dossier-team blue">

                                <strong>

                                    ${escapeHTML(blueName)}

                                </strong>

                            </div>

                            <div class="schedule-dossier-vs">

                                VS

                            </div>

                            <div class="schedule-dossier-team red">

                                <strong>

                                    ${escapeHTML(redName)}

                                </strong>

                            </div>

                        </div>


                        <div class="schedule-dossier-footer">

                            <!-- Match-ID bleibt intern verfügbar. -->

                            <span class="schedule-match-id sr-only">

                                ${escapeHTML(match.Match_ID)}

                            </span>

                            <span class="schedule-campaign-count">

                                ${campaignCount}

                            </span>

                            <div class="schedule-dossier-campaigns">

                                ${previewCampaigns}

                            </div>

                            <span class="schedule-expand-indicator"></span>

                        </div>

                    </div>


                    <div class="schedule-summary-open-label">

                        <span class="schedule-expand-indicator"></span>

                    </div>

                </summary>


                <!-- GEÖFFNETE DETAILANSICHT -->

                <div class="schedule-match-expanded">

                    <div class="schedule-match-teams">

                        ${renderScheduleTeam(

                            blueTeam,

                            blueName,

                            "blue"

                        )}

                        <div class="schedule-expanded-center">

                            <span class="schedule-expanded-vs">

                                VS

                            </span>

                            <div class="schedule-expanded-date">

                                ${expandedDateHTML}

                            </div>

                        </div>

                        ${renderScheduleTeam(

                            redTeam,

                            redName,

                            "red"

                        )}

                    </div>


                    <!-- KAMPAGNEN -->

                    <div class="schedule-match-campaigns">

                        <div class="schedule-campaign-heading">

                            KAMPAGNENÜBERSICHT

                        </div>

                        <div class="schedule-campaign-grid">

                            ${campaignHTML}

                        </div>

                    </div>

                </div>

            </details>

        `;

    }).join("");


    // Geöffnete Karte auch durch Klick in den Inhalt schließen.

    container.onclick = function(event) {

        const card = event.target.closest(

            ".schedule-match-card[open]"

        );

        if (!card) return;

        // Klick auf den Summary-Kopf übernimmt das native
        // Öffnen und Schließen des Details-Elements.

        if (event.target.closest(".schedule-match-summary")) {

            return;

        }

        card.open = false;

    };

}



/* =========================================================
   15. SPIELER UND TEAMKARTEN IN DER MATCH-HISTORY
========================================================= */

// Spieleraufstellung eines Teams rendern.

function renderHistoryPlayers(team) {

    if (!team || !team.players || team.players.length === 0) {

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
            : `
                <span class="history-player-placeholder">
                    ${escapeHTML(playerName.charAt(0).toUpperCase())}
                </span>
            `;

        return `
            <div class="history-player">

                ${avatar}

                <span>${escapeHTML(playerName)}</span>

            </div>
        `;

    }).join("");

}


// Eine Teamkarte für die geöffnete Match-History rendern.
// Enthält Teamlogo, Teamnamen, Match-Gesamtpunkte und Spieler.

function renderHistoryTeamCard(team, teamName, totalPoints, color) {

    const logoPath = getTeamLogo(team);

    const logoHTML = logoPath
        ? `
            <img
                class="history-team-logo"
                src="${escapeHTML(logoPath)}"
                alt="${escapeHTML(teamName)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `
        : `
            <span class="history-team-logo-placeholder">
                ${escapeHTML(teamName.charAt(0).toUpperCase())}
            </span>
        `;

    return `
        <div class="history-team-card ${color}">

            <div class="history-team-header">

                ${logoHTML}

                <div class="history-team-title">

                    <strong>${escapeHTML(teamName)}</strong>

                    <span class="history-team-total">
                        ${formatPoints(totalPoints)}
                        <small>MATCHPUNKTE</small>
                    </span>

                </div>

            </div>

            <div class="history-player-list">

                ${renderHistoryPlayers(team)}

            </div>

        </div>
    `;

}


// Beide Teamkarten mit VS und Spieldatum in der Mitte.
// Die Match-Gesamtsummen stehen jeweils unter dem Teamnamen.

function renderHistoryRosters(
    blueTeam,
    redTeam,
    blueName,
    redName,
    bluePoints,
    redPoints,
    matchDate
) {

    const date = getDateParts(matchDate);

    const dateHTML = date.year
        ? `
            <strong>${date.day}</strong>
            <span>${date.month}</span>
            <small>${date.year}</small>
        `
        : `
            <strong>--</strong>
            <span>DATUM</span>
            <small>UNBEKANNT</small>
        `;

    return `
        <div class="history-match-teams">

            ${renderHistoryTeamCard(
                blueTeam,
                blueName,
                bluePoints,
                "blue"
            )}

            <div class="history-expanded-center">

                <span class="history-expanded-vs">
                    VS
                </span>

                <div class="history-expanded-date">
                    ${dateHTML}
                </div>

            </div>

            ${renderHistoryTeamCard(
                redTeam,
                redName,
                redPoints,
                "red"
            )}

        </div>
    `;

}





/* =========================================================
   16. MATCH-HISTORY – KAMPAGNEN UND KAPITEL
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


// Kleine Kampagnenvorschau für die geschlossene Matchkarte.

function renderHistoryCampaignPreview(campaign, index) {

    const coverHTML = campaign.cover
        ? `
            <img
                src="${escapeHTML(campaign.cover)}"
                alt="${escapeHTML(campaign.campaignName)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `
        : `
            <span class="history-campaign-preview-placeholder">
                ${String(index + 1).padStart(2, "0")}
            </span>
        `;

    return `
        <div class="history-campaign-preview">

            ${coverHTML}

            <span>
                ${escapeHTML(campaign.campaignName)}
            </span>

        </div>
    `;

}


// Vollständige Kampagnenkarte mit:
//
// - Kampagnencover und Titel
// - Kampagnensummen beider Teams
// - Fortschrittsbalken
// - Kapitelübersicht
// - Gesamtsumme
//
// Die Kapitelübersicht ist direkt sichtbar.
// Es gibt keine zusätzliche Aufklappfunktion.

function renderHistoryCampaignCard(
    campaign,
    blueName,
    redName,
    index
) {

    const maxTotal = campaign.chapters.reduce(

        (sum, chapter) => sum + chapter.maxPoints,

        0

    );


    const blueProgress = maxTotal > 0
        ? Math.min(100, campaign.blueTotal / maxTotal * 100)
        : 0;

    const redProgress = maxTotal > 0
        ? Math.min(100, campaign.redTotal / maxTotal * 100)
        : 0;


    // Kapitelzeilen erzeugen.

    const chapterRows = campaign.chapters.map(

        (chapter, chapterIndex) => {

            const chapterImage = campaign.imageNumber
                ? `../../0allgemein/Kampagnencover/${campaign.imageNumber}_${chapterIndex + 1}.png`
                : "";

            const diff = chapter.bluePoints - chapter.redPoints;

            const diffClass = diff > 0
                ? "blue"
                : diff < 0
                    ? "red"
                    : "chapter-draw";

            return `
                <div class="history-chapter-row">

                    <div class="history-chapter-name">

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

                    <span class="history-chapter-max">
                        ${formatPoints(chapter.maxPoints)}
                    </span>

                    <span class="blue">
                        ${formatPoints(chapter.bluePoints)}
                    </span>

                    <span class="red">
                        ${formatPoints(chapter.redPoints)}
                    </span>

                    <span class="${diffClass}">
                        ${formatPoints(Math.abs(diff))}
                    </span>

                </div>
            `;

        }

    ).join("");


    // Kampagnencover.

    const coverHTML = campaign.cover
        ? `
            <img
                class="history-campaign-cover"
                src="${escapeHTML(campaign.cover)}"
                alt="${escapeHTML(campaign.campaignName)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `
        : `
            <div class="history-campaign-cover-placeholder">
                ${String(index + 1).padStart(2, "0")}
            </div>
        `;


    return `
        <article class="history-campaign-card">

            <!-- KAMPAGNENKOPF -->

            <div class="history-campaign-header">

                <div class="history-campaign-title">

                    ${coverHTML}

                    <div class="history-campaign-meta">

                        <strong>
                            ${escapeHTML(campaign.campaignName)}
                        </strong>

                        <span>
                            ${campaign.chapters.length} Kapitel
                        </span>

                    </div>

                </div>

            </div>


            <!-- KAMPAGNENSUMMEN -->

            <div class="history-campaign-scores">

                <div class="history-campaign-team-score blue">

                    <div class="history-campaign-score-heading">

                        <span>${escapeHTML(blueName)}</span>

                        <strong>
                            ${formatPoints(campaign.blueTotal)}
                        </strong>

                    </div>

                    <div class="history-campaign-progress">

                        <div
                            class="history-campaign-progress-fill blue"
                            style="width:${blueProgress}%"
                        ></div>

                    </div>

                </div>


                <div class="history-campaign-team-score red">

                    <div class="history-campaign-score-heading">

                        <span>${escapeHTML(redName)}</span>

                        <strong>
                            ${formatPoints(campaign.redTotal)}
                        </strong>

                    </div>

                    <div class="history-campaign-progress">

                        <div
                            class="history-campaign-progress-fill red"
                            style="width:${redProgress}%"
                        ></div>

                    </div>

                </div>

            </div>


            <!-- KAPITELÜBERSICHT – DIREKT SICHTBAR -->

            <div class="history-chapter-table">

                <div class="history-chapter-heading">

                    <span>KAPITEL</span>

                    <span>MAX.</span>

                    <span>${escapeHTML(blueName)}</span>

                    <span>${escapeHTML(redName)}</span>

                    <span>DIFF.</span>

                </div>

                ${chapterRows}


                <!-- GESAMT -->

                <div class="history-chapter-total">

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

            </div>

        </article>
    `;

}


// Gesamte Match-History rendern.

function renderMatchHistory() {

    const container = document.getElementById(
        "matchHistoryContainer"
    );

    if (!container) return;


    // Nur Begegnungen übernehmen, bei denen beide Kampagnen
    // vollständig abgeschlossen sind.

    const sortedMatches = [...spielplan]

        .filter(match =>

            getCompletedCampaignsForMatch(

                clean(match.Match_ID)

            ).length >= CAMPAIGNS_PER_MATCH

        )

        .sort((a, b) => {

            const dateA = parseDate(a.Datum)?.getTime() ?? 0;

            const dateB = parseDate(b.Datum)?.getTime() ?? 0;

            if (dateA !== dateB) {

                return dateB - dateA;

            }

            return clean(b.Match_ID).localeCompare(

                clean(a.Match_ID),

                "de",

                { numeric: true }

            );

        });


    // Leerer Zustand.

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


    container.innerHTML = sortedMatches.map((match, index) => {

        const roundNumber = sortedMatches.length - index;

        const matchID = clean(match.Match_ID);


        // Teams und Namen.

        const blueTeam = findTeam(match.Team_Blau);

        const redTeam = findTeam(match.Team_Rot);

        const blueName = blueTeam?.name || match.Team_Blau;

        const redName = redTeam?.name || match.Team_Rot;


        // Teamlogos für die geschlossene Ansicht.

        const blueLogoPath = getTeamLogo(blueTeam);

        const redLogoPath = getTeamLogo(redTeam);


        const watermarkHTML = `
            <div class="history-match-watermarks" aria-hidden="true">

                ${blueLogoPath ? `
                    <img
                        class="history-match-watermark blue"
                        src="${escapeHTML(blueLogoPath)}"
                        alt=""
                    >
                ` : ""}

                ${redLogoPath ? `
                    <img
                        class="history-match-watermark red"
                        src="${escapeHTML(redLogoPath)}"
                        alt=""
                    >
                ` : ""}

            </div>
        `;


        // Match-Gesamtsummen aus allen abgeschlossenen Kampagnen.

        const matchData = getMatchData(match);


        // Vollständige Teamkarten für die geöffnete Ansicht.

        const playersHTML = renderHistoryRosters(

            blueTeam,

            redTeam,

            blueName,

            redName,

            matchData.blueTotal,

            matchData.redTotal,

            match.Datum

        );


        // Abgeschlossene Kampagnen aufbereiten.

        const completedCampaigns =

            getCompletedCampaignsForMatch(matchID);


        const campaigns = completedCampaigns.map(item => {

            const campaign = calculateCampaign(item.rows);

            const imageNumber = getCampaignImageNumber(

                campaign.campaignID

            );

            return {

                ...campaign,

                imageNumber,

                cover: imageNumber

                    ? `../../0allgemein/Kampagnencover/${imageNumber}_0.png`

                    : null

            };

        });


        // Kleine Kampagnenvorschau für die geschlossene Karte.

        const previewHTML = campaigns

            .map(renderHistoryCampaignPreview)

            .join("");


        // Kampagnenkarten mit vollständiger Kapitelübersicht.

        const campaignHTML = campaigns.map(

            (campaign, campaignIndex) =>

                renderHistoryCampaignCard(

                    campaign,

                    blueName,

                    redName,

                    campaignIndex

                )

        ).join("");


        // Geschlossene und geöffnete Ansicht.

        return `
            <details
                class="history-match-card"
                data-match-id="${escapeHTML(matchID)}"
            >

                <summary class="history-match-summary">

                    <!-- GESCHLOSSENE ANSICHT -->

                    <div class="history-match-collapsed">

                        ${watermarkHTML}

                        <div class="history-match-top">

                            <span class="history-match-kicker">

                                MATCH ${String(roundNumber).padStart(2, "0")}

                                / SPRINGFEVER 2027

                            </span>

                            <span class="history-match-date">

                                ${escapeHTML(formatDate(match.Datum))}

                            </span>

                        </div>


                        <div class="history-match-faceoff">

                            <div class="history-match-team blue">

                                <strong>
                                    ${escapeHTML(blueName)}
                                </strong>

                                <span class="history-match-total">
                                    ${formatPoints(matchData.blueTotal)}
                                    <small>PUNKTE</small>
                                </span>

                            </div>


                            <div class="history-match-vs">
                                VS
                            </div>


                            <div class="history-match-team red">

                                <strong>
                                    ${escapeHTML(redName)}
                                </strong>

                                <span class="history-match-total">
                                    ${formatPoints(matchData.redTotal)}
                                    <small>PUNKTE</small>
                                </span>

                            </div>

                        </div>


                        <div class="history-match-footer">

                            <span class="history-match-code sr-only">
                                ${escapeHTML(matchID)}
                            </span>

                            <span class="history-campaign-count">
                                ${campaigns.length} KAMPAGNEN
                            </span>

                            <div class="history-campaign-preview-list">

                                ${previewHTML}

                            </div>

                            <span class="history-expand-indicator"></span>

                        </div>

                    </div>


                    <!-- SCHMALE LEISTE IM GEÖFFNETEN ZUSTAND -->

                    <div class="history-match-open-label">

                        <span class="history-expand-indicator"></span>

                    </div>

                </summary>


                <!-- GEÖFFNETE ANSICHT -->

                <div class="history-match-expanded">

                    <!-- TEAMS, MATCHSUMMEN UND SPIELER -->

                    ${playersHTML}


                    <!-- BEIDE KAMPAGNEN NEBENEINANDER -->

                    <div class="history-campaign-section">

                        <div class="history-campaign-section-heading">

                            KAMPAGNENÜBERSICHT

                        </div>

                        <div class="history-campaign-grid">

                            ${campaignHTML}

                        </div>

                    </div>

                </div>

            </details>
        `;

    }).join("");


    // Klick in den geöffneten Karteninhalt schließt die Karte.
    // Klick auf die Summary-Leiste übernimmt das native Verhalten.

    container.onclick = function(event) {

        const card = event.target.closest(
            ".history-match-card[open]"
        );

        if (!card) return;

        if (event.target.closest(".history-match-summary")) {

            return;

        }

        card.open = false;

    };

}




/* =========================================================
   17. SAISONFORTSCHRITT – ABGESCHLOSSENE BEGEGNUNGEN
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

        countElement.textContent =

            `${completedMatches} / ${TOTAL_MATCHES} BEGEGNUNGEN`;

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
   20. AKTUELLE FINALISTEN
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
   21. LETZTES UPDATE
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
   22. GESAMTE SEITE AKTUALISIEREN
========================================================= */

function renderPage() {

    renderRanking();

    renderSchedule();

    renderMatchHistory();

    renderSeasonProgress();

    renderFinalists();

    renderLastUpdate();

}


/* =========================================================
   23. DATEN LADEN UND SEITE STARTEN
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
   24. START
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    initQualification

);
