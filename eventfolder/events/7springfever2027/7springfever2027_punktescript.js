/* ======================================
   KONFIGURATION
====================================== */
const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSEzLAat9ecGXb_Ewevw8mPX76YAlxPS4hrvReOibwVuA9pCxWLmGnGdLBx3LQRqr_-_PYjR9bM52jA/pub?output=csv";

let pointsChart = null;

/* ======================================
   DATEN LADEN
====================================== */
async function loadScores() {

    try {

        const response =
            await fetch(
                SHEET_URL,
                { cache: "no-store" }
            );

        const csv =
            await response.text();

        const parsed =
            Papa.parse(csv, {
                header: true,
                skipEmptyLines: true
            });

        processData(parsed.data);

    } catch (error) {

        console.error(
            "CSV Fehler:",
            error
        );

    }
}

/* ======================================
   CSV VERARBEITEN
====================================== */
function processData(rows) {

    const campaigns = {};

    rows.forEach(row => {

        const campaign =
            row.Kampagne?.trim();

        const chapter =
            row.Kapitel?.trim();

        if (!campaign || !chapter) {
            return;
        }

        const eCum =
            Number(row.E_Kum);

        const cCum =
            Number(row.C_Kum);

        if (
            isNaN(eCum) ||
            isNaN(cCum)
        ) {
            return;
        }

        if (!campaigns[campaign]) {

            campaigns[campaign] = {
                chapters: []
            };

        }

        campaigns[campaign]
    .chapters
    .push({
        chapter,
        eCum,
        cCum,
        maxPoints:
            Number(
                row.Max_Punkte
            ) || 0
    });

    });

    calculateStatistics(
        campaigns
    );

}

/* ======================================
   STATISTIKEN BERECHNEN
====================================== */
function calculateStatistics(
    campaigns
) {

    let totalEagles = 0;
    let totalChicks = 0;

    let campaignWinsEagles = 0;
    let campaignWinsChicks = 0;

    let chapterWinsEagles = 0;
    let chapterWinsChicks = 0;

    let campaignCount = 0;
    let chapterCount = 0;

    const chartLabels = [];
    const chartEagles = [];
    const chartChicks = [];

    Object.entries(campaigns)
        .forEach(([name, data]) => {

            campaignCount++;

            let previousE = 0;
            let previousC = 0;

            data.chapters.forEach(chapter => {

                chapterCount++;

                const ePoints =
                    chapter.eCum -
                    previousE;

                const cPoints =
                    chapter.cCum -
                    previousC;

                previousE =
                    chapter.eCum;

                previousC =
                    chapter.cCum;

                if (
                    ePoints > cPoints
                ) {
                    chapterWinsEagles++;
                }

                else if (
                    cPoints > ePoints
                ) {
                    chapterWinsChicks++;
                }

            });

            const campaignEagles =
                previousE;

            const campaignChicks =
                previousC;

            totalEagles +=
                campaignEagles;

            totalChicks +=
                campaignChicks;

            if (
                campaignEagles >
                campaignChicks
            ) {
                campaignWinsEagles++;
            }

            else if (
                campaignChicks >
                campaignEagles
            ) {
                campaignWinsChicks++;
            }

            chartLabels.push(name);

            chartEagles.push(
                campaignEagles
            );

            chartChicks.push(
                campaignChicks
            );

        });

    updateHero(
        totalEagles,
        totalChicks
    );

    updateKPIs(
        campaignWinsEagles,
        campaignWinsChicks,
        chapterWinsEagles,
        chapterWinsChicks,
        campaignCount,
        chapterCount,
        totalEagles,
        totalChicks
    );

    updateChart(
        chartLabels,
        chartEagles,
        chartChicks
    );

    renderCampaigns(
    campaigns
    );

    updateFooter();

}

/* ======================================
   HERO AKTUALISIEREN
====================================== */
function updateHero(
    eagles,
    chicks
) {

    document
        .getElementById(
            "eaglesTotal"
        )
        .textContent =
        eagles.toLocaleString(
            "de-DE"
        );

    document
        .getElementById(
            "chicksTotal"
        )
        .textContent =
        chicks.toLocaleString(
            "de-DE"
        );

}

