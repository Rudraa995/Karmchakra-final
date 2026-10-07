const API_BASE_URL = "http://127.0.0.1:8000";
const PROFILE_API = `${API_BASE_URL}/api/auth/me`;
const PROFILE_UPDATE_API = `${API_BASE_URL}/api/auth/profile`;
const REQUIRE_LOGIN = true;

const $ = (id) => document.getElementById(id);

let data = {
    name: "",
    email: "",
    phone: "",
    bio: "Doing one good deed at a time.",
    level: 1,
    levelTitle: "Karma Beginner",
    mudra: 0,
    nextLevelAt: 1000,
    prevLevelAt: 0,
    verified: 0,
    streak: 0,
    rank: 0,
    domains: [
        { name: "Prakriti Karma", icon: "🌱", pts: 0, goal: 1000 },
        { name: "Seva Karma", icon: "🤝", pts: 0, goal: 1000 },
        { name: "Jeeva Karma", icon: "🐾", pts: 0, goal: 1000 },
        { name: "Samaj Karma", icon: "🏛️", pts: 0, goal: 1000 },
        { name: "Arogya Karma", icon: "❤️", pts: 0, goal: 1000 },
        { name: "Vidya Karma", icon: "📚", pts: 0, goal: 1000 }
    ],
    activity: [],
    badges: []
};

function readStore(key) {
    try {
        return JSON.parse(
            localStorage.getItem(key) ||
            sessionStorage.getItem(key) ||
            "null"
        );
    } catch {
        return null;
    }
}

function getToken() {
    return localStorage.getItem("token") ||
        sessionStorage.getItem("token");
}

function saveUser(user) {
    try {
        localStorage.setItem("user", JSON.stringify(user));
    } catch {
        try {
            sessionStorage.setItem("user", JSON.stringify(user));
        } catch (error) {
            console.error("Unable to save user:", error);
        }
    }
}

const token = getToken();

if (REQUIRE_LOGIN && !token) {
    window.location.href = "login.html";
}

if (token && $("navAuth")) {
    $("navAuth").textContent = "Logout";
}

let toastTimer;

function toast(message) {
    const element = $("toast");
    if (!element) {
        console.log(message);
        return;
    }

    element.textContent = message;
    element.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        element.hidden = true;
    }, 3000);
}

function countUp(element, target, prefix = "") {
    if (!element) return;

    const value = Math.max(0, Number(target) || 0);
    const start = performance.now();
    const duration = 900;

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const current = Math.round(
            value * (1 - Math.pow(1 - progress, 3))
        );

        element.textContent =
            prefix + current.toLocaleString("en-IN");

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

async function apiRequest(url, options = {}) {
    const currentToken = getToken();
    const headers = { ...(options.headers || {}) };

    if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        let message =
            result.detail ||
            result.message ||
            "Something went wrong.";

        if (Array.isArray(message)) {
            message = message.map(item => {
                const field = item.loc?.join(" → ") || "Field";
                return `${field}: ${item.msg}`;
            }).join("\n");
        }

        if (response.status === 401) {
            logout();
        }

        throw new Error(
            typeof message === "string" ?
            message :
            JSON.stringify(message)
        );
    }

    return result;
}

function renderDomains() {
    const container = $("domains");
    if (!container) return;

    container.replaceChildren();

    data.domains.forEach(domain => {
        const wrapper = document.createElement("div");
        wrapper.className = "dom";

        const top = document.createElement("div");
        top.className = "dom-top";

        const name = document.createElement("span");
        name.textContent = `${domain.icon} ${domain.name}`;

        const points = document.createElement("span");
        points.textContent =
            `${Number(domain.pts || 0).toLocaleString("en-IN")} Mudrā`;

        top.append(name, points);

        const bar = document.createElement("div");
        bar.className = "dom-bar";

        const fill = document.createElement("i");
        const goal = Math.max(1, Number(domain.goal) || 1000);
        const percentage = Math.min(
            100,
            Math.round((Number(domain.pts || 0) / goal) * 100)
        );

        fill.style.width = `${percentage}%`;

        bar.appendChild(fill);
        wrapper.append(top, bar);
        container.appendChild(wrapper);
    });
}

function renderActivity() {
    const container = $("activity");
    if (!container) return;

    container.replaceChildren();

    if (!data.activity.length) {
        const item = document.createElement("li");
        item.textContent =
            "No karma activity yet. Start your journey by completing a karma.";
        container.appendChild(item);
        return;
    }

    data.activity.forEach(activity => {
        const item = document.createElement("li");

        const icon = document.createElement("div");
        icon.className = "act-ico";
        icon.textContent = activity.icon || "✨";

        const info = document.createElement("div");
        info.className = "act-info";
        info.textContent = activity.title || "Karma Activity";

        const date = document.createElement("small");
        date.textContent = activity.when || "";
        info.appendChild(date);

        const points = document.createElement("div");
        points.className = "act-pts";
        points.textContent =
            `+${Number(activity.pts || 0).toLocaleString("en-IN")} Mudrā`;

        item.append(icon, info, points);
        container.appendChild(item);
    });
}

