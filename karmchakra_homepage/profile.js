const API_BASE_URL = "http://127.0.0.1:8000";
const $ = (id) => document.getElementById(id);

let toastTimer;

const defaultDomains = [
    { name: "Prakriti Karma", icon: "🌱", pts: 0, goal: 1000 },
    { name: "Seva Karma", icon: "🤝", pts: 0, goal: 1000 },
    { name: "Jeeva Karma", icon: "🐾", pts: 0, goal: 1000 },
    { name: "Samaj Karma", icon: "🏛️", pts: 0, goal: 1000 },
    { name: "Arogya Karma", icon: "❤️", pts: 0, goal: 1000 },
    { name: "Vidya Karma", icon: "📚", pts: 0, goal: 1000 }
];

let profile = {
    name: "KarmaChakra Member",
    email: "",
    phone: "",
    bio: "Doing one good deed at a time.",
    level: 1,
    levelTitle: "Karma Yogi",
    mudra: 0,
    verified: 0,
    streak: 0,
    rank: 0,
    domains: defaultDomains.map(item => ({...item })),
    activity: [],
    badges: []
};

function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function getSavedUser() {
    try {
        return JSON.parse(
            localStorage.getItem("user") ||
            sessionStorage.getItem("user") ||
            "{}"
        );
    } catch {
        return {};
    }
}

function showToast(message) {
    const toast = $("toast");

    if (!toast) {
        console.log(message);
        return;
    }

    toast.textContent = message;
    toast.hidden = false;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.hidden = true;
    }, 3500);
}

async function apiRequest(url, options = {}) {
    const headers = {...(options.headers || {}) };
    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        let message = result.detail || result.message || `Request failed: ${response.status}`;

        if (Array.isArray(message)) {
            message = message.map(item => item.msg || "Invalid input").join(", ");
        }

        throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }

    return result;
}