/* ======================================
   KPI CARDS AKTUALISIEREN
====================================== */
function updateKPIs(
    campaignWinsEagles,
    campaignWinsChicks,
    chapterWinsEagles,
    chapterWinsChicks,
    campaignCount,
    chapterCount,
    totalEagles,
    totalChicks
) {

    document
        .getElementById(
            "campaignWinsEagles"
        )
        .textContent =
        campaignWinsEagles;

    document
        .getElementById(
            "campaignWinsChicks"
        )
        .textContent =
        campaignWinsChicks;

    document
        .getElementById(
            "chapterWinsEagles"
        )
        .textContent =
        chapterWinsEagles;

    document
        .getElementById(
            "chapterWinsChicks"
        )
        .textContent =
        chapterWinsChicks;

    const totalCampaignWins =
campaignWinsEagles +
campaignWinsChicks;

    const campaignPercentEagles =
totalCampaignWins > 0
? (campaignWinsEagles / totalCampaignWins) * 100
: 50;

const campaignPercentChicks =
totalCampaignWins > 0
? (campaignWinsChicks / totalCampaignWins) * 100
: 50;

    document.getElementById(
        "campaignBarEagles"
    ).style.width =
        campaignPercentEagles + "%";

    document.getElementById(
        "campaignBarChicks"
    ).style.width =
        campaignPercentChicks + "%";

    document.getElementById(
        "campaignPercentEagles"
    ).textContent =
        "" +
        campaignPercentEagles.toFixed(0) +
        "%";

    document.getElementById(
        "campaignPercentChicks"
    ).textContent =
        "" +
        campaignPercentChicks.toFixed(0) +
        "%";

        const totalChapterWins =
chapterWinsEagles +
chapterWinsChicks;

    const chapterPercentEagles = 
totalChapterWins > 0
? (chapterWinsEagles / totalChapterWins) * 100
: 50;

const chapterPercentChicks =
totalChapterWins > 0
? (chapterWinsChicks / totalChapterWins) * 100
: 50;

    document.getElementById(
        "chapterBarEagles"
    ).style.width =
        chapterPercentEagles + "%";

    document.getElementById(
        "chapterBarChicks"
    ).style.width =
        chapterPercentChicks + "%";

    document.getElementById(
        "chapterPercentEagles"
    ).textContent =
        "" +
        chapterPercentEagles.toFixed(0) +
        "%";

    document.getElementById(
        "chapterPercentChicks"
    ).textContent =
        "" +
        chapterPercentChicks.toFixed(0) +
        "%";

      const totalCampaigns = campaignCount;
const totalChapters = chapterCount;

    const isMobile = window.innerWidth <= 768;

document.getElementById(
    "campaignSubtitle"
).textContent =
    isMobile
        ? ""
        : "von " + totalCampaigns + " Kampagnen";

document.getElementById(
    "chapterSubtitle"
).textContent =
    isMobile
        ? ""
        : "von " + totalChapters + " Kapiteln";

    const rawDiff =
    totalEagles -
    totalChicks;

const diff =
    Math.abs(rawDiff);

    const leaderPoints =
    Math.max(
        totalEagles,
        totalChicks
    );

const loserPoints =
    Math.min(
        totalEagles,
        totalChicks
    );

const percent =
    loserPoints > 0
        ? (
            (leaderPoints - loserPoints)
            / loserPoints
        ) * 100
        : 0;

    document
        .getElementById(
            "pointDifference"
        )
        .textContent =       
        
        diff.toLocaleString("de-DE");

    document
        .getElementById(
            "differencePercent"
        )
        .textContent =
        percent.toFixed(1)
        + "%";

    const leader =
        document.getElementById(
            "differenceLeader"
        );

    const differenceValue =
    document.getElementById(
        "pointDifference"
    );

    const differencePercent =
    document.getElementById(
        "differencePercent"
    );    

   if (rawDiff > 0) {

    leader.textContent =
        "Team A führen";

    differenceValue.style.color =
        "#0066b9";

    differencePercent.style.color =
        "#0066b9";

}

else if (rawDiff < 0) {

    leader.textContent =
        "Team B führen";

    differenceValue.style.color =
        "#8a0000";

    differencePercent.style.color =
        "#8a0000";

}

else {

    leader.textContent =
        "Gleichstand";

    differenceValue.style.color =
        "#ffffff";

    differencePercent.style.color =
        "#ffffff";

}
}