function renderBadges() {
    const container = $("badges");
    if (!container) return;

    container.replaceChildren();

    if (!data.badges.length) {
        const empty = document.createElement("p");
        empty.textContent = "No badges earned yet.";
        container.appendChild(empty);
        return;
    }

    data.badges.forEach(badge => {
        const item = document.createElement("div");
        item.className =
            `badge-item ${badge.earned ? "" : "locked"}`;

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

function render() {
    if ($("pName")) {
        $("pName").textContent = data.name || "KarmaChakra Member";
    }

    if ($("pBio")) {
        $("pBio").textContent =
            data.bio || "Doing one good deed at a time.";
    }

    if ($("pLevel")) {
        $("pLevel").textContent =
            `${data.levelTitle || "Karma Yogi"}, Level ${data.level || 1}`;
    }

    if ($("avatarInitial")) {
        $("avatarInitial").textContent =
            (data.name?.trim()?.[0] || "K").toUpperCase();
    }

    const mudra = Math.max(0, Number(data.mudra) || 0);
    const previous = Number(data.prevLevelAt) || 0;
    const next = Math.max(
        previous + 1,
        Number(data.nextLevelAt) || 1000
    );

    const percentage = Math.max(
        0,
        Math.min(
            100,
            Math.round(((mudra - previous) / (next - previous)) * 100)
        )
    );

    countUp($("mudraTotal"), mudra);

    if ($("levelNote")) {
        $("levelNote").textContent =
            `${Math.max(0, next - mudra).toLocaleString("en-IN")} Mudrā to Level ${Number(data.level || 1) + 1}`;
    }

    requestAnimationFrame(() => {
        if ($("levelBar")) {
            $("levelBar").style.width = `${percentage}%`;
        }

        if ($("ringFill")) {
            $("ringFill").style.strokeDashoffset =
                339.3 * (1 - percentage / 100);
        }
    });

    countUp(
        document.querySelector('[data-stat="verified"]'),
        data.verified
    );

    countUp(
        document.querySelector('[data-stat="streak"]'),
        data.streak
    );

    countUp(
        document.querySelector('[data-stat="badges"]'),
        data.badges.filter(badge => badge.earned).length
    );

    countUp(
        document.querySelector('[data-stat="rank"]'),
        data.rank,
        "#"
    );

    renderDomains();
    renderActivity();
    renderBadges();
}

function applyProfileResponse(response) {
    if (!response || typeof response !== "object") return;

    const profile =
        response.profile ||
        response.user ||
        response;

    data.name =
        profile.full_name ??
        profile.name ??
        data.name;

    data.email = profile.email ?? data.email;
    data.phone = profile.phone ?? data.phone;
    data.bio = profile.bio ?? data.bio;

    if (profile.level !== undefined) {
        data.level = Number(profile.level);
    }

    if (profile.level_title !== undefined) {
        data.levelTitle = profile.level_title;
    }

    if (profile.levelTitle !== undefined) {
        data.levelTitle = profile.levelTitle;
    }

    if (profile.mudra !== undefined) {
        data.mudra = Number(profile.mudra);
    }

    if (profile.total_karma_points !== undefined) {
        data.mudra = Number(profile.total_karma_points);
    }

    if (profile.next_level_at !== undefined) {
        data.nextLevelAt = Number(profile.next_level_at);
    }

    if (profile.prev_level_at !== undefined) {
        data.prevLevelAt = Number(profile.prev_level_at);
    }

    if (profile.verified !== undefined) {
        data.verified = Number(profile.verified);
    }

    if (profile.verified_count !== undefined) {
        data.verified = Number(profile.verified_count);
    }

    if (profile.streak !== undefined) {
        data.streak = Number(profile.streak);
    }

    if (profile.rank !== undefined) {
        data.rank = Number(profile.rank);
    }

    if (Array.isArray(profile.domains)) {
        data.domains = profile.domains.map(domain => ({
            name: domain.name || "Karma",
            icon: domain.icon || "✨",
            pts: Number(domain.pts ?? domain.points ?? 0),
            goal: Number(domain.goal || 1000)
        }));
    }

    if (Array.isArray(profile.activity)) {
        data.activity = profile.activity.map(activity => ({
            icon: activity.icon || "✨",
            title: activity.title ||
                activity.activity_type ||
                "Karma Activity",
            when: activity.when ||
                activity.created_at ||
                "",
            pts: Number(
                activity.pts ??
                activity.karma_points ??
                0
            )
        }));
    }

    if (Array.isArray(profile.badges)) {
        data.badges = profile.badges.map(badge => ({
            icon: badge.icon || "🏅",
            name: badge.name || "Karma Badge",
            note: badge.note || "",
            earned: Boolean(badge.earned)
        }));
    }

    saveUser({
        ...profile,
        name: data.name,
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        bio: data.bio
    });
}

function showPhoto(source) {
    const avatar = $("avatar");
    if (!avatar) return;

    avatar.style.backgroundImage = `url("${source}")`;
    avatar.classList.add("has-photo");
}

function loadSavedPhoto() {
    try {
        const savedPhoto = localStorage.getItem("profilePhoto");

        if (savedPhoto) {
            showPhoto(savedPhoto);
        }
    } catch (error) {
        console.error("Unable to load profile photo:", error);
    }
}

$("photoInput")?.addEventListener("change", event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast("Please choose an image file.");
        event.target.value = "";
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        toast("Image must be smaller than 2 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        showPhoto(reader.result);

        try {
            localStorage.setItem("profilePhoto", reader.result);
            toast("Photo updated.");
        } catch {
            toast("Photo changed for this session, but could not be saved.");
        }
    };

    reader.readAsDataURL(file);
});

const dialog = $("editDialog");

const fields = {
    name: $("fName"),
    email: $("fEmail"),
    phone: $("fPhone"),
    bio: $("fBio")
};

function setError(input, message) {
    if (!input) return false;

    const field = input.closest(".field");
    if (!field) return !message;

    field.classList.toggle("invalid", Boolean(message));

    const error = field.querySelector(".error");

    if (error) {
        error.textContent = message || "";
    }

    return !message;
}

const validators = {
    name: () => {
        const value = fields.name?.value.trim() || "";

        return setError(
            fields.name,
            /^[A-Za-z][A-Za-z .'-]{1,49}$/.test(value) ?
            "" :
            "Use 2 to 50 characters with letters."
        );
    },

    email: () => {
        const value = fields.email?.value.trim() || "";

        return setError(
            fields.email,
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ?
            "" :
            "Enter a valid email address."
        );
    },

    phone: () => {
        const value = fields.phone?.value.trim() || "";

        return setError(
            fields.phone,
            value === "" || /^[6-9]\d{9}$/.test(value) ?
            "" :
            "Enter a valid 10-digit mobile number."
        );
    }
};

$("editBtn")?.addEventListener("click", () => {
    if (!dialog) return;

    fields.name.value = data.name || "";
    fields.email.value = data.email || "";
    fields.phone.value = data.phone || "";
    fields.bio.value = data.bio || "";

    if ($("bioCount")) {
        $("bioCount").textContent =
            `${fields.bio.value.length}/120`;
    }

    Object.keys(validators).forEach(key => {
        setError(fields[key], "");
    });

    dialog.showModal();
});

$("cancelBtn")?.addEventListener("click", () => {
    dialog?.close();
});

dialog?.addEventListener("click", event => {
    if (event.target === dialog) {
        dialog.close();
    }
});

fields.bio?.addEventListener("input", () => {
    if ($("bioCount")) {
        $("bioCount").textContent =
            `${fields.bio.value.length}/120`;
    }
});

fields.phone?.addEventListener("input", event => {
    event.target.value =
        event.target.value.replace(/\D/g, "").slice(0, 10);
});

["name", "email", "phone"].forEach(key => {
    fields[key]?.addEventListener("blur", validators[key]);
});

$("editForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    const valid = [
        validators.name(),
        validators.email(),
        validators.phone()
    ].every(Boolean);

    if (!valid) return;

    const updatedProfile = {
        full_name: fields.name.value.trim(),
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone.value.trim(),
        bio: fields.bio.value.trim() ||
            "Doing one good deed at a time."
    };

    const saveButton =
        $("editForm").querySelector('[type="submit"]');

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        const savedProfile = await apiRequest(
            PROFILE_UPDATE_API, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedProfile)
            }
        );

        applyProfileResponse(savedProfile);
        dialog?.close();
        render();
        toast("Profile updated successfully.");
    } catch (error) {
        console.error("Profile update error:", error);
        toast(error.message || "Unable to update profile.");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save changes";
        }
    }
});

function logout() {
    [
        "token",
        "user",
        "profileEdits"
    ].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    window.location.href = "login.html";
}

$("logoutBtn")?.addEventListener("click", logout);

$("navAuth")?.addEventListener("click", event => {
    if (getToken()) {
        event.preventDefault();
        logout();
    }
});

async function loadProfile() {
    const currentToken = getToken();

    if (!currentToken) {
        if (REQUIRE_LOGIN) {
            window.location.href = "login.html";
            return;
        }

        render();
        return;
    }

    try {
        const profile = await apiRequest(
            PROFILE_API, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        console.log("Profile API response:", profile);

        applyProfileResponse(profile);
        render();
    } catch (error) {
        console.error("Profile loading error:", error);
        toast(error.message || "Unable to load profile.");
    }
}

async function init() {
    loadSavedPhoto();

    const loginUser = readStore("user") || {};

    data.name =
        loginUser.full_name ||
        loginUser.name ||
        data.name;

    data.email = loginUser.email || data.email;
    data.phone = loginUser.phone || data.phone;
    data.bio = loginUser.bio || data.bio;

    render();

    await loadProfile();
}

init();
