// ==========================================================================
// KarmChakra — site data & interactions
// ==========================================================================

// Single source of truth for the six karma domains.
const KARMA_DOMAINS = [{
        id: "prakriti",
        name: "Prakriti Karma",
        subtitle: "Karma for Nature",
        action: "Tree Plantation Drive",
        points: 100,
        icon: "🌱",
        tone: "green",
        description: "Prakriti Karma honors every action taken to protect, restore or nurture the natural world — from planting trees to reducing waste in daily life."
    },
    {
        id: "jeeva",
        name: "Jeeva Karma",
        subtitle: "Karma for All Living Beings",
        action: "Street Animal Care",
        points: 90,
        icon: "🐾",
        tone: "teal",
        description: "Jeeva Karma recognizes compassion shown to animals and all living creatures who share our world."
    },
    {
        id: "suraksha",
        name: "Suraksha Karma",
        subtitle: "Karma of Protection",
        action: "Community Safety Watch",
        points: 110,
        icon: "🛡️",
        tone: "blue",
        description: "Suraksha Karma is earned by keeping others safe — from neighbourhood watch efforts to speaking up against harm."
    },
    {
        id: "samaj",
        name: "Samaj Karma",
        subtitle: "Karma for Society",
        action: "Clean Public Space",
        points: 80,
        icon: "🏛️",
        tone: "purple",
        description: "Samaj Karma rewards contributions to shared public life — clean spaces, civic participation, and community upkeep."
    },
    {
        id: "arogya",
        name: "Arogya Karma",
        subtitle: "Karma of Health & Life",
        action: "Blood Donation",
        points: 150,
        icon: "❤️",
        tone: "rose",
        description: "Arogya Karma honors actions that protect health and save lives, from blood donation to caring for the sick."
    },
    {
        id: "vidya",
        name: "Vidya Karma",
        subtitle: "Karma of Knowledge",
        action: "Teach an Underprivileged Child",
        points: 130,
        icon: "📚",
        tone: "indigo",
        description: "Vidya Karma celebrates the sharing of knowledge — teaching, mentoring, and opening doors through education."
    }
];

const COLLECTIVE_IMPACT = [
    { icon: "🌳", value: "126", label: "Trees Planted" },
    { icon: "🍲", value: "480", label: "Meals Served" },
    { icon: "🐕", value: "62", label: "Animals Helped" },
    { icon: "📖", value: "104", label: "Hours Taught" },
    { icon: "🌍", value: "2.4 t", label: "CO₂ Offset" },
    { icon: "✨", value: "1,320", label: "Lives Touched" }
];


// ==========================================================================
// DOM READY
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initOrbitWheel();
    initKarmaGrid();
    initImpactStats();
    initScrollReveal();
    initKarmaDetailPage();
});

// ==========================================================================
// NAVBAR
// ==========================================================================

function initNavbar() {
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");
    const navbarCollapse = document.querySelector(".navbar-collapse");
    const navbar = document.querySelector(".kc-navbar");

    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (
                window.innerWidth < 992 &&
                navbarCollapse &&
                navbarCollapse.classList.contains("show")
            ) {
                const toggle = document.querySelector(".navbar-toggler");

                if (toggle) {
                    toggle.click();
                }
            }
        });
    });

    if (navbar) {
        const onScroll = () => {
            navbar.classList.toggle(
                "kc-navbar--scrolled",
                window.scrollY > 12
            );
        };

        onScroll();

        window.addEventListener("scroll", onScroll, { passive: true });
    }

    const sections = [
        ...document.querySelectorAll("main[id], section[id]")
    ];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => {
                        link.classList.toggle(
                            "active",
                            link.getAttribute("href") === `#${entry.target.id}`
                        );
                    });
                }
            });
        }, {
            rootMargin: "-30% 0px -60% 0px",
            threshold: 0
        }
    );

    sections.forEach(section => observer.observe(section));
}

// ==========================================================================
// HERO ORBIT
// ==========================================================================

