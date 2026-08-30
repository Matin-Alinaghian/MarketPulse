const chartAssetName =
    document.getElementById("chartAssetName");

const chartCurrentPrice =
    document.getElementById("chartCurrentPrice");

const chartChange =
    document.getElementById("chartChange");

const chartLoading =
    document.getElementById("chartLoading");

const refreshBtn =
    document.querySelector(".refresh-btn");

const updateTime =
    document.getElementById("update-time");

const dollarPrice =
    document.getElementById("dollar-price");

const euroPrice =
    document.getElementById("euro-price");

const goldPrice =
    document.getElementById("gold-price");

const coinPrice =
    document.getElementById("coin-price");

const assetSelect =
    document.getElementById("assetSelect");

const compareFirst =
    document.getElementById("compareFirst");

const compareSecond =
    document.getElementById("compareSecond");

const compareName1 =
    document.getElementById("compareName1");

const compareName2 =
    document.getElementById("compareName2");

const comparePrice1 =
    document.getElementById("comparePrice1");

const comparePrice2 =
    document.getElementById("comparePrice2");

const compareChange1 =
    document.getElementById("compareChange1");

const compareChange2 =
    document.getElementById("compareChange2");

const compareWinner =
    document.getElementById("compareWinner");

const marketTableBody =
    document.getElementById("marketTableBody");

let currentPrices = [];

let priceChart = null;

let comparisonChart = null;

const assetNames = {

    USD_RLS: "دلار",

    EUR_RLS: "یورو",

    GOLD_18_RLS: "طلای ۱۸ عیار",

    SEKKEH_RLS: "سکه امامی"

};

function getAssetColor(asset) {

    const colors = {

        USD_RLS: {
            line: "#22c55e",
            fill: "rgba(34, 197, 94, 0.20)",
            glow: "rgba(34, 197, 94, 0.35)"
        },

        EUR_RLS: {
            line: "#38bdf8",
            fill: "rgba(56, 189, 248, 0.20)",
            glow: "rgba(56, 189, 248, 0.35)"
        },

        GOLD_18_RLS: {
            line: "#facc15",
            fill: "rgba(250, 204, 21, 0.20)",
            glow: "rgba(250, 204, 21, 0.35)"
        },

        SEKKEH_RLS: {
            line: "#f43f5e",
            fill: "rgba(244, 63, 94, 0.20)",
            glow: "rgba(244, 63, 94, 0.35)"
        }

    };

    return colors[asset] || colors.USD_RLS;

}

function toEnglishNumbers(value) {

    return String(value)
        .replace(/[۰-۹]/g, digit =>
            "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)
        );

}

function rialToToman(price) {

    return Number(price) / 10;

}

function formatPrice(price) {

    return new Intl.NumberFormat("en-US")
        .format(Math.round(price));

}

