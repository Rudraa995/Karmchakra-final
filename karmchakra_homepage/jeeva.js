document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API_BASE_URL = "http://127.0.0.1:8000";
    const API = {
        feed: `${API_BASE_URL}/api/animals/feed`,
        rescue: `${API_BASE_URL}/api/animals/rescue`,
        adopt: `${API_BASE_URL}/api/animals/adopt`,
        history: `${API_BASE_URL}/api/animals/history`
    };

    const KARMA = { feed: 10, rescue: 10, adopt: 20 };
    const $ = id => document.getElementById(id);

    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const sectionTitle = $("sectionTitle");
    const sectionDescription = $("sectionDescription");
    const animalForm = $("animalForm");
    const rescueForm = $("rescueForm");
    const adoptForm = $("adoptForm");
    const historyForm = $("historyForm");
    const sidebarKarma = $("sidebarKarma");
    const karmaProgress = $("karmaProgress");

    let selectedFiles = [];
    let feedLatitude = null;
    let feedLongitude = null;
    let rescueLatitude = null;
    let rescueLongitude = null;
    let adoptLatitude = null;
    let adoptLongitude = null;

    const sectionContent = {
        animal: {
            title: "Feed an Animal",
            description: "Show compassion by feeding a stray animal or bird and make a meaningful difference in their day."
        },
        rescue: {
            title: "Rescue & Report",
            description: "Report an injured, trapped, or abandoned animal and help connect them with timely assistance."
        },
        adopt: {
            title: "Adopt / Help a Stray",
            description: "Help a stray find a safe home or discover animals waiting for adoption."
        },
        history: {
            title: "Animal History",
            description: "View your animal-care activities and earned Karma."
        }
    };

    async function apiRequest(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                let message = data.detail || data.message || "Request failed.";

                if (Array.isArray(message)) {
                    message = message.map(item => {
                        const field = item.loc?.join(" → ") || "Field";
                        return `${field}: ${item.msg}`;
                    }).join("\n");
                }

                throw new Error(message);
            }

            return data;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error("The server took too long to respond. Please try again.");
            }

            if (error instanceof TypeError) {
                throw new Error("Cannot connect to the backend. Check that FastAPI is running.");
            }

            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    function showMessage(message) {
        alert(message);
    }

    function setButtonLoading(button, loading, loadingText, normalText) {
        if (!button) return;
        button.disabled = loading;
        button.textContent = loading ? loadingText : normalText;
    }

    function hideForms() {
        if (animalForm) animalForm.style.display = "none";
        if (rescueForm) rescueForm.style.display = "none";
        if (adoptForm) adoptForm.style.display = "none";
        if (historyForm) historyForm.style.display = "none";
    }

    function showSection(section) {
        hideForms();

        sidebarItems.forEach(item => {
            item.classList.toggle("active", item.dataset.section === section);
        });

        const content = sectionContent[section];
        if (content) {
            if (sectionTitle) sectionTitle.textContent = content.title;
            if (sectionDescription) sectionDescription.textContent = content.description;
        }

        if (section === "animal" && animalForm) animalForm.style.display = "block";
        if (section === "rescue" && rescueForm) rescueForm.style.display = "block";
        if (section === "adopt" && adoptForm) adoptForm.style.display = "block";

        if (section === "history" && historyForm) {
            historyForm.style.display = "block";
            loadAnimalHistory();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    sidebarItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            showSection(item.dataset.section);
        });
    });

    function getLocation(input, button, statusElement, onSuccess) {
        if (!navigator.geolocation) {
            showMessage("Geolocation is not supported by your browser.");
            return;
        }

        const originalText = button?.textContent || "Use My Location";

        if (button) {
            button.disabled = true;
            button.textContent = "Getting Location...";
        }

        if (statusElement) statusElement.textContent = "Getting your location...";

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;

                if (input) {
                    input.value = `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`;
                }

                if (typeof onSuccess === "function") onSuccess(latitude, longitude);

                if (button) {
                    button.disabled = false;
                    button.textContent = "Location Added";
                }

                if (statusElement) statusElement.textContent = "Location detected successfully.";
            },
            error => {
                console.error("Geolocation error:", error);

                const messages = {
                    1: "Location permission denied. Please allow location access.",
                    2: "Your location is unavailable.",
                    3: "Location request timed out. Please try again."
                };

                if (button) {
                    button.disabled = false;
                    button.textContent = originalText;
                }

                if (statusElement) {
                    statusElement.textContent = messages[error.code] || "Unable to get your location.";
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    $("locationBtn")?.addEventListener("click", () => {
        getLocation($("locationInput"), $("locationBtn"), $("feedLocationStatus"), (lat, lon) => {
            feedLatitude = lat;
            feedLongitude = lon;
        });
    });

    $("rescueLocationBtn")?.addEventListener("click", () => {
        getLocation($("rescueLocation"), $("rescueLocationBtn"), $("rescueLocationStatus"), (lat, lon) => {
            rescueLatitude = lat;
            rescueLongitude = lon;
        });
    });

    $("adoptLocationBtn")?.addEventListener("click", () => {
        getLocation($("adoptLocation"), $("adoptLocationBtn"), $("adoptLocationStatus"), (lat, lon) => {
            adoptLatitude = lat;
            adoptLongitude = lon;
        });
    });

    function validateFile(file, allowVideo = false) {
        if (!file) return false;

        const allowed = allowVideo ?
            ["image/jpeg", "image/png", "image/jpg", "video/mp4"] :
            ["image/jpeg", "image/png", "image/jpg"];

        if (!allowed.includes(file.type)) {
            showMessage(allowVideo ? "Upload JPG, PNG or MP4 files only." : "Upload JPG or PNG images only.");
            return false;
        }

        const maxSize = allowVideo ? 20 * 1024 * 1024 : 10 * 1024 * 1024;

        if (file.size > maxSize) {
            showMessage(`File size cannot exceed ${allowVideo ? "20" : "10"} MB.`);
            return false;
        }

        return true;
    }

    function renderPreview(file, container, className = "seva-preview-item") {
        if (!file || !container) return;

        const wrapper = document.createElement("div");
        wrapper.className = className;

        const isVideo = file.type.startsWith("video/");
        const media = document.createElement(isVideo ? "video" : "img");
        media.controls = isVideo;
        media.alt = "Uploaded proof preview";

        const reader = new FileReader();
        reader.onload = event => {
            media.src = event.target.result;
        };
        reader.readAsDataURL(file);

        wrapper.appendChild(media);
        container.appendChild(wrapper);
    }

    function addOptionalCoordinates(formData, latitude, longitude) {
        if (latitude !== null && latitude !== undefined) formData.append("latitude", String(latitude));
        if (longitude !== null && longitude !== undefined) formData.append("longitude", String(longitude));
    }

    const proofMedia = $("proofMedia");
    const previewContainer = $("previewContainer");

    proofMedia?.addEventListener("change", function() {
        const allFiles = Array.from(this.files || []);

        if (allFiles.length > 5) showMessage("You can upload up to 5 files.");

        selectedFiles = allFiles.slice(0, 5).filter(file => validateFile(file, true));

        if (previewContainer) previewContainer.replaceChildren();

        selectedFiles.forEach(file => {
            const wrapper = document.createElement("div");
            wrapper.className = "seva-preview-item";

            const isVideo = file.type.startsWith("video/");
            const media = document.createElement(isVideo ? "video" : "img");
            media.controls = isVideo;
            media.alt = "Feeding proof preview";

            const reader = new FileReader();
            reader.onload = event => {
                media.src = event.target.result;
            };
            reader.readAsDataURL(file);

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "seva-preview-remove";
            remove.textContent = "×";
            remove.setAttribute("aria-label", "Remove uploaded file");

            remove.addEventListener("click", () => {
                selectedFiles = selectedFiles.filter(item => item !== file);
                wrapper.remove();
                proofMedia.value = "";
                updateFeedVerificationMessage();
            });

            wrapper.append(media, remove);
            previewContainer?.appendChild(wrapper);
        });

        updateFeedVerificationMessage();
    });

    // multi-upload.js tells us the full photo list changed (add / remove)
    proofMedia?.addEventListener("mu-change", () => {
        selectedFiles = Array.from(proofMedia.files || []);
        updateFeedVerificationMessage();
    });

    function updateFeedVerificationMessage() {
        const aiText = $("aiVerificationText");
        const aiStatus = $("aiStatus");

        if (!aiText || !aiStatus) return;

        if (selectedFiles.length > 0) {
            aiText.textContent = "Proof uploaded. Your submission will be reviewed after saving.";
            aiStatus.textContent = "Ready";
            aiStatus.classList.add("checking");
            aiStatus.classList.remove("verified");
        } else {
            aiText.textContent = "Upload proof to enable AI verification.";
            aiStatus.textContent = "Waiting";
            aiStatus.classList.remove("checking", "verified");
        }
    }

    $("descriptionInput")?.addEventListener("input", event => {
        if ($("feedCharCount")) $("feedCharCount").textContent = event.target.value.length;
    });

    $("submitSeva")?.addEventListener("click", async () => {
        const button = $("submitSeva");
        const animalType = $("animalType")?.value.trim() || "";
        const location = $("locationInput")?.value.trim() || "";
        const description = $("descriptionInput")?.value.trim() || "";

        if (selectedFiles.length === 0) {
            showMessage("Please upload a photo or video as proof.");
            return;
        }
        if (!location) {
            showMessage("Please enter the feeding location.");
            return;
        }
        if (!animalType) {
            showMessage("Please enter the animal type.");
            return;
        }
        if (!description) {
            showMessage("Please describe your feeding activity.");
            return;
        }

        const formData = new FormData();

        selectedFiles.forEach(file => {
            formData.append("proof_media", file, file.name);
        });

        formData.append("animal_type", animalType);
        formData.append("location", location);
        formData.append("description", description);
        addOptionalCoordinates(formData, feedLatitude, feedLongitude);

        setButtonLoading(button, true, "Submitting...", "Submit Seva for Verification");

        if ($("aiStatus")) {
            $("aiStatus").textContent = "Submitting";
            $("aiStatus").classList.add("checking");
        }

        try {
            const savedRecord = await apiRequest(API.feed, { method: "POST", body: formData });

            if ($("successMessage")) $("successMessage").classList.add("show");

            if ($("aiStatus")) {
                $("aiStatus").textContent = savedRecord.status || "Pending";
                $("aiStatus").classList.remove("checking");
            }

            if ($("aiVerificationText")) {
                $("aiVerificationText").textContent = "Your feeding activity has been saved and is awaiting verification.";
            }

            $("animalForm")?.querySelectorAll("input, textarea").forEach(element => {
                if (element.type !== "file") element.value = "";
            });

            selectedFiles = [];
            feedLatitude = null;
            feedLongitude = null;

            if (proofMedia) proofMedia.value = "";
            proofMedia?.dispatchEvent(new Event("mu-reset"));
            if (previewContainer) previewContainer.replaceChildren();
            if ($("feedCharCount")) $("feedCharCount").textContent = "0";

            await loadAnimalHistory();
            showMessage(`Feeding activity saved successfully. +${savedRecord.karma_points ?? KARMA.feed} Karma recorded.`);
        } catch (error) {
            console.error("Feed an Animal error:", error);
            showMessage(error.message || "Unable to save feeding activity.");
        } finally {
            setButtonLoading(button, false, "", "Submit Seva for Verification");
        }
    });

    $("rescuePhoto")?.addEventListener("change", function() {
        const preview = $("rescuePreview");
        if (preview) preview.replaceChildren();

        const file = this.files?.[0];
        if (!file) return;

        if (!validateFile(file, false)) {
            this.value = "";
            return;
        }

        renderPreview(file, preview, "rescue-preview-item");
    });

    $("rescueDescription")?.addEventListener("input", event => {
        if ($("rescueCharCount")) $("rescueCharCount").textContent = event.target.value.length;
    });

    $("submitRescue")?.addEventListener("click", async () => {
        const button = $("submitRescue");
        const photo = $("rescuePhoto")?.files?.[0];
        const location = $("rescueLocation")?.value.trim() || "";
        const description = $("rescueDescription")?.value.trim() || "";
        const priority = document.querySelector('input[name="priority"]:checked')?.value || "normal";

        if (!photo || !validateFile(photo, false)) {
            showMessage("Please upload a JPG or PNG photo of the animal.");
            return;
        }
        if (!location) {
            showMessage("Please enter the animal's location.");
            return;
        }
        if (!description) {
            showMessage("Please describe the rescue situation.");
            return;
        }

        const formData = new FormData();
        formData.append("photo", photo, photo.name);
        formData.append("location", location);
        formData.append("description", description);
        formData.append("priority", priority);
        addOptionalCoordinates(formData, rescueLatitude, rescueLongitude);

        setButtonLoading(button, true, "Submitting Report...", "Submit Rescue Report");

        try {
            const savedRecord = await apiRequest(API.rescue, { method: "POST", body: formData });

            if ($("reportStatus")) {
                $("reportStatus").textContent = savedRecord.status || "Pending";
                $("reportStatus").classList.add("submitted");
            }

            if ($("reportStatusText")) {
                $("reportStatusText").textContent = `Your ${priority} rescue report has been saved and is awaiting review.`;
            }

            if ($("rescueSuccess")) $("rescueSuccess").classList.add("show");

            $("rescuePhoto").value = "";
            $("rescuePhoto").dispatchEvent(new Event("mu-reset"));
            $("rescuePreview")?.replaceChildren();
            $("rescueLocation").value = "";
            $("rescueDescription").value = "";
            rescueLatitude = null;
            rescueLongitude = null;
            if ($("rescueCharCount")) $("rescueCharCount").textContent = "0";

            await loadAnimalHistory();
            showMessage(`Rescue report saved successfully. +${savedRecord.karma_points ?? KARMA.rescue} Karma recorded.`);
        } catch (error) {
            console.error("Rescue report error:", error);
            showMessage(error.message || "Unable to save rescue report.");
        } finally {
            setButtonLoading(button, false, "", "Submit Rescue Report");
        }
    });

    const adoptTabs = document.querySelectorAll(".adopt-tab");
    const listAnimalSection = $("listAnimalSection");
    const findAnimalSection = $("findAnimalSection");

    adoptTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            adoptTabs.forEach(item => item.classList.remove("active"));
            tab.classList.add("active");

            const showList = tab.dataset.adoptTab === "list";

            if (listAnimalSection) listAnimalSection.style.display = showList ? "block" : "none";
            if (findAnimalSection) findAnimalSection.style.display = showList ? "none" : "block";

            if (!showList) loadAvailableAnimals();
        });
    });

    $("adoptAnimalPhoto")?.addEventListener("change", function() {
        const preview = $("adoptPhotoPreview");
        if (preview) preview.replaceChildren();

        const file = this.files?.[0];
        if (!file) return;

        if (!validateFile(file, false)) {
            this.value = "";
            return;
        }

        renderPreview(file, preview);
    });

    $("listAnimalBtn")?.addEventListener("click", async () => {
        const button = $("listAnimalBtn");
        const photo = $("adoptAnimalPhoto")?.files?.[0];
        const name = $("adoptAnimalName")?.value.trim() || "";
        const type = $("adoptAnimalType")?.value || "";
        const age = $("adoptAnimalAge")?.value.trim() || "";
        const gender = $("adoptAnimalGender")?.value || "";
        const location = $("adoptLocation")?.value.trim() || "";
        const details = $("adoptAnimalDetails")?.value.trim() || "";
        const contact = $("adopterContact")?.value.trim() || "";

        if (!photo || !validateFile(photo, false)) {
            showMessage("Please upload a JPG or PNG animal photo.");
            return;
        }

        if (!name || !type || !age || !gender || !location || !details || !contact) {
            showMessage("Please complete all animal listing fields.");
            return;
        }

        const formData = new FormData();
        formData.append("photo", photo, photo.name);
        formData.append("animal_name", name);
        formData.append("animal_type", type);
        formData.append("age", age);
        formData.append("gender", gender);
        formData.append("location", location);
        formData.append("details", details);
        formData.append("contact", contact);

        setButtonLoading(button, true, "Submitting...", "List Animal for Adoption");

        try {
            const savedRecord = await apiRequest(API.adopt, { method: "POST", body: formData });

            if ($("adoptionListSuccess")) $("adoptionListSuccess").classList.add("show");

            $("adoptAnimalPhoto").value = "";
            $("adoptAnimalPhoto").dispatchEvent(new Event("mu-reset"));
            $("adoptPhotoPreview")?.replaceChildren();
            $("adoptAnimalName").value = "";
            $("adoptAnimalType").value = "";
            $("adoptAnimalAge").value = "";
            $("adoptAnimalGender").value = "";
            $("adoptLocation").value = "";
            $("adoptAnimalDetails").value = "";
            $("adopterContact").value = "";
            adoptLatitude = null;
            adoptLongitude = null;

            await loadAnimalHistory();
            showMessage(`Animal listing saved successfully. +${savedRecord.karma_points ?? KARMA.adopt} Karma recorded.`);
        } catch (error) {
            console.error("Adoption listing error:", error);
            showMessage(error.message || "Unable to save animal listing.");
        } finally {
            setButtonLoading(button, false, "", "List Animal for Adoption");
        }
    });

    async function loadAvailableAnimals() {
        const container = $("adoptionCards");
        if (!container) return;

        container.textContent = "Loading available animals...";

        try {
            const data = await apiRequest(API.adopt, { method: "GET" });
            const records = Array.isArray(data) ? data : data.items || [];

            container.replaceChildren();

            if (records.length === 0) {
                const empty = document.createElement("p");
                empty.textContent = "No animals are currently listed for adoption.";
                container.appendChild(empty);
                return;
            }

            records.forEach(animal => {
                const card = document.createElement("div");
                card.className = "adoption-card";

                const imageWrap = document.createElement("div");
                imageWrap.className = "adoption-card-image";

                if (animal.photo_path) {
                    const image = document.createElement("img");
                    image.src = animal.photo_path.startsWith("http") ?
                        animal.photo_path :
                        `${API_BASE_URL}${animal.photo_path.startsWith("/") ? "" : "/"}${animal.photo_path}`;
                    image.alt = animal.animal_name || "Animal";
                    imageWrap.appendChild(image);
                } else {
                    imageWrap.textContent = "🐾";
                }

                const content = document.createElement("div");
                content.className = "adoption-card-content";

                const title = document.createElement("h3");
                title.textContent = animal.animal_name || "Animal";

                const details = document.createElement("p");
                details.textContent = animal.details || "Looking for a safe and loving home.";

                const type = document.createElement("span");
                type.textContent = animal.animal_type || "Animal";

                const location = document.createElement("span");
                location.textContent = `📍 ${animal.location || "Location not provided"}`;

                const contact = document.createElement("button");
                contact.type = "button";
                contact.className = "contact-adopter-btn";
                contact.textContent = "Contact Rescuer";
                contact.addEventListener("click", () => {
                    const message = $("contactMessage");
                    if (message) {
                        message.textContent = `Contact for ${animal.animal_name || "this animal"}: ${animal.contact || "Contact details unavailable"}`;
                        message.style.display = "block";
                    }
                    if ($("adoptionStatus")) {
                        $("adoptionStatus").textContent = "Contact Started";
                        $("adoptionStatus").classList.add("submitted");
                    }
                    if ($("adoptionStatusText")) {
                        $("adoptionStatusText").textContent = `You have started a contact request for ${animal.animal_name || "this animal"}.`;
                    }
                });

                content.append(title, details, type, location, contact);
                card.append(imageWrap, content);
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Available animals error:", error);
            container.textContent = error.message || "Unable to load animals. Please check your backend.";
        }
    }

    function updateKarmaDisplay(total) {
        const value = Math.max(0, Number(total) || 0);
        const formatted = value.toLocaleString("en-IN");

        if (sidebarKarma) sidebarKarma.textContent = formatted;
        if (karmaProgress) karmaProgress.style.width = `${Math.min((value % 1000) / 10, 100)}%`;
        if ($("historyTotalKarma")) $("historyTotalKarma").textContent = formatted;
        if ($("historyBottomTotal")) $("historyBottomTotal").textContent = formatted;
    }

    function addCell(row, value, className = "") {
        const cell = document.createElement("td");
        const span = document.createElement("span");
        span.textContent = value ?? "—";
        if (className) span.className = className;
        cell.appendChild(span);
        row.appendChild(cell);
    }

    function getActivityLabel(record) {
        const type = String(record.activity_type || record.activity || "").toLowerCase();

        if (type === "feed" || type.includes("feed")) return "Feed an Animal";
        if (type === "rescue" || type.includes("rescue")) return "Rescue & Report";
        if (type === "adopt" || type.includes("adopt")) return "Adopt / Help a Stray";

        return record.title || record.activity_type || record.activity || "Animal Activity";
    }

    function renderHistory(records, backendTotal = null) {
        const historyList = $("animalHistoryList");
        const historyEmpty = $("historyEmpty");

        if (!historyList) return;

        historyList.replaceChildren();

        let calculatedTotal = 0;
        let feedCount = 0;
        let rescueCount = 0;
        let adoptionCount = 0;

        records.forEach(record => {
            const activityType = String(record.activity_type || record.activity || "").toLowerCase();
            const activityLabel = getActivityLabel(record);
            const points = Number(record.karma_points ?? record.karma ?? 0);

            calculatedTotal += points;

            if (activityType === "feed" || activityType.includes("feed")) {
                feedCount++;
            } else if (activityType === "rescue" || activityType.includes("rescue")) {
                rescueCount++;
            } else if (activityType === "adopt" || activityType.includes("adopt")) {
                adoptionCount++;
            }

            const row = document.createElement("tr");
            const activityCell = document.createElement("td");
            const activityWrap = document.createElement("div");
            activityWrap.className = "history-activity";

            const iconSpan = document.createElement("span");
            iconSpan.className = "history-activity-icon";
            iconSpan.textContent = activityType.includes("rescue") ? "🚑" : activityType.includes("adopt") ? "🏠" : "🐕";

            const activitySpan = document.createElement("span");
            activitySpan.textContent = record.title || activityLabel;

            activityWrap.append(iconSpan, activitySpan);
            activityCell.appendChild(activityWrap);
            row.appendChild(activityCell);

            const date = record.date || record.created_at;
            const displayDate = date ?
                new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) :
                "—";

            addCell(row, displayDate, "history-date");
            addCell(row, record.details || record.description || record.location || "—", "history-details");
            addCell(row, record.status || "Pending", "history-status-badge");
            addCell(row, `+${points} pts`, "history-karma");

            historyList.appendChild(row);
        });

        if (historyEmpty) historyEmpty.style.display = records.length ? "none" : "block";

        if ($("feedHistoryCount")) $("feedHistoryCount").textContent = feedCount;
        if ($("rescueHistoryCount")) $("rescueHistoryCount").textContent = rescueCount;
        if ($("adoptionHistoryCount")) $("adoptionHistoryCount").textContent = adoptionCount;

        updateKarmaDisplay(backendTotal ?? calculatedTotal);
    }

    async function loadAnimalHistory() {
        const historyEmpty = $("historyEmpty");

        if (historyEmpty) {
            historyEmpty.style.display = "block";
            historyEmpty.textContent = "Loading your animal history...";
        }

        try {
            const data = await apiRequest(API.history, { method: "GET" });
            const records = Array.isArray(data) ? data : data.records || data.history || [];

            renderHistory(records, data.total_karma_points);
        } catch (error) {
            console.error("Animal history error:", error);

            if (historyEmpty) {
                historyEmpty.style.display = "block";
                historyEmpty.textContent = "Could not load animal history. Please check the backend API.";
            }
        }
    }

    document.querySelectorAll(".contact-adopter-btn").forEach(button => {
        button.addEventListener("click", () => {
            const animal = button.dataset.animal || "this animal";
            const contactMessage = $("contactMessage");

            if (contactMessage) {
                contactMessage.textContent = `You selected ${animal}. Please use the rescuer's contact details to continue.`;
                contactMessage.style.display = "block";
            }

            if ($("adoptionStatus")) {
                $("adoptionStatus").textContent = "Contact Started";
                $("adoptionStatus").classList.add("submitted");
            }

            if ($("adoptionStatusText")) {
                $("adoptionStatusText").textContent = `You have started a contact request for ${animal}.`;
            }
        });
    });

    updateKarmaDisplay(0);
    loadAnimalHistory();
    showSection("animal");

    console.log("Jeeva Karma frontend initialized.");
});