function initOrbitWheel() {
    const track = document.querySelector("[data-orbit-track]");

    if (!track) return;

    const badges = KARMA_DOMAINS.map((domain, index) => {
        const badge = document.createElement("a");

        badge.href = `karma.html?domain=${domain.id}`;
        badge.className = `orbit-badge tone-${domain.tone}`;
        badge.style.setProperty("--i", index);

        badge.setAttribute(
            "aria-label",
            `${domain.name} — open karma details`
        );

        badge.innerHTML = `
            <span class="orbit-badge-circle">
                ${domain.icon}
            </span>

            <span class="orbit-badge-label">
                ${domain.name}
            </span>
        `;

        return badge;
    });

    track.append(...badges);
}

// ==========================================================================
// HOMEPAGE KARMA GRID
// ==========================================================================

function initKarmaGrid() {
    const grid = document.querySelector("[data-karma-grid]");

    if (!grid) return;

    grid.innerHTML = KARMA_DOMAINS.map(domain => `
        <a
            class="karma-card"
            href="karma.html?domain=${domain.id}"
        >
            <span class="karma-card-icon tone-${domain.tone}">
                ${domain.icon}
            </span>

            <h3 class="karma-card-title">
                ${domain.name}
            </h3>

            <p class="karma-card-subtitle">
                ${domain.subtitle}
            </p>

            <p class="karma-card-action">
                ${domain.action} · +${domain.points} Mudrā
            </p>
        </a>
    `).join("");
}

// ==========================================================================
// COLLECTIVE IMPACT
// ==========================================================================

function initImpactStats() {
    const row = document.querySelector("[data-impact-stats]");

    if (!row) return;

    row.innerHTML = COLLECTIVE_IMPACT.map(stat => `
        <div class="impact-stat">

            <span class="impact-stat-icon">
                ${stat.icon}
            </span>

            <div class="impact-stat-value">
                ${stat.value}
            </div>

            <div class="impact-stat-label">
                ${stat.label}
            </div>

        </div>
    `).join("");
}

// ==========================================================================
// SCROLL REVEAL
// ==========================================================================

function initScrollReveal() {
    const revealEls = document.querySelectorAll("[data-reveal]");

    if (!revealEls.length) return;

    if (!("IntersectionObserver" in window)) {
        revealEls.forEach(el => {
            el.classList.add("is-visible");
        });

        return;
    }

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 }
    );

    revealEls.forEach(el => {
        observer.observe(el);
    });
}

// ==========================================================================
// KARMA DETAIL PAGE
// All karma pages use this one template, so every karma looks the same.
// ==========================================================================

function initKarmaDetailPage() {
    const root = document.querySelector("[data-karma-detail]");

    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const domain =
        KARMA_DOMAINS.find(d => d.id === params.get("domain")) ||
        KARMA_DOMAINS[0];

    document.title = `${domain.name} — KarmChakra`;

    root.innerHTML = `

        <span class="karma-detail-icon tone-${domain.tone}">
            ${domain.icon}
        </span>

        <span class="section-kicker">
            ${domain.subtitle.toUpperCase()}
        </span>

        <h1>
            ${domain.name}
        </h1>

        <p class="karma-detail-description">
            ${domain.description}
        </p>

        <div class="karma-detail-action">

            <span class="karma-detail-action-label">
                Featured Karma
            </span>

            <span class="karma-detail-action-value">
                ${domain.action}
            </span>

            <span class="karma-detail-action-points">
                +${domain.points} Mudrā
            </span>

        </div>

        <div class="hero-actions karma-detail-ctas">

            <a
                href="${
                    domain.id === "jeeva"
                    ? "jeeva.html"
                    : domain.id === "samaj"
                    ? "samaj.html"
                    : domain.id === "suraksha"
                    ? "suraksha.html"
                    : domain.id === "vidya"
                    ? "vidya.html"
                    : domain.id === "arogya"
                    ? "arogya.html"
                    : "plant-tree.html"
                }"
                class="btn kc-primary-btn"
            >
                Log This Karma
            </a>

        </div>
    `;

    const others = document.querySelector("[data-karma-others]");

    if (others) {
        others.innerHTML =
            KARMA_DOMAINS
            .filter(d => d.id !== domain.id)
            .map(d => `

                    <a
                        class="karma-card karma-card--compact"
                        href="karma.html?domain=${d.id}"
                    >

                        <span class="karma-card-icon tone-${d.tone}">
                            ${d.icon}
                        </span>

                        <h3 class="karma-card-title">
                            ${d.name}
                        </h3>

                    </a>

                `)
            .join("");
    }
}