function convertTime(time) {

    const date =
        new Date(time);

    return toEnglishNumbers(
        date.toLocaleTimeString(
            "fa-IR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )
    );

}

function formatChartDate(time, period) {

    const date =
        new Date(time);

    if (period === "day") {

        return toEnglishNumbers(
            date.toLocaleTimeString(
                "fa-IR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        );

    }

    return toEnglishNumbers(
        date.toLocaleDateString(
            "fa-IR",
            {
                month: "short",
                day: "numeric"
            }
        )
    );

}

async function getPrices() {

    const response =
        await fetch("/prices");

    if (!response.ok) {

        throw new Error(
            `Prices API error: ${response.status}`
        );

    }

    const data =
        await response.json();

    currentPrices = data;

    const dollar =
        data.find(
            item => item.code === "USD_RLS"
        );

    const euro =
        data.find(
            item => item.code === "EUR_RLS"
        );

    const gold =
        data.find(
            item => item.code === "GOLD_18_RLS"
        );

    const coin =
        data.find(
            item => item.code === "SEKKEH_RLS"
        );

    if (dollar) {

        dollarPrice.textContent =
            formatPrice(
                rialToToman(dollar.value)
            );

    }

    if (euro) {

        euroPrice.textContent =
            formatPrice(
                rialToToman(euro.value)
            );

    }

    if (gold) {

        goldPrice.textContent =
            formatPrice(
                rialToToman(gold.value)
            );

    }

    if (coin) {

        coinPrice.textContent =
            formatPrice(
                rialToToman(coin.value)
            );

    }

    updateTime.textContent =
        toEnglishNumbers(
            new Date().toLocaleTimeString(
                "fa-IR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            )
        );

}

function updateCardChangeValue(
    cardSelector,
    change
) {

    const card =
        document.querySelector(cardSelector);

    if (!card) {
        return;
    }

    const changeElement =
        card.querySelector(".change");

    if (!changeElement) {
        return;
    }

    change = Number(change);

    if (!Number.isFinite(change)) {
        change = 0;
    }

    changeElement.textContent =
        `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    changeElement.classList.remove(
        "positive",
        "negative"
    );

    changeElement.classList.add(
        change >= 0
            ? "positive"
            : "negative"
    );

}

function updatePriceCards(data) {

    data.forEach(item => {

        const change =
            Number(item.changePercent);

        if (item.code === "USD_RLS") {

            updateCardChangeValue(
                ".dollar-card",
                change
            );

        }

        if (item.code === "EUR_RLS") {

            updateCardChangeValue(
                ".euro-card",
                change
            );

        }

        if (item.code === "GOLD_18_RLS") {

            updateCardChangeValue(
                ".gold-card",
                change
            );

        }

        if (item.code === "SEKKEH_RLS") {

            updateCardChangeValue(
                ".coin-card",
                change
            );

        }

    });

}

async function loadChart(
    asset = "USD_RLS",
    period = "day"
) {

    try {

        if (chartLoading) {

            chartLoading.classList.add("show");

        }

        const response =
            await fetch(
                `/history?asset=${asset}&period=${period}`
            );

        if (!response.ok) {

            throw new Error(
                `History API error: ${response.status}`
            );

        }

        const data =
            await response.json();

        if (
            !Array.isArray(data) ||
            data.length < 2
        ) {

            throw new Error(
                "اطلاعات کافی برای نمودار وجود ندارد"
            );

        }

        createChart(
            data,
            asset,
            period
        );

    }

    catch (error) {

        console.error(
            "Chart error:",
            error
        );

    }

    finally {

        if (chartLoading) {

            chartLoading.classList.remove("show");

        }

    }

}

function createChart(
    data,
    asset,
    period
) {

    const canvas =
        document.getElementById(
            "priceChart"
        );

    if (!canvas) {
        return;
    }

    if (priceChart) {

        priceChart.destroy();

    }

    const values =
        data.map(item =>
            rialToToman(
                Number(item.value)
            )
        );

    const labels =
        data.map(item =>
            formatChartDate(
                item.businessTime,
                period
            )
        );

    const firstValue =
        values[0];

    const lastValue =
        values[
            values.length - 1
        ];

    const change =
        firstValue !== 0
            ? (
                (
                    lastValue -
                    firstValue
                ) /
                firstValue
            ) * 100
            : 0;

    chartAssetName.textContent =
        assetNames[asset];

    chartCurrentPrice.textContent =
        formatPrice(lastValue);

    chartChange.textContent =
        `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    chartChange.classList.remove(
        "positive",
        "negative"
    );

    chartChange.classList.add(
        change >= 0
            ? "positive"
            : "negative"
    );

    const assetColor =
        getAssetColor(asset);

    const ctx =
        canvas.getContext("2d");

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            380
        );

    gradient.addColorStop(
        0,
        assetColor.fill
    );

    gradient.addColorStop(
        1,
        "rgba(2, 6, 23, 0)"
    );

    priceChart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                assetNames[asset],

                            data: values,

                            borderWidth: 3,

                            borderColor:
                                assetColor.line,

                            backgroundColor:
                                gradient,

                            fill: true,

                            tension: 0.45,

                            cubicInterpolationMode:
                                "monotone",

                            pointRadius: 0,

                            pointHoverRadius: 7,

                            pointHoverBackgroundColor:
                                "#020617",

                            pointHoverBorderColor:
                                assetColor.line,

                            pointHoverBorderWidth: 3,

                            borderCapStyle:
                                "round",

                            borderJoinStyle:
                                "round"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    animation: {

                        duration: 900,

                        easing: "easeOutQuart"

                    },

                    plugins: {

                        legend: {

                            display: false

                        },

                        tooltip: {

                            backgroundColor:
                                "rgba(15, 23, 42, 0.95)",

                            borderColor:
                                assetColor.line,

                            borderWidth: 1,

                            padding: 13,

                            displayColors: false,

                            titleColor:
                                "#e2e8f0",

                            bodyColor:
                                "#f8fafc",

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            formatPrice(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                display: false

                            },

                            ticks: {

                                color:
                                    "#94a3b8",

                                maxTicksLimit:
                                    7,

                                font: {

                                    size: 11

                                }

                            }

                        },

                        y: {

                            border: {

                                display: false

                            },

                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.07)",

                                drawTicks: false

                            },

                            ticks: {

                                color:
                                    "#94a3b8",

                                padding: 10,

                                font: {

                                    size: 11

                                },

                                callback:
                                    function(value) {

                                        return formatPrice(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}

async function updateMarketTable() {

    try {

        const response =
            await fetch(
                "/market-summary"
            );

        if (!response.ok) {

            throw new Error(
                `Market API error: ${response.status}`
            );

        }

        const data =
            await response.json();

        marketTableBody.innerHTML = "";

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            marketTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-table"
                    >
                        اطلاعاتی برای نمایش وجود ندارد
                    </td>

                </tr>

            `;

            return;

        }

        data.forEach(item => {

            const current =
                Number(item.current);

            const change =
                Number(item.changePercent);

            const safeChange =
                Number.isFinite(change)
                    ? change
                    : 0;

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${assetNames[item.code]}
                </td>

                <td>

                    ${formatPrice(
                        rialToToman(current)
                    )}

                </td>

                <td>

                    <span class="${
                        safeChange >= 0
                            ? "positive"
                            : "negative"
                    }">

                        ${
                            safeChange >= 0
                                ? "+"
                                : ""
                        }

                        ${safeChange.toFixed(2)}%

                    </span>

                </td>

                <td>

                    ${formatPrice(
                        rialToToman(item.low)
                    )}

                </td>

                <td>

                    ${formatPrice(
                        rialToToman(item.high)
                    )}

                </td>

                <td>

                    ${convertTime(
                        item.businessTime
                    )}

                </td>

            `;

            marketTableBody.appendChild(
                row
            );

        });

    }

    catch (error) {

        console.error(
            "Market table error:",
            error
        );

    }

}

async function updateComparison() {

    const asset1 =
        compareFirst.value;

    const asset2 =
        compareSecond.value;

    const activePeriod =
        document.querySelector(
            ".period-buttons button.active"
        );

    const period =
        activePeriod
            ? activePeriod.dataset.period
            : "day";

    try {

        const [
            response1,
            response2
        ] = await Promise.all([

            fetch(
                `/history?asset=${asset1}&period=${period}`
            ),

            fetch(
                `/history?asset=${asset2}&period=${period}`
            )

        ]);

        if (
            !response1.ok ||
            !response2.ok
        ) {

            throw new Error(
                "Comparison API error"
            );

        }

        const data1 =
            await response1.json();

        const data2 =
            await response2.json();

        calculateComparison(
            data1,
            data2,
            asset1,
            asset2
        );

    }

    catch (error) {

        console.error(
            "Comparison error:",
            error
        );

    }

}

function calculateComparison(
    data1,
    data2,
    asset1,
    asset2
) {

    if (
        !Array.isArray(data1) ||
        !Array.isArray(data2) ||
        data1.length < 2 ||
        data2.length < 2
    ) {

        return;

    }

    const first1 =
        Number(data1[0].value);

    const last1 =
        Number(
            data1[
                data1.length - 1
            ].value
        );

    const first2 =
        Number(data2[0].value);

    const last2 =
        Number(
            data2[
                data2.length - 1
            ].value
        );

    const change1 =
        first1 !== 0
            ? (
                (
                    last1 -
                    first1
                ) /
                first1
            ) * 100
            : 0;

    const change2 =
        first2 !== 0
            ? (
                (
                    last2 -
                    first2
                ) /
                first2
            ) * 100
            : 0;

    compareName1.textContent =
        assetNames[asset1];

    compareName2.textContent =
        assetNames[asset2];

    comparePrice1.textContent =
        formatPrice(
            rialToToman(last1)
        );

    comparePrice2.textContent =
        formatPrice(
            rialToToman(last2)
        );

    setComparisonChange(
        compareChange1,
        change1
    );

    setComparisonChange(
        compareChange2,
        change2
    );

    if (change1 > change2) {

        compareWinner.textContent =
            `${assetNames[asset1]} عملکرد بهتری داشته است`;

    }

    else if (change2 > change1) {

        compareWinner.textContent =
            `${assetNames[asset2]} عملکرد بهتری داشته است`;

    }

    else {

        compareWinner.textContent =
            "عملکرد هر دو دارایی برابر بوده است";

    }

    createComparisonChart(
        data1,
        data2,
        asset1,
        asset2
    );

}

function setComparisonChange(
    element,
    change
) {

    element.textContent =
        `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    element.classList.remove(
        "positive",
        "negative"
    );

    element.classList.add(
        change >= 0
            ? "positive"
            : "negative"
    );

}

function createComparisonChart(
    data1,
    data2,
    asset1,
    asset2
) {

    const canvas =
        document.getElementById(
            "comparisonChart"
        );

    if (!canvas) {

        return;

    }

    if (comparisonChart) {

        comparisonChart.destroy();

    }

    const firstValue1 =
        Number(data1[0].value);

    const firstValue2 =
        Number(data2[0].value);

    const activePeriod =
        document.querySelector(
            ".period-buttons button.active"
        );

    const period =
        activePeriod
            ? activePeriod.dataset.period
            : "day";

    const labels =
        data1.map(item => {

            return formatChartDate(
                item.businessTime,
                period
            );

        });

    const values1 =
        data1.map(item => {

            return (
                (
                    Number(item.value) /
                    firstValue1
                ) - 1
            ) * 100;

        });

    const values2 =
        data2.map(item => {

            return (
                (
                    Number(item.value) /
                    firstValue2
                ) - 1
            ) * 100;

        });

    const color1 =
        getAssetColor(asset1);

    const color2 =
        getAssetColor(asset2);

    const ctx =
        canvas.getContext("2d");

    comparisonChart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                assetNames[asset1],

                            data: values1,

                            borderWidth: 3,

                            borderColor:
                                color1.line,

                            backgroundColor:
                                color1.fill,

                            tension: 0.4,

                            cubicInterpolationMode:
                                "monotone",

                            pointRadius: 0,

                            pointHoverRadius: 6,

                            pointHoverBorderColor:
                                color1.line,

                            pointHoverBackgroundColor:
                                "#020617",

                            fill: false,

                            borderCapStyle:
                                "round",

                            borderJoinStyle:
                                "round"

                        },

                        {

                            label:
                                assetNames[asset2],

                            data: values2,

                            borderWidth: 3,

                            borderColor:
                                color2.line,

                            backgroundColor:
                                color2.fill,

                            tension: 0.4,

                            cubicInterpolationMode:
                                "monotone",

                            pointRadius: 0,

                            pointHoverRadius: 6,

                            pointHoverBorderColor:
                                color2.line,

                            pointHoverBackgroundColor:
                                "#020617",

                            fill: false,

                            borderCapStyle:
                                "round",

                            borderJoinStyle:
                                "round"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    animation: {

                        duration: 900,

                        easing: "easeOutQuart"

                    },

                    plugins: {

                        legend: {

                            display: true,

                            position: "top",

                            labels: {

                                color:
                                    "#cbd5e1",

                                usePointStyle:
                                    true,

                                padding: 20

                            }

                        },

                        tooltip: {

                            backgroundColor:
                                "#0f172a",

                            borderColor:
                                "rgba(148, 163, 184, 0.2)",

                            borderWidth: 1,

                            padding: 12,

                            callbacks: {

                                label:
                                    function(context) {

                                        const value =
                                            context.raw;

                                        return (
                                            context.dataset.label +
                                            ": " +
                                            (
                                                value >= 0
                                                    ? "+"
                                                    : ""
                                            ) +
                                            value.toFixed(2) +
                                            "%"
                                        );

                                    }

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                display: false

                            },

                            ticks: {

                                color:
                                    "#94a3b8",

                                maxTicksLimit:
                                    7,

                                font: {

                                    size: 11

                                }

                            }

                        },

                        y: {

                            grid: {

                                color:
                                    "rgba(148, 163, 184, 0.08)"

                            },

                            ticks: {

                                color:
                                    "#94a3b8",

                                font: {

                                    size: 11

                                },

                                callback:
                                    function(value) {

                                        return (
                                            value.toFixed(1) +
                                            "%"
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );

}

assetSelect.addEventListener(
    "change",
    function() {

        const asset =
            this.value;

        const activePeriod =
            document.querySelector(
                ".period-buttons button.active"
            );

        const period =
            activePeriod
                ? activePeriod.dataset.period
                : "day";

        loadChart(
            asset,
            period
        );

    }
);

const periodButtons =
    document.querySelectorAll(
        ".period-buttons button"
    );

periodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                periodButtons.forEach(
                    btn => {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );

                this.classList.add(
                    "active"
                );

                const period =
                    this.dataset.period;

                const asset =
                    assetSelect.value;

                loadChart(
                    asset,
                    period
                );

                updateComparison();

            }
        );

    }
);

compareFirst.addEventListener(
    "change",
    updateComparison
);

compareSecond.addEventListener(
    "change",
    updateComparison
);

function animateUpdatedCards() {

    const cards =
        document.querySelectorAll(
            ".price-card"
        );

    cards.forEach(card => {

        card.classList.remove(
            "price-updated"
        );

        void card.offsetWidth;

        card.classList.add(
            "price-updated"
        );

    });

}

function showMarketError(
    message
) {

    let errorBox =
        document.querySelector(
            ".market-error"
        );

    if (!errorBox) {

        errorBox =
            document.createElement(
                "div"
            );

        errorBox.className =
            "market-error";

        document
            .querySelector("main")
            .prepend(errorBox);

    }

    errorBox.textContent =
        message;

    setTimeout(
        () => {

            if (errorBox) {

                errorBox.remove();

            }

        },
        5000
    );

}

async function refreshMarket() {

    try {

        refreshBtn.disabled = true;

        refreshBtn.textContent =
            "↻ در حال بروزرسانی...";

        const response =
            await fetch(
                "/refresh",
                {
                    method: "POST"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Refresh API error"
            );

        }

        const result =
            await response.json();

        if (!result.success) {

            throw new Error(
                result.error ||
                "بروزرسانی انجام نشد"
            );

        }

        await getPrices();

        await updateMarketTable();

        await updateComparison();

        const activePeriod =
            document.querySelector(
                ".period-buttons button.active"
            );

        const period =
            activePeriod
                ? activePeriod.dataset.period
                : "day";

        await loadChart(
            assetSelect.value,
            period
        );

        const summaryResponse =
            await fetch("/market-summary");

        if (summaryResponse.ok) {

            const summary =
                await summaryResponse.json();

            updatePriceCards(summary);

        }

        animateUpdatedCards();

    }

    catch (error) {

        console.error(
            "Refresh error:",
            error
        );

        showMarketError(
            "دریافت اطلاعات بازار با مشکل مواجه شد."
        );

    }

    finally {

        refreshBtn.disabled = false;

        refreshBtn.textContent =
            "↻ بروزرسانی";

    }

}

refreshBtn.addEventListener(
    "click",
    refreshMarket
);

const defaultPeriodButton =
    document.querySelector(
        '.period-buttons button[data-period="day"]'
    );

if (defaultPeriodButton) {

    periodButtons.forEach(
        btn =>
            btn.classList.remove("active")
    );

    defaultPeriodButton.classList.add(
        "active"
    );

}

async function loadCachedMarket() {

    try {

        await getPrices();

        const response =
            await fetch("/market-summary");

        if (!response.ok) {

            throw new Error(
                `Market Summary API error: ${response.status}`
            );

        }

        const summary =
            await response.json();

        updatePriceCards(summary);

        await updateMarketTable();

        await updateComparison();

        await loadChart(
            assetSelect.value,
            "day"
        );

    }

    catch (error) {

        console.error(
            "Initial cache load error:",
            error
        );

        showMarketError(
            "دریافت اطلاعات ذخیره‌شده بازار با مشکل مواجه شد."
        );

    }

}

loadCachedMarket();