function animateNumber(element, value, prefix = "") {
    if (!element) return;

    const number = Math.max(0, Number(value) || 0);
    const duration = 500;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const current = Math.round(number * progress);

        element.textContent = prefix + current.toLocaleString("en-IN");

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function renderDomains() {
    const container = $("domains");
    if (!container) return;

    container.replaceChildren();

    profile.domains.forEach(domain => {
        const wrapper = document.createElement("div");
        wrapper.className = "dom";

        const header = document.createElement("div");
        header.className = "dom-top";

        const name = document.createElement("span");
        name.textContent = `${domain.icon} ${domain.name}`;

        const points = document.createElement("span");
        points.textContent = `${Number(domain.pts || 0).toLocaleString("en-IN")} Mudrā`;

        header.append(name, points);

        const bar = document.createElement("div");
        bar.className = "dom-bar";

        const fill = document.createElement("i");
        const goal = Math.max(1, Number(domain.goal) || 1000);
        fill.style.width = `${Math.min(100, Number(domain.pts || 0) / goal * 100)}%`;

        bar.appendChild(fill);
        wrapper.append(header, bar);
        container.appendChild(wrapper);
    });
}

function renderActivity() {
    const container = $("activity");
    if (!container) return;

    container.replaceChildren();

    if (!profile.activity.length) {
        const item = document.createElement("li");
        item.textContent = "No recent activity yet. Complete a karma to start your journey!";
        container.appendChild(item);
        return;
    }

    profile.activity.forEach(activity => {
        const item = document.createElement("li");

        const icon = document.createElement("div");
        icon.className = "act-ico";
        icon.textContent = activity.icon || "✨";

        const info = document.createElement("div");
        info.className = "act-info";

        const title = document.createElement("span");
        title.textContent = activity.title || "Karma Activity";

        const date = document.createElement("small");
        date.textContent = activity.when || "";

        info.append(title, date);

        const points = document.createElement("div");
        points.className = "act-pts";
        points.textContent = `+${Number(activity.pts || 0)} Mudrā`;

        item.append(icon, info, points);
        container.appendChild(item);
    });
}

function renderBadges() {
    const container = $("badges");
    if (!container) return;

    container.replaceChildren();

    if (!profile.badges.length) {
        const message = document.createElement("p");
        message.textContent = "Your earned badges will appear here.";
        container.appendChild(message);
        return;
    }

    profile.badges.forEach(badge => {
        const item = document.createElement("div");
        item.className = `badge-item ${badge.earned ? "" : "locked"}`;

        const icon = document.createElement("span");
        icon.className = "ico";
        icon.textContent = badge.icon || "🏅";

        const name = document.createElement("b");
        name.textContent = badge.name || "Karma Badge";

        const note = document.createElement("small");
        note.textContent = badge.note || "";

        item.append(icon, name, note);
        container.appendChild(item);
    });
}

function renderProfile() {
    if ($("pName")) {
        $("pName").textContent = profile.name;
    }

    if ($("pBio")) {
        $("pBio").textContent = profile.bio;
    }

    if ($("pLevel")) {
        $("pLevel").textContent = `${profile.levelTitle}, Level ${profile.level}`;
    }

    if ($("avatarInitial")) {
        $("avatarInitial").textContent = (profile.name.trim()[0] || "K").toUpperCase();
    }

    animateNumber($("mudraTotal"), profile.mudra);
    animateNumber(document.querySelector('[data-stat="verified"]'), profile.verified);
    animateNumber(document.querySelector('[data-stat="streak"]'), profile.streak);
    animateNumber(
        document.querySelector('[data-stat="badges"]'),
        profile.badges.filter(badge => badge.earned).length
    );
    animateNumber(document.querySelector('[data-stat="rank"]'), profile.rank, "#");

    const progress = Math.max(0, Math.min(100, profile.mudra % 1000 / 10));

    if ($("levelBar")) {
        $("levelBar").style.width = `${progress}%`;
    }

    if ($("levelNote")) {
        $("levelNote").textContent = `${1000 - profile.mudra % 1000} Mudrā to the next level`;
    }

    if ($("ringFill")) {
        $("ringFill").style.strokeDasharray = "339.3";
        $("ringFill").style.strokeDashoffset = String(339.3 * (1 - progress / 100));
    }

    renderDomains();
    renderActivity();
    renderBadges();
}

function applyUser(user) {
    if (!user || typeof user !== "object") return;

    profile.name = user.full_name || user.name || profile.name;
    profile.email = user.email || profile.email;
    profile.phone = user.phone || profile.phone;
    profile.bio = user.bio || profile.bio;
    profile.level = Number(user.level || profile.level);
    profile.levelTitle = user.level_title || user.levelTitle || profile.levelTitle;
    profile.mudra = Number(user.mudra ?? user.total_karma_points ?? profile.mudra);
    profile.verified = Number(user.verified ?? user.verified_count ?? profile.verified);
    profile.streak = Number(user.streak ?? profile.streak);
    profile.rank = Number(user.rank ?? profile.rank);

    if (Array.isArray(user.domains)) {
        profile.domains = user.domains.map(item => ({
            name: item.name || "Karma",
            icon: item.icon || "✨",
            pts: Number(item.pts ?? item.points ?? 0),
            goal: Number(item.goal || 1000)
        }));
    }

    if (Array.isArray(user.activity)) {
        profile.activity = user.activity.map(item => ({
            icon: item.icon || "✨",
            title: item.title || item.activity_type || "Karma Activity",
            when: item.when || item.created_at || "",
            pts: Number(item.pts ?? item.karma_points ?? 0)
        }));
    }

    if (Array.isArray(user.badges)) {
        profile.badges = user.badges.map(item => ({
            icon: item.icon || "🏅",
            name: item.name || "Karma Badge",
            note: item.note || "",
            earned: Boolean(item.earned)
        }));
    }
}

function loadProfilePhoto() {
    const savedPhoto = localStorage.getItem("profilePhoto");

    if (savedPhoto && $("avatar")) {
        $("avatar").style.backgroundImage = `url("${savedPhoto}")`;
        $("avatar").classList.add("has-photo");
    }
}

$("photoInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image.");
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast("Please select an image smaller than 2 MB.");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        if ($("avatar")) {
            $("avatar").style.backgroundImage = `url("${reader.result}")`;
            $("avatar").classList.add("has-photo");
        }

        try {
            localStorage.setItem("profilePhoto", reader.result);
            showToast("Profile photo updated.");
        } catch {
            showToast("Photo updated for this session.");
        }
    };

    reader.readAsDataURL(file);
});

