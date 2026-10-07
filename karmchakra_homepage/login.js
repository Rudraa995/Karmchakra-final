// ====== API SETTINGS ======

const API_BASE = "http://127.0.0.1:8000";

const LOGIN_URL = `${API_BASE}/api/auth/login`;
const SIGNUP_URL = `${API_BASE}/api/auth/register`;

const AFTER_LOGIN_PAGE = "profile.html";

// ==========================

const $ = (id) => document.getElementById(id);

const loginForm = $("loginForm");
const signupForm = $("signupForm");
const alertBox = $("formAlert");

// ---------- Tabs: Login and Sign up ----------

function showForm(which) {
    const isLogin = which === "login";

    if (loginForm) loginForm.hidden = !isLogin;
    if (signupForm) signupForm.hidden = isLogin;

    $("tabLogin") ? .classList.toggle("active", isLogin);
    $("tabSignup") ? .classList.toggle("active", !isLogin);

    $("tabLogin") ? .setAttribute("aria-selected", String(isLogin));
    $("tabSignup") ? .setAttribute("aria-selected", String(!isLogin));

    document.title = (isLogin ? "Login" : "Sign up") + " | KarmaChakra";

    showAlert("");
}

$("tabLogin") ? .addEventListener("click", () => showForm("login"));
$("tabSignup") ? .addEventListener("click", () => showForm("signup"));

$("goSignup") ? .addEventListener("click", (e) => {
    e.preventDefault();
    showForm("signup");
});

$("goLogin") ? .addEventListener("click", (e) => {
    e.preventDefault();
    showForm("login");
});

if (location.hash === "#signup") {
    showForm("signup");
}

// ---------- Helpers ----------

function showAlert(msg, type = "err") {
    if (!alertBox) return;

    alertBox.hidden = !msg;
    alertBox.textContent = msg;
    alertBox.className = "alert " + type;
}

function setState(input, msg) {
    if (!input) return false;

    const field = input.closest(".field");

    if (!field) return !msg;

    const err = field.querySelector(".error");

    field.classList.toggle("invalid", Boolean(msg));
    field.classList.toggle("valid", !msg && input.value !== "");

    if (err) {
        err.textContent = msg || "";
    }

    return !msg;
}

function getErrorMessage(data, fallback) {
    if (Array.isArray(data ? .detail)) {
        return data.detail.map(error => {
            const field = error.loc ? .join(" → ") || "Field";
            return `${field}: ${error.msg}`;
        }).join("\n");
    }

    if (typeof data ? .detail === "string") {
        return data.detail;
    }

    if (typeof data ? .message === "string") {
        return data.message;
    }

    return fallback;
}

// ---------- Show / Hide Password ----------

document.querySelectorAll(".eye").forEach((btn) => {
    btn.addEventListener("click", () => {
        const input = $(btn.dataset.target);
        if (!input) return;

        const show = input.type === "password";

        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";

        btn.setAttribute(
            "aria-label",
            show ? "Hide password" : "Show password"
        );
    });
});

// ---------- Validation Rules ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const passwordChecks = {
    len: (p) => p.length >= 8,
    upper: (p) => /[A-Z]/.test(p),
    lower: (p) => /[a-z]/.test(p),
    num: (p) => /\d/.test(p),
    sym: (p) => /[^A-Za-z0-9]/.test(p)
};

const isStrongPassword = (p) =>
    Object.values(passwordChecks).every(fn => fn(p));

const validate = {
    email(el) {
        const value = el.value.trim();

        if (!value) {
            return setState(el, "Enter your email address");
        }

        if (!EMAIL_RE.test(value)) {
            return setState(
                el,
                "Enter a valid email, like name@example.com"
            );
        }

        return setState(el, "");
    },

    loginPassword(el) {
        return setState(
            el,
            el.value ? "" : "Enter your password"
        );
    },

    name(el) {
        const value = el.value.trim();

        if (!value) {
            return setState(el, "Enter your full name");
        }

        if (!NAME_RE.test(value)) {
            return setState(
                el,
                "Use letters only (2 to 50 characters)"
            );
        }

        return setState(el, "");
    },

    username(el) {
        const value = el.value.trim();

        if (!value) {
            return setState(el, "Enter your username");
        }

        if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
            return setState(
                el,
                "Use 3–20 letters, numbers, or underscores"
            );
        }

        return setState(el, "");
    },

    phone(el) {
        const value = el.value.trim();

        if (!value) {
            return setState(el, "Enter your mobile number");
        }

        if (!PHONE_RE.test(value)) {
            return setState(
                el,
                "Enter a valid 10-digit number starting with 6 to 9"
            );
        }

        return setState(el, "");
    },

    signupPassword(el) {
        const value = el.value;

        if (!value) {
            return setState(el, "Create a password");
        }

        if (!isStrongPassword(value)) {
            return setState(
                el,
                "Password does not meet all the rules below"
            );
        }

        return setState(el, "");
    },

    confirm(el) {
        if (!el.value) {
            return setState(el, "Re-enter your password");
        }

        if (el.value !== $("signupPassword").value) {
            return setState(el, "Passwords do not match");
        }

        return setState(el, "");
    },

    terms(el) {
        const field = el.closest(".field");
        const error = field ? .querySelector(".error");

        if (error) {
            error.textContent = el.checked ?
                "" :
                "Accept the terms to continue";
        }

        field ? .classList.toggle("invalid", !el.checked);

        return el.checked;
    }
};

// ---------- Live Password Strength Meter ----------

const pwd = $("signupPassword");

