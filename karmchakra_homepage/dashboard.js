document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API_BASE_URL = "http://127.0.0.1:8000";
    const TREE_API_URL = `${API_BASE_URL}/api/trees/`;
    const EMERGENCY_API_URL = `${API_BASE_URL}/api/emergencies/`;
    const KARMA_PER_TREE = 10;
    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const REQUEST_TIMEOUT_MS = 20000;

    const $ = id => document.getElementById(id);

    const sidebar = $("sidebar");
    const sidebarOverlay = $("sidebarOverlay");
    const sections = document.querySelectorAll(".dashboard-section");
    const sidebarItems = document.querySelectorAll(".sidebar-item");

    const sectionInfo = {
        "plant-tree": ["Plant a Tree", "Upload a photo and let our AI verify your contribution."],
        "tree-history": ["Tree History", "View your planted trees and earned Karma points."],
        "emergency": ["Emergency Reporting", "Report environmental incidents and help protect nature."],
        "rewards": ["Rewards", "Your environmental actions unlock exciting rewards."],
        "competitions": ["School & College Competitions", "Represent your campus and climb the environmental rankings."],
        "emergency-history": ["Emergency History", "View all environmental incidents you have reported."]
    };

    let latitude = null;
    let longitude = null;
    let incidentLatitude = null;
    let incidentLongitude = null;
    let selectedIncidentType = "";
    let treePreviewUrl = null;
    let incidentPreviewUrl = null;
    let historyRequestId = 0;

    function notify(message) {
        alert(message);
    }

    async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("The server took too long to respond. Please try again.");
            }
            throw new Error("Cannot reach the server. Please check your connection or backend.");
        } finally {
            clearTimeout(timer);
        }
    }

    function extractErrorMessage(data, fallback) {
        if (!data) return fallback;

        if (Array.isArray(data.detail)) {
            return data.detail.map(item => {
                const field = item.loc?.join(" → ");
                return field ? `${field}: ${item.msg}` : item.msg;
            }).join(", ") || fallback;
        }

        return data.detail || fallback;
    }

    function openSidebar() {
        sidebar?.classList.add("open");
        sidebarOverlay?.classList.add("show");
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("show");
    }

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.toggle("active", section.id === sectionId);
        });

        sidebarItems.forEach(item => {
            item.classList.toggle("active", item.dataset.section === sectionId);
        });

        if (sectionInfo[sectionId]) {
            const [title, description] = sectionInfo[sectionId];
            if ($("pageTitle")) $("pageTitle").textContent = title;
            if ($("pageDescription")) $("pageDescription").textContent = description;
        }

        closeSidebar();

        if (sectionId === "tree-history") loadTreeHistory();
        if (sectionId === "emergency-history") loadEmergencyHistory();
    }

    sidebarItems.forEach(item => {
        item.addEventListener("click", () => showSection(item.dataset.section));
    });

    $("mobileMenu")?.addEventListener("click", () => {
        if (sidebar?.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
            $("successOverlay")?.classList.remove("show");
            $("emergencySuccessOverlay")?.classList.remove("show");
        }
    });

    function validatePhoto(file) {
        if (!file) {
            notify("Please upload a photo.");
            return false;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            notify("Only JPG, JPEG and PNG images are allowed.");
            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            notify("Photo size cannot exceed 10 MB.");
            return false;
        }

        return true;
    }

    function previewPhoto(inputId, imageId, containerId, type) {
        const input = $(inputId);
        const image = $(imageId);
        const container = $(containerId);
        const file = input?.files?.[0];

        if (!input || !image || !container || !file) return;

        if (!validatePhoto(file)) {
            input.value = "";
            return;
        }

        if (type === "tree" && treePreviewUrl) URL.revokeObjectURL(treePreviewUrl);
        if (type === "incident" && incidentPreviewUrl) URL.revokeObjectURL(incidentPreviewUrl);

        const url = URL.createObjectURL(file);
        image.src = url;
        container.style.display = "block";

        if (type === "tree") {
            treePreviewUrl = url;
            const uploadBox = document.querySelector(".upload-box");
            if (uploadBox) uploadBox.style.display = "none";
        } else {
            incidentPreviewUrl = url;
        }
    }

    function removePhoto(inputId, imageId, containerId, type) {
        if ($(inputId)) $(inputId).value = "";
        if ($(imageId)) $(imageId).removeAttribute("src");
        if ($(containerId)) $(containerId).style.display = "none";

        if (type === "tree") {
            if (treePreviewUrl) URL.revokeObjectURL(treePreviewUrl);
            treePreviewUrl = null;
            const uploadBox = document.querySelector(".upload-box");
            if (uploadBox) uploadBox.style.display = "";
        } else {
            if (incidentPreviewUrl) URL.revokeObjectURL(incidentPreviewUrl);
            incidentPreviewUrl = null;
        }
    }

    $("treePhoto")?.addEventListener("change", () => {
        previewPhoto("treePhoto", "photoPreview", "photoPreviewContainer", "tree");
    });

    $("incidentPhoto")?.addEventListener("change", () => {
        previewPhoto("incidentPhoto", "incidentPreview", "incidentPreviewContainer", "incident");
    });

    $("removePhoto")?.addEventListener("click", () => {
        removePhoto("treePhoto", "photoPreview", "photoPreviewContainer", "tree");
    });

    $("removeIncidentPhoto")?.addEventListener("click", () => {
        removePhoto("incidentPhoto", "incidentPreview", "incidentPreviewContainer", "incident");
    });

    window.addEventListener("beforeunload", () => {
        if (treePreviewUrl) URL.revokeObjectURL(treePreviewUrl);
        if (incidentPreviewUrl) URL.revokeObjectURL(incidentPreviewUrl);
    });

    function getIncidentCards() {
        return document.querySelectorAll(".incident-card, [data-incident-type], [data-type]");
    }

    function getIncidentTypeInput() {
        return $("incidentType") ||
            $("incident_type") ||
            document.querySelector('input[name="incident_type"], select[name="incident_type"]');
    }

    function detectIncidentType(card) {
        const explicitType = card.dataset.incidentType || card.dataset.type || card.getAttribute("data-incident");

        if (explicitType) return explicitType.trim();

        const text = (card.textContent || "").trim().toLowerCase();
        const knownTypes = ["illegal cutting", "forest fire", "pollution", "water leakage"];
        const matchedType = knownTypes.find(type => text.includes(type));

        if (matchedType) {
            return matchedType.replace(/\b\w/g, char => char.toUpperCase());
        }

        return (card.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100);
    }

    function selectIncidentType(card) {
        selectedIncidentType = detectIncidentType(card);

        getIncidentCards().forEach(item => {
            item.classList.toggle("selected", item === card);
            item.setAttribute("aria-selected", item === card ? "true" : "false");
        });

        const typeInput = getIncidentTypeInput();
        if (typeInput) typeInput.value = selectedIncidentType;

        console.log("Selected incident type:", selectedIncidentType);
    }

    getIncidentCards().forEach(card => {
        if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");

        card.addEventListener("click", () => selectIncidentType(card));

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectIncidentType(card);
            }
        });
    });

    function getLocation(inputId, statusId, buttonId, callback) {
        const button = $(buttonId);
        const status = $(statusId);
        const input = $(inputId);

        if (!navigator.geolocation) {
            if (status) status.textContent = "Geolocation is not supported by your browser.";
            return;
        }

        if (button) button.disabled = true;
        if (status) status.textContent = "Getting your location...";

        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                if (input) input.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                if (status) status.textContent = "✓ Location detected successfully.";
                if (button) button.disabled = false;
                if (typeof callback === "function") callback(lat, lon);
            },
            error => {
                const messages = {
                    1: "Location permission denied. Please allow access.",
                    2: "Your location is unavailable.",
                    3: "Location request timed out. Try again."
                };

                if (status) status.textContent = messages[error.code] || "Unable to get location.";
                if (button) button.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    $("getLocation")?.addEventListener("click", () => {
        getLocation("location", "locationStatus", "getLocation", (lat, lon) => {
            latitude = lat;
            longitude = lon;
        });
    });

    $("getIncidentLocation")?.addEventListener("click", () => {
        getLocation("incidentLocation", "incidentLocationStatus", "getIncidentLocation", (lat, lon) => {
            incidentLatitude = lat;
            incidentLongitude = lon;
        });
    });

    $("description")?.addEventListener("input", event => {
        if ($("charCount")) $("charCount").textContent = event.target.value.length;
    });

    $("incidentDescription")?.addEventListener("input", event => {
        if ($("incidentCharCount")) $("incidentCharCount").textContent = event.target.value.length;
    });

    function updateKarmaScore(trees = []) {
        const totalTrees = Array.isArray(trees) ? trees.length : 0;
        const totalPoints = totalTrees * KARMA_PER_TREE;

        const sideKarma = $("sideKarma");
        const totalKarma = $("totalKarma");
        const karmaScore = $("karmaScore");
        const karmaFill = $("karmaFill");

        if (sideKarma) {
            sideKarma.replaceChildren();
            sideKarma.appendChild(document.createTextNode(`${totalPoints} `));

            const unit = document.createElement("span");
            unit.textContent = "pts";
            sideKarma.appendChild(unit);
        }

        if (totalKarma) totalKarma.textContent = `${totalPoints} pts`;
        if (karmaScore) karmaScore.textContent = totalPoints.toLocaleString("en-IN");
        if (karmaFill) karmaFill.style.width = `${Math.min(totalPoints, 100)}%`;

        return totalPoints;
    }

    function createHistoryCell(value, className = "") {
        const cell = document.createElement("span");
        cell.textContent = value ?? "—";
        if (className) cell.className = className;
        return cell;
    }

    function renderTreeHistory(trees) {
        const historyList = $("historyList");
        const historyEmpty = $("historyEmpty");

        if (!historyList || !historyEmpty) return;

        historyList.replaceChildren();

        if (!Array.isArray(trees) || trees.length === 0) {
            historyEmpty.style.display = "block";
            historyEmpty.textContent = "🌱 No trees planted yet. Plant a tree to create your first history record.";
            updateKarmaScore([]);
            return;
        }

        historyEmpty.style.display = "none";

        trees.forEach(tree => {
            const row = document.createElement("div");
            row.className = "history-row";

            const status = String(tree.status || "pending").toLowerCase();
            const date = tree.created_at ? new Date(tree.created_at).toLocaleDateString("en-IN") : "—";

            row.append(
                createHistoryCell(`🌱 ${tree.tree_name || "Unnamed tree"}`, "tree-name"),
                createHistoryCell(date),
                createHistoryCell(`📍 ${tree.location || "—"}`),
                createHistoryCell(status.charAt(0).toUpperCase() + status.slice(1), `status ${status}`),
                createHistoryCell(`${KARMA_PER_TREE} pts`, "karma-points")
            );

            historyList.appendChild(row);
        });

        updateKarmaScore(trees);
    }

    async function loadTreeHistory() {
        const historyEmpty = $("historyEmpty");
        const requestId = ++historyRequestId;

        if (historyEmpty) {
            historyEmpty.textContent = "Loading tree history...";
            historyEmpty.style.display = "block";
        }

        try {
            const response = await fetchWithTimeout(TREE_API_URL);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errorData, "Unable to load tree history. Check your GET API."));
            }

            const trees = await response.json();

            if (requestId !== historyRequestId) return;

            renderTreeHistory(trees);
        } catch (error) {
            if (requestId !== historyRequestId) return;

            console.error("Tree history error:", error);

            if (historyEmpty) {
                historyEmpty.textContent = "Unable to load history. Please check your backend.";
                historyEmpty.style.display = "block";
            }
        }
    }

    function buildPhotoUrl(rawPath) {
        let photoPath = String(rawPath).replace(/\\/g, "/");

        if (photoPath.startsWith("app/uploads/")) {
            photoPath = photoPath.replace("app/uploads/", "/uploads/");
        }

        if (/^https?:\/\//i.test(photoPath)) return photoPath;

        return `${API_BASE_URL}${photoPath.startsWith("/") ? "" : "/"}${photoPath}`;
    }

    function displaySubmission(data) {
        const fields = {
            resultTreeName: data.tree_name,
            resultLocation: data.location,
            resultLatitude: data.latitude,
            resultLongitude: data.longitude,
            resultDescription: data.description,
            resultStatus: data.status || "pending",
            resultCreatedAt: data.created_at ? new Date(data.created_at).toLocaleString("en-IN") : "—"
        };

        Object.entries(fields).forEach(([id, value]) => {
            if ($(id)) $(id).textContent = value ?? "";
        });

        if (data.photo_path && $("resultPhoto")) {
            $("resultPhoto").src = buildPhotoUrl(data.photo_path);
        }

        if ($("submissionResult")) $("submissionResult").style.display = "block";
    }

    function resetTreeForm() {
        $("treeForm")?.reset();

        latitude = null;
        longitude = null;

        if ($("charCount")) $("charCount").textContent = "0";
        if ($("locationStatus")) $("locationStatus").textContent = "";

        removePhoto("treePhoto", "photoPreview", "photoPreviewContainer", "tree");
    }

    $("treeForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const button = $("submitBtn");
        const photo = $("treePhoto")?.files?.[0];
        const treeName = $("treeName")?.value.trim() || "";
        const location = $("location")?.value.trim() || "";
        const description = $("description")?.value.trim() || "";

        if (!form.reportValidity()) return;
        if (!validatePhoto(photo)) return;

        if (treeName.length < 2 || treeName.length > 50) {
            notify("Tree name must contain 2 to 50 characters.");
            return;
        }

        if (description.length < 10 || description.length > 500) {
            notify("Description must contain 10 to 500 characters.");
            return;
        }

        if (!location || latitude === null || longitude === null) {
            notify("Please get your GPS location before submitting.");
            return;
        }

        const formData = new FormData();
        formData.append("tree_photo", photo);
        formData.append("tree_name", treeName);
        formData.append("location", location);
        formData.append("latitude", String(latitude));
        formData.append("longitude", String(longitude));
        formData.append("description", description);

        for (const [key, value] of formData.entries()) {
            console.log(key, value instanceof File ? `${value.name} (${value.type}, ${value.size} bytes)` : value);
        }

        if (button) {
            button.disabled = true;
            button.textContent = "Submitting...";
        }

        try {
            const response = await fetchWithTimeout(TREE_API_URL, { method: "POST", body: formData }, 60000);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(extractErrorMessage(data, "Tree submission failed."));
            }

            displaySubmission(data);
            resetTreeForm();
            $("successOverlay")?.classList.add("show");
            await loadTreeHistory();
        } catch (error) {
            console.error("Tree submission error:", error);
            notify(error.message || "Unable to submit your tree.");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Submit for Verification";
            }
        }
    });

    $("closeSuccess")?.addEventListener("click", () => {
        $("successOverlay")?.classList.remove("show");
        showSection("tree-history");
    });

    $("successOverlay")?.addEventListener("click", event => {
        if (event.target.id === "successOverlay") {
            $("successOverlay").classList.remove("show");
        }
    });

    function getSelectedIncidentType() {
        if (selectedIncidentType) return selectedIncidentType;
        return getIncidentTypeInput()?.value?.trim() || "";
    }

    function displayEmergencySubmission(data) {
        const fields = {
            emergencyResultType: data.incident_type || data.incidentType || "—",
            emergencyResultLocation: data.location || "—",
            emergencyResultLatitude: data.latitude ?? "—",
            emergencyResultLongitude: data.longitude ?? "—",
            emergencyResultDescription: data.description || "—",
            emergencyResultStatus: data.status || "pending",
            emergencyResultCreatedAt: data.created_at ? new Date(data.created_at).toLocaleString("en-IN") : "—"
        };

        Object.entries(fields).forEach(([id, value]) => {
            if ($(id)) $(id).textContent = value;
        });

        const photoPath = data.photo_path || data.photoPath;

        if (photoPath) {
            const image = $("emergencyResultPhoto") || $("resultIncidentPhoto");
            if (image) image.src = buildPhotoUrl(photoPath);
        }

        const resultContainer = $("emergencySubmissionResult") || $("emergencyResult");
        if (resultContainer) resultContainer.style.display = "block";
    }

    function resetEmergencyForm() {
        $("emergencyForm")?.reset();

        incidentLatitude = null;
        incidentLongitude = null;
        selectedIncidentType = "";

        if ($("incidentCharCount")) $("incidentCharCount").textContent = "0";
        if ($("incidentLocationStatus")) $("incidentLocationStatus").textContent = "";

        getIncidentCards().forEach(card => {
            card.classList.remove("selected");
            card.setAttribute("aria-selected", "false");
        });

        const typeInput = getIncidentTypeInput();
        if (typeInput) typeInput.value = "";

        removePhoto("incidentPhoto", "incidentPreview", "incidentPreviewContainer", "incident");
    }

    async function loadEmergencyHistory() {
        const historyList = $("emergencyHistoryList") || $("incidentHistoryList");
        const historyEmpty = $("emergencyHistoryEmpty") || $("incidentHistoryEmpty");

        if (!historyList && !historyEmpty) return;

        if (historyEmpty) {
            historyEmpty.textContent = "Loading emergency history...";
            historyEmpty.style.display = "block";
        }

        try {
            const response = await fetchWithTimeout(EMERGENCY_API_URL);
            const data = await response.json().catch(() => []);

            if (!response.ok) {
                throw new Error(extractErrorMessage(data, "Unable to load emergency history."));
            }

            const reports = Array.isArray(data) ? data : [];

            if (historyList) historyList.replaceChildren();

            if (reports.length === 0) {
                if (historyEmpty) {
                    historyEmpty.textContent = "🚨 No emergency reports submitted yet.";
                    historyEmpty.style.display = "block";
                }
                return;
            }

            if (historyEmpty) historyEmpty.style.display = "none";

            reports.forEach(report => {
                if (!historyList) return;

                const row = document.createElement("div");
                row.className = "history-row emergency-history-row";

                const status = (report.status || "pending").toLowerCase();

                const values = [
                    `🚨 ${report.incident_type || "Unknown incident"}`,
                    report.created_at ? new Date(report.created_at).toLocaleDateString("en-IN") : "—",
                    `📍 ${report.location || "—"}`,
                    status,
                    report.description || "—"
                ];

                values.forEach((value, index) => {
                    const cell = document.createElement("span");
                    cell.textContent = value;
                    if (index === 3) cell.className = `status ${status}`;
                    row.appendChild(cell);
                });

                historyList.appendChild(row);
            });
        } catch (error) {
            console.error("Emergency history error:", error);

            if (historyEmpty) {
                historyEmpty.textContent = "Unable to load emergency history. Please check your backend.";
                historyEmpty.style.display = "block";
            }
        }
    }

    $("emergencyForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        const form = event.currentTarget;
        const button = $("emergencySubmitBtn") || $("submitEmergencyBtn");
        const submitText = $("emergencySubmitText");
        const photo = $("incidentPhoto")?.files?.[0];
        const location = $("incidentLocation")?.value.trim() || "";
        const description = $("incidentDescription")?.value.trim() || "";
        const incidentType = getSelectedIncidentType();

        if (!form.reportValidity()) return;
        if (!validatePhoto(photo)) return;

        if (!incidentType) {
            notify("Please select an incident type.");
            return;
        }

        if (!location || incidentLatitude === null || incidentLongitude === null) {
            notify("Please get the incident location before submitting.");
            return;
        }

        if (description.length < 10 || description.length > 500) {
            notify("Description must contain 10 to 500 characters.");
            return;
        }

        const formData = new FormData();
        formData.append("incident_type", incidentType);
        formData.append("incident_photo", photo);
        formData.append("location", location);
        formData.append("latitude", String(incidentLatitude));
        formData.append("longitude", String(incidentLongitude));
        formData.append("description", description);

        for (const [key, value] of formData.entries()) {
            console.log("Emergency FormData:", key, value instanceof File ? `${value.name} (${value.type}, ${value.size} bytes)` : value);
        }

        if (button) button.disabled = true;

        if (submitText) {
            submitText.textContent = "Submitting...";
        } else if (button) {
            button.textContent = "Submitting...";
        }

        try {
            const response = await fetchWithTimeout(EMERGENCY_API_URL, { method: "POST", body: formData }, 60000);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(extractErrorMessage(data, "Emergency report submission failed."));
            }

            console.log("Emergency report saved:", data);

            displayEmergencySubmission(data);
            resetEmergencyForm();

            if ($("emergencySuccessOverlay")) {
                $("emergencySuccessOverlay").classList.add("show");
            } else {
                notify("Emergency report submitted successfully.");
            }

            await loadEmergencyHistory();
        } catch (error) {
            console.error("Emergency submission error:", error);
            notify(error.message || "Unable to submit emergency report.");
        } finally {
            if (button) button.disabled = false;

            if (submitText) {
                submitText.textContent = "Submit Emergency Report";
            } else if (button) {
                button.textContent = "Submit Emergency Report";
            }
        }
    });

    $("closeEmergencySuccess")?.addEventListener("click", () => {
        $("emergencySuccessOverlay")?.classList.remove("show");
    });

    $("emergencySuccessOverlay")?.addEventListener("click", event => {
        if (event.target.id === "emergencySuccessOverlay") {
            $("emergencySuccessOverlay").classList.remove("show");
        }
    });

    document.querySelector(".join-button")?.addEventListener("click", () => {
        window.location.href = "signup.html";
    });

    showSection("plant-tree");
    loadTreeHistory();
    loadEmergencyHistory();

    console.log("Karmachakra dashboard loaded.");
});
