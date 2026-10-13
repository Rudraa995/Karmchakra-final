const API_BASE = "http://127.0.0.1:8000";
const LOGIN_URL = `${API_BASE}/api/auth/login`;
const SIGNUP_URL = `${API_BASE}/api/auth/register`;
const AFTER_LOGIN_PAGE = "profile.html";

const $ = (id) => document.getElementById(id);

const loginForm = $("loginForm");
const signupForm = $("signupForm");
const alertBox = $("formAlert");

function showAlert(message, type = "err") {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.hidden = !message;
    alertBox.className = `alert ${type}`;
}

function showForm(which) {
    const isLogin = which === "login";
    if (!loginForm || !signupForm) return;

    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;

    $("tabLogin")?.classList.toggle("active", isLogin);
    $("tabSignup")?.classList.toggle("active", !isLogin);

    $("tabLogin")?.setAttribute("aria-selected", String(isLogin));
    $("tabSignup")?.setAttribute("aria-selected", String(!isLogin));

    document.title = `${isLogin ? "Login" : "Sign up"} | KarmaChakra`;
    showAlert("");
}

$("tabLogin")?.addEventListener("click", () => showForm("login"));
$("tabSignup")?.addEventListener("click", () => showForm("signup"));

$("goSignup")?.addEventListener("click", (event) => {
    event.preventDefault();
    showForm("signup");
});

$("goLogin")?.addEventListener("click", (event) => {
    event.preventDefault();
    showForm("login");
});

if (location.hash === "#signup") {
    showForm("signup");
} else {
    showForm("login");
}

function setState(input, message = "") {
    if (!input) return false;

    const field = input.closest(".field");
    const error = field?.querySelector(".error");

    field?.classList.toggle("invalid", Boolean(message));
    field?.classList.toggle("valid", !message && input.value !== "");

    if (error) error.textContent = message;
    return !message;
}

function getErrorMessage(data, fallback) {
    if (Array.isArray(data?.detail)) {
        return data.detail
            .map((error) => `${error.loc?.join(" → ") || "Field"}: ${error.msg}`)
            .join("\n");
    }

    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;

    return fallback;
}

document.querySelectorAll(".eye").forEach((button) => {
    button.addEventListener("click", () => {
        const input = $(button.dataset.target);
        if (!input) return;

        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? "Hide" : "Show";
        button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const passwordChecks = {
    len: (password) => password.length >= 8,
    upper: (password) => /[A-Z]/.test(password),
    lower: (password) => /[a-z]/.test(password),
    num: (password) => /\d/.test(password),
    sym: (password) => /[^A-Za-z0-9]/.test(password)
};

const isStrongPassword = (password) =>
    Object.values(passwordChecks).every((check) => check(password));

const validate = {
    email(input) {
        const value = input.value.trim();
        if (!value) return setState(input, "Enter your email address");
        if (!EMAIL_RE.test(value)) {
            return setState(input, "Enter a valid email address");
        }
        return setState(input);
    },

    loginPassword(input) {
        return setState(input, input.value ? "" : "Enter your password");
    },

    name(input) {
        const value = input.value.trim();
        if (!value) return setState(input, "Enter your full name");
        if (!NAME_RE.test(value)) {
            return setState(input, "Use 2–50 valid characters for your name");
        }
        return setState(input);
    },

    username(input) {
        const value = input.value.trim();
        if (!value) return setState(input, "Enter your username");
        if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
            return setState(input, "Use 3–20 letters, numbers, or underscores");
        }
        return setState(input);
    },

    phone(input) {
        const value = input.value.trim();
        if (!value) return setState(input, "Enter your mobile number");
        if (!PHONE_RE.test(value)) {
            return setState(input, "Enter a valid 10-digit mobile number");
        }
        return setState(input);
    },

    signupPassword(input) {
        if (!input.value) return setState(input, "Create a password");
        if (!isStrongPassword(input.value)) {
            return setState(input, "Your password must meet all the rules below");
        }
        return setState(input);
    },

    confirm(input) {
        if (!input.value) return setState(input, "Re-enter your password");
        if (input.value !== $("signupPassword").value) {
            return setState(input, "Passwords do not match");
        }
        return setState(input);
    },

    terms(input) {
        const field = input.closest(".field");
        const error = field?.querySelector(".error");
        const valid = input.checked;

        if (error) {
            error.textContent = valid ? "" : "Accept the terms to continue";
        }

        field?.classList.toggle("invalid", !valid);
        return valid;
    }
};

const passwordInput = $("signupPassword");

passwordInput?.addEventListener("input", () => {
    const password = passwordInput.value;
    let score = 0;

    document.querySelectorAll("#rules li").forEach((item) => {
        const rule = item.dataset.rule;
        const passed = passwordChecks[rule]?.(password) ?? false;
        item.classList.toggle("met", passed);
        if (passed) score++;
    });

    const levels = [
        ["Password strength", "0%", "transparent"],
        ["Very weak", "20%", "#ff5a4d"],
        ["Weak", "40%", "#ff8a3d"],
        ["Fair", "60%", "#ffc94d"],
        ["Good", "80%", "#9ad46b"],
        ["Strong", "100%", "#6fcf8f"]
    ];

    const [label, width, color] = password ? levels[score] : levels[0];

    if ($("strengthText")) $("strengthText").textContent = label;
    if ($("meterBar")) {
        $("meterBar").style.width = width;
        $("meterBar").style.background = color;
    }

    if ($("confirm")?.value) validate.confirm($("confirm"));
});

$("phone")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
});

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
    $(id)?.addEventListener("blur", () => validate[rule]($(id)));
});

