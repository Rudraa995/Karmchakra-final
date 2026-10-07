document.addEventListener("DOMContentLoaded", function() {

    /* =========================================
       SECTION SWITCHING
    ========================================= */

    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const sections = document.querySelectorAll(".dashboard-section");
    const pageTitle = document.getElementById("pageTitle");
    const pageDescription = document.getElementById("pageDescription");
    const sidebar = document.getElementById("sidebar");
    const mobileMenu = document.getElementById("mobileMenu");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const sectionInfo = {
        "feed-hungry": {
            title: "Feed the Hungry",
            description: "Distribute meals to people in need."
        },
        "donate-essentials": {
            title: "Donate Essentials",
            description: "Give old clothes, blankets or books to those who need them."
        },
        "elderly-care": {
            title: "Elderly Care Visit",
            description: "Spend time helping or checking in on elderly people."
        },
        "teach-support": {
            title: "Community Teaching Support",
            description: "Teach or mentor underprivileged children or adults."
        }
    };

    const basePoints = {
        "feed-hungry": 80,
        "donate-essentials": 60,
        "elderly-care": 90,
        "teach-support": 70
    };

    function showSection(sectionId) {
        sections.forEach(s => s.classList.remove("active"));
        sidebarItems.forEach(i => i.classList.remove("active"));

        const selected = document.getElementById(sectionId);
        if (selected) selected.classList.add("active");

        sidebarItems.forEach(item => {
            if (item.dataset.section === sectionId) item.classList.add("active");
        });

        if (sectionInfo[sectionId]) {
            pageTitle.textContent = sectionInfo[sectionId].title;
            pageDescription.textContent = sectionInfo[sectionId].description;
        }

        closeSidebar();
    }

    sidebarItems.forEach(item => {
        item.addEventListener("click", function() {
            showSection(item.dataset.section);
        });
    });

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
    }

    mobileMenu.addEventListener("click", function() {
        sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
    });

    sidebarOverlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeSidebar();
    });

    showSection("feed-hungry");


    /* =========================================
       FORM BEHAVIOUR — applied to every .sevaActivityForm
    ========================================= */

    document.querySelectorAll(".sevaActivityForm").forEach(function(form) {

        const activityId = form.dataset.activity;

        const photoInput = form.querySelector(".js-photo-input");
        const photoGrid = form.querySelector(".js-photo-grid");

        const locationInput = form.querySelector(".js-location-input");
        const locationBtn = form.querySelector(".js-location-btn");
        const locationStatus = form.querySelector(".js-location-status");

        const description = form.querySelector(".js-description");
        const charCount = form.querySelector(".js-char-count");

        /* MULTI PHOTO PREVIEW */
        photoInput.addEventListener("change", function() {
            photoGrid.innerHTML = "";

            const files = Array.from(photoInput.files);

            if (files.length > 5) {
                alert("You can upload maximum 5 photos.");
                photoInput.value = "";
                return;
            }

            files.forEach(function(file) {
                if (file.size > 10 * 1024 * 1024) {
                    alert(`${file.name} is larger than 10 MB.`);
                    return;
                }

                if (!file.type.startsWith("image/")) {
                    alert(`${file.name} is not a valid image.`);
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "seva-photo-preview";

                    wrapper.innerHTML = `
            <img src="${e.target.result}" alt="Seva proof">
            <button type="button" class="remove-seva-photo">×</button>
          `;

                    photoGrid.appendChild(wrapper);

                    wrapper.querySelector(".remove-seva-photo").addEventListener("click", function() {
                        wrapper.remove();
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        /* GPS */
        locationBtn.addEventListener("click", function() {
            if (!navigator.geolocation) {
                locationStatus.textContent = "Geolocation is not supported by your browser.";
                locationStatus.classList.add("error");
                return;
            }

            locationStatus.textContent = "Getting your location...";
            locationStatus.classList.remove("error");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    locationInput.value = `${lat}, ${lng}`;
                    locationStatus.textContent = "✓ Location detected successfully.";
                    locationStatus.classList.remove("error");
                },
                () => {
                    locationStatus.textContent = "Unable to get location. Please allow location access.";
                    locationStatus.classList.add("error");
                }
            );
        });

        /* CHARACTER COUNT */
        description.addEventListener("input", function() {
            charCount.textContent = description.value.length;
        });

        /* SUBMIT */
        form.addEventListener("submit", function(e) {
            e.preventDefault();

            if (!photoInput.files.length) {
                alert("Please upload at least one proof photo.");
                return;
            }
            if (!locationInput.value) {
                alert("Please get your GPS location.");
                return;
            }

            const submitBtn = form.querySelector(".submit-btn");
            const submitText = form.querySelector(".js-submit-text");
            const submitLoader = form.querySelector(".js-submit-loader");

            submitBtn.disabled = true;
            submitText.textContent = "Submitting...";
            submitLoader.style.display = "inline";

            setTimeout(function() {
                submitBtn.disabled = false;
                submitText.textContent = "Submit for Verification";
                submitLoader.style.display = "none";

                document.getElementById("successPoints").textContent =
                    `+${basePoints[activityId] || 80} Mudrā`;

                document.getElementById("successOverlay").style.display = "flex";
            }, 1500);
        });
    });


    /* =========================================
       CLOSE SUCCESS POPUP
    ========================================= */

    document.getElementById("closeSuccess").addEventListener("click", function() {
        document.getElementById("successOverlay").style.display = "none";

        const activeForm = document.querySelector(".dashboard-section.active .sevaActivityForm");
        if (activeForm) {
            activeForm.reset();
            const photoGrid = activeForm.querySelector(".js-photo-grid");
            const charCount = activeForm.querySelector(".js-char-count");
            const locationStatus = activeForm.querySelector(".js-location-status");

            photoGrid.innerHTML = "";
            charCount.textContent = "0";
            locationStatus.textContent = "";
        }
    });

});