pwd ? .addEventListener("input", () => {
    const password = pwd.value;
    let score = 0;

    document.querySelectorAll("#rules li").forEach(li => {
        const rule = li.dataset.rule;
        const ok = passwordChecks[rule] ?
            passwordChecks[rule](password) :
            false;

        li.classList.toggle("met", ok);

        if (ok) score++;
    });

    const levels = [
        ["Password strength", "0%", "transparent"],
        ["Very weak", "20%", "#ff5a4d"],
        ["Weak", "40%", "#ff8a3d"],
        ["Fair", "60%", "#ffc94d"],
        ["Good", "80%", "#9ad46b"],
        ["Strong", "100%", "#6fcf8f"]
    ];

    const [label, width, color] = password
        ?
        levels[score] :
        levels[0];

    if ($("strengthText")) {
        $("strengthText").textContent = label;
    }

    if ($("meterBar")) {
        $("meterBar").style.width = width;
        $("meterBar").style.background = color;
    }

    if ($("confirm") ? .value) {
        validate.confirm($("confirm"));
    }
});

// ---------- Only Digits in Phone ----------

$("phone") ? .addEventListener("input", (event) => {
    event.target.value = event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);
});

// ---------- Validate on Blur ----------

[
    ["loginEmail", "email"],
    ["loginPassword", "loginPassword"],
    ["name", "name"],
    ["username", "username"],
    ["signupEmail", "email"],
    ["phone", "phone"],
    ["signupPassword", "signupPassword"],
    ["confirm", "confirm"]
].forEach(([id, rule]) => {
    $(id) ? .addEventListener("blur", () => {
        validate[rule]($(id));
    });
});

$("terms") ? .addEventListener("change", () => {
    validate.terms($("terms"));
});

// ---------- Send Data to Backend ----------

async function postJSON(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(body)
    });

    const result = await response.json().catch(() => ({}));

    return {
        ok: response.ok,
        status: response.status,
        data: result
    };
}

function setLoading(btn, loading, text) {
    if (!btn) return;

    btn.disabled = loading;
    btn.textContent = loading ? "Please wait..." : text;
}

// ---------- LOGIN SUBMIT ----------

loginForm ? .addEventListener("submit", async(event) => {
    event.preventDefault();

    const results = [
        validate.email($("loginEmail")),
        validate.loginPassword($("loginPassword"))
    ];

    if (results.includes(false)) return;

    const btn = loginForm.querySelector(".btn");
    setLoading(btn, true, "Login");

    try {
        const { ok, data, status } = await postJSON(LOGIN_URL, {
            email: $("loginEmail").value.trim(),
            password: $("loginPassword").value
        });

        if (!ok) {
            showAlert(
                getErrorMessage(
                    data,
                    status === 401 ?
                    "Incorrect email or password." :
                    "Unable to login. Please try again."
                )
            );

            console.error("Login error:", data);
            return;
        }

        // Support common FastAPI token response formats.
        const accessToken =
            data.access_token ||
            data.token ||
            data.accessToken;

        if (!accessToken) {
            showAlert(
                "Login response did not contain an access token."
            );

            console.error("Login response:", data);
            return;
        }

        // Use the same storage for token and user details.
        const store = $("remember") ? .checked ?
            localStorage :
            sessionStorage;

        // Remove stale values from the other storage.
        const otherStore = store === localStorage ?
            sessionStorage :
            localStorage;

        otherStore.removeItem("token");
        otherStore.removeItem("user");

        store.setItem("token", accessToken);

        const userDetails =
            data.user ||
            data.profile ||
            data;

        store.setItem(
            "user",
            JSON.stringify({
                ...userDetails,
                name: userDetails.full_name ||
                    userDetails.name ||
                    $("loginEmail").value.trim(),
                email: userDetails.email ||
                    $("loginEmail").value.trim()
            })
        );

        showAlert("Login successful. Redirecting...", "ok");

        window.location.href = AFTER_LOGIN_PAGE;

    } catch (error) {
        console.error("Login request error:", error);

        showAlert(
            "Cannot reach the server. Check your connection and try again."
        );
    } finally {
        setLoading(btn, false, "Login");
    }
});

// ---------- SIGNUP SUBMIT ----------

signupForm ? .addEventListener("submit", async(event) => {
    event.preventDefault();

    const results = [
        validate.name($("name")),
        validate.username($("username")),
        validate.email($("signupEmail")),
        validate.phone($("phone")),
        validate.signupPassword($("signupPassword")),
        validate.confirm($("confirm")),
        validate.terms($("terms"))
    ];

    if (results.includes(false)) return;

    const btn = signupForm.querySelector(".btn");
    setLoading(btn, true, "Create account");

    try {
        const { ok, data, status } = await postJSON(SIGNUP_URL, {
            full_name: $("name").value.trim(),
            username: $("username").value.trim(),
            email: $("signupEmail").value.trim(),
            phone: $("phone").value.trim(),
            password: $("signupPassword").value
        });

        if (!ok) {
            const message = getErrorMessage(
                data,
                "Unable to create your account. Please try again."
            );

            showAlert(message);
            console.error("Registration error:", status, data);
            return;
        }

        signupForm.reset();

        document.querySelectorAll("#rules li").forEach(li => {
            li.classList.remove("met");
        });

        if ($("strengthText")) {
            $("strengthText").textContent = "Password strength";
        }

        if ($("meterBar")) {
            $("meterBar").style.width = "0%";
            $("meterBar").style.background = "transparent";
        }

        showForm("login");
        showAlert("Account created. Please login.", "ok");

    } catch (error) {
        console.error("Signup request error:", error);

        showAlert(
            "Cannot reach the server. Check your connection and try again."
        );
    } finally {
        setLoading(btn, false, "Create account");
    }
});

// ---------- Forgot Password ----------

$("forgot") ? .addEventListener("click", (event) => {
    event.preventDefault();
    showAlert("Password reset is coming soon.", "ok");
});