const dialog = $("editDialog");

function setFieldError(input, message) {
    if (!input) return !message;

    const field = input.closest(".field");
    const error = field?.querySelector(".error");

    if (error) error.textContent = message || "";
    field?.classList.toggle("invalid", Boolean(message));

    return !message;
}

function validateEditForm() {
    const name = $("fName")?.value.trim() || "";
    const email = $("fEmail")?.value.trim() || "";
    const phone = $("fPhone")?.value.trim() || "";

    const nameValid = setFieldError(
        $("fName"),
        /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(name) ? "" : "Enter a valid full name."
    );

    const emailValid = setFieldError(
        $("fEmail"),
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? "" : "Enter a valid email address."
    );

    const phoneValid = setFieldError(
        $("fPhone"), !phone || /^[6-9]\d{9}$/.test(phone) ? "" : "Enter a valid 10-digit mobile number."
    );

    return nameValid && emailValid && phoneValid;
}

$("editBtn")?.addEventListener("click", () => {
    if (!dialog) return;

    $("fName").value = profile.name === "KarmaChakra Member" ? "" : profile.name;
    $("fEmail").value = profile.email;
    $("fPhone").value = profile.phone;
    $("fBio").value = profile.bio;

    if ($("bioCount")) {
        $("bioCount").textContent = `${$("fBio").value.length}/120`;
    }

    dialog.showModal();
});

$("cancelBtn")?.addEventListener("click", () => dialog?.close());

$("fBio")?.addEventListener("input", () => {
    if ($("bioCount")) {
        $("bioCount").textContent = `${$("fBio").value.length}/120`;
    }
});

$("fPhone")?.addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
});

$("editForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!validateEditForm()) return;

    const updated = {
        full_name: $("fName").value.trim(),
        email: $("fEmail").value.trim(),
        phone: $("fPhone").value.trim(),
        bio: $("fBio").value.trim()
    };

    const button = $("editForm").querySelector('[type="submit"]');
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const result = await apiRequest(`${API_BASE_URL}/api/auth/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
        });

        applyUser(result.profile || result.user || result);
        profile.name = updated.full_name;
        profile.email = updated.email;
        profile.phone = updated.phone;
        profile.bio = updated.bio || "Doing one good deed at a time.";

        const user = {
            ...getSavedUser(),
            ...updated,
            name: updated.full_name
        };

        const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(user));

        renderProfile();
        dialog.close();
        showToast("Profile updated successfully.");
    } catch (error) {
        console.error("Profile update failed:", error);
        showToast(`Could not save profile: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Save changes";
    }
});

$("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    window.location.href = "login.html";
});

async function loadProfileFromAPI() {
    const token = getToken();

    if (!token) {
        showToast("You are not logged in. Please log in to view your profile.");
        return;
    }

    try {
        const result = await apiRequest(`${API_BASE_URL}/api/auth/me`, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        applyUser(result.profile || result.user || result);
        renderProfile();
    } catch (error) {
        console.error("Could not load profile from API:", error);
        showToast(`Profile loaded from saved details. API: ${error.message}`);
    }
}

async function initProfile() {
    try {
        applyUser(getSavedUser());
        loadProfilePhoto();
        renderProfile();
        await loadProfileFromAPI();
    } catch (error) {
        console.error("Profile initialization error:", error);
        renderProfile();
    }
}

document.addEventListener("DOMContentLoaded", initProfile);