/* ======================================
   VERGLEICHSCHART
====================================== */
function updateChart(
    labels,
    eagles,
    chicks
) {

    const ctx =
        document.getElementById(
            "punkteChart"
        );

    if (pointsChart) {

        pointsChart.destroy();

    }

    pointsChart =
        new Chart(ctx, {

            type: "bar",

            data: {

                labels,

                datasets: [

                    {
                        label: "Team A",
                        data: eagles,
                        backgroundColor:"#0066b9"
                    },

                    {
                        label: "Team B",
                        data: chicks,
                        backgroundColor:"#8a0000"
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                  plugins: {
                    legend: {
                      display: false
                    }
                  },

                scales: {

                    x: {
                        ticks: {
                            color: "#ffffff"
                        }
                    },

                    y: {
                        ticks: {
                            color: "#ffffff"
                        }
                    }

                }

            }

        });

}

/* ======================================
   KAMPAGNENLISTE GENERIEREN
====================================== */
function renderCampaigns(
    campaigns
){

    const container =
        document.getElementById(
            "campaignContainer"
        );

    if(!container){
        return;
    }

    container.innerHTML = "";

    let campaignIndex = 1;

    Object.entries(campaigns)
        .forEach(([campaignName,data]) => {

            const meta =
    campaignMeta[campaignName] || {};

const youtubeLink =
    meta.youtube || "";

        let previousE = 0;
        let previousC = 0;

        let totalMax = 0;

        const chapterRows = [];

        data.chapters.forEach(
            (chapter,chapterIndex) => {

            const ePoints =
                chapter.eCum -
                previousE;

            const cPoints =
                chapter.cCum -
                previousC;

            previousE =
                chapter.eCum;

            previousC =
                chapter.cCum;

            const maxPoints =
                chapter.maxPoints || 0;

            totalMax +=
                maxPoints;

            const diff =
                ePoints -
                cPoints;

            chapterRows.push(`

                <div class="chapter-row">

                    <img src="../0allgemein/Kampagnencover/${campaignIndex}_${chapterIndex + 1}.png">

                    <span>${chapter.chapter}</span>

                    <span>
                        ${maxPoints.toLocaleString("de-DE")}
                    </span>

                    <span class="eagles-score">
                        ${ePoints.toLocaleString("de-DE")}
                    </span>

                    <span class="chicks-score">
                        ${cPoints.toLocaleString("de-DE")}
                    </span>

                    <span class="${
                        diff >= 0
                        ? "diff-positive"
                        : "diff-negative"
                    }">
                        ${Math.abs(diff).toLocaleString("de-DE")}
                    </span>

                </div>

            `);

        });

        const campaignEagles =
            previousE;

        const campaignChicks =
            previousC;

        const campaignDiff =
            campaignEagles -
            campaignChicks;

        const eaglesProgress =
            totalMax > 0
            ? (campaignEagles / totalMax) * 100
            : 0;

        const chicksProgress =
            totalMax > 0
            ? (campaignChicks / totalMax) * 100
            : 0;

        container.insertAdjacentHTML(
            "beforeend",

            `

            <div class="campaign-card">

                <div
                    class="campaign-header"
                    onclick="toggleCampaign(this)">

                    <div class="campaign-left">

                        <img
                        src="../0allgemein/Kampagnencover/${campaignIndex}_0.png"
                        class="campaign-cover">

                        <div class="campaign-meta">

                            <h3>
                                ${campaignName}
                            </h3>

                            <span>
                                ${data.chapters.length} Maps
                            </span>

                        </div>

                    </div>

                    <div class="campaign-results">

    <div class="team-result">

        <div class="result-top">

            <span class="team-label blue">
                Team A
            </span>

            <span class="score-value blue">
                ${campaignEagles.toLocaleString("de-DE")}
            </span>

        </div>

        <div class="progress">

            <div
                class="progress-blue"
                style="width:${eaglesProgress}%">
            </div>

        </div>

    </div>

    <div class="team-result">

        <div class="result-top">

            <span class="team-label red">
                Team B
            </span>

            <span class="score-value red">
                ${campaignChicks.toLocaleString("de-DE")}
            </span>

        </div>

        <div class="progress">

            <div
                class="progress-red"
                style="width:${chicksProgress}%">
            </div>

        </div>

    </div>

    <div class="campaign-actions">

        ${
            youtubeLink
            ? `
            <a
                href="${youtubeLink}"
                target="_blank"
                class="campaign-video-btn"
                onclick="event.stopPropagation()">
                ▶
            </a>
            `
            : `
            <span class="campaign-video-pending">
            </span>
            `
        }

    </div>

</div>

                </div>

                <div class="campaign-body collapsed">

                    <div class="chapter-header">

                        <span></span>
                        <span>Kapitel</span>
                        <span>Max</span>
                        <span>Team A</span>
                        <span>Team B</span>
                        <span>Diff</span>

                    </div>

                    ${chapterRows.join("")}

                    <div class="campaign-total">

                        <span></span>

                        <span class="total-label">
                            Gesamt
                        </span>

                        <span>
                            ${totalMax.toLocaleString("de-DE")}
                        </span>

                        <span class="eagles-score">
                            ${campaignEagles.toLocaleString("de-DE")}
                        </span>

                        <span class="chicks-score">
                            ${campaignChicks.toLocaleString("de-DE")}
                        </span>

                        <span class="${
                            campaignDiff >= 0
                            ? "diff-positive"
                            : "diff-negative"
                        }">

                            ${Math.abs(campaignDiff).toLocaleString("de-DE")}

                        </span>

                    </div>

                </div>

            </div>

            `

        );

        campaignIndex++;

    });

}

/* ======================================
   FOOTER
====================================== */
function updateFooter() {

    const now =
        new Date();

    document
        .getElementById(
            "lastUpdate"
        )
        .textContent =
        "Letztes Update: "
        +
        now.toLocaleTimeString(
            "de-DE"
        );

}

/* ======================================
   TOGGLE KAMPAGNEN
====================================== */
function toggleCampaign(
    header
){

    const body =
        header.nextElementSibling;

    body.classList.toggle(
        "collapsed"
    );

}

/* ======================================
   INITIALISIERUNG
====================================== */
window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadScores();

    }
);