$("terms")?.addEventListener("change", () => validate.terms($("terms")));

async function postJSON(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    return {
        ok: response.ok,
        status: response.status,
        data
    };
}

function setLoading(button, loading, text) {
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : text;
}

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const valid = [
        validate.email($("loginEmail")),
        validate.loginPassword($("loginPassword"))
    ].every(Boolean);

    if (!valid) return;

    const button = loginForm.querySelector(".btn");
    setLoading(button, true, "Login");
    showAlert("");

    try {
        const { ok, data, status } = await postJSON(LOGIN_URL, {
            email: $("loginEmail").value.trim(),
            password: $("loginPassword").value
        });

        if (!ok) {
            showAlert(getErrorMessage(
                data,
                status === 401 ?
                "Incorrect email or password." :
                "Unable to login. Please try again."
            ));
            return;
        }

        const token = data.access_token || data.token || data.accessToken;

        if (!token) {
            showAlert("The server response did not contain an access token.");
            console.error("Login response:", data);
            return;
        }

        const remember = $("remember")?.checked;
        const storage = remember ? localStorage : sessionStorage;
        const otherStorage = remember ? sessionStorage : localStorage;

        otherStorage.removeItem("token");
        otherStorage.removeItem("user");

        storage.setItem("token", token);

        const user = data.user || data.profile || data;

        storage.setItem("user", JSON.stringify({
            ...user,
            name: user.full_name || user.name || $("loginEmail").value.trim(),
            email: user.email || $("loginEmail").value.trim()
        }));

        window.location.href = AFTER_LOGIN_PAGE;
    } catch (error) {
        console.error("Login error:", error);
        showAlert("Cannot reach the server. Check that your backend is running.");
    } finally {
        setLoading(button, false, "Login");
    }
});

signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const valid = [
        validate.name($("name")),
        validate.username($("username")),
        validate.email($("signupEmail")),
        validate.phone($("phone")),
        validate.signupPassword($("signupPassword")),
        validate.confirm($("confirm")),
        validate.terms($("terms"))
    ].every(Boolean);

    if (!valid) return;

    const button = signupForm.querySelector(".btn");
    setLoading(button, true, "Create account");
    showAlert("");

    try {
        const { ok, data } = await postJSON(SIGNUP_URL, {
            full_name: $("name").value.trim(),
            username: $("username").value.trim(),
            email: $("signupEmail").value.trim(),
            phone: $("phone").value.trim(),
            password: $("signupPassword").value
        });

        if (!ok) {
            showAlert(getErrorMessage(data, "Unable to create your account. Please try again."));
            console.error("Registration error:", data);
            return;
        }

        signupForm.reset();

        signupForm.querySelectorAll(".field").forEach((field) => {
            field.classList.remove("valid", "invalid");
            const error = field.querySelector(".error");
            if (error) error.textContent = "";
        });

        document.querySelectorAll("#rules li").forEach((item) => {
            item.classList.remove("met");
        });

        if ($("strengthText")) $("strengthText").textContent = "Password strength";
        if ($("meterBar")) {
            $("meterBar").style.width = "0%";
            $("meterBar").style.background = "transparent";
        }

        showForm("login");
        showAlert("Account created successfully. Please log in.", "ok");
    } catch (error) {
        console.error("Signup error:", error);
        showAlert("Cannot reach the server. Check that your backend is running.");
    } finally {
        setLoading(button, false, "Create account");
    }
});

$("forgot")?.addEventListener("click", (event) => {
    event.preventDefault();
    showAlert("Password reset is coming soon.", "ok");
});
