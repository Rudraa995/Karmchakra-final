// multi-upload.js (v4)
// Adds multi-photo upload (add more, remove one by one, max 10) to image file inputs.
// Put <script src="multi-upload.js"></script> just before </body>, AFTER the page's own script.
(function() {
    var MAX_FILES = 10,
        MAX_SIZE = 10 * 1024 * 1024;

    var st = document.createElement("style");
    st.textContent =
        ".mu-list,.seva-photo-grid,.seva-preview,.photo-preview-list,.emergency-preview-list{display:flex!important;flex-wrap:wrap;gap:10px!important;grid-template-columns:none!important;margin-top:12px}" +
        ".mu-thumb,.seva-photo-preview,.seva-preview-item,.photo-preview-item,.rescue-preview-item{position:relative;width:88px!important;height:70px!important;flex:0 0 88px!important;aspect-ratio:auto!important;border-radius:10px!important;overflow:hidden;border:1px solid rgba(217,152,18,.35)!important;background:#180a03}" +
        ".mu-thumb img,.seva-photo-preview img,.seva-preview-item img,.seva-preview-item video,.photo-preview-item img,.rescue-preview-item img{width:100%!important;height:100%!important;object-fit:cover!important;display:block}" +
        ".mu-remove,.remove-seva-photo,.seva-preview-remove{position:absolute!important;top:4px!important;right:4px!important;width:20px!important;height:20px!important;padding:0!important;border:0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8)!important;color:#fff!important;font-size:14px!important;line-height:1;cursor:pointer}" +
        ".mu-remove:hover,.remove-seva-photo:hover,.seva-preview-remove:hover{background:#c0392b!important}" +
        ".seva-preview-item span{display:none!important}" +
        ".photo-preview-container.active,.incident-preview-container.active{display:inline-block!important}" +
        ".photo-preview-container img,.incident-preview-container img{width:auto!important;max-width:160px!important;max-height:110px!important;border-radius:10px!important}" +
        ".mu-count{flex-basis:100%;font-size:12px;color:#a99a86}" +
        ".mu-video{display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:6px;font-size:11px;color:#f4e8cf;text-align:center;word-break:break-all;overflow:hidden}" +
        ".mu-hide{display:none!important}";
    document.head.appendChild(st);

    function wantsThis(input) {
        var a = (input.getAttribute("accept") || "").toLowerCase();
        if (a.indexOf("video") !== -1) return true; // photo + video box (Jeeva feed form)
        if (!a) return true; // no accept = any file, treat as photo
        return a.indexOf("image") !== -1 || /\.(jpe?g|png)/.test(a);
    }

    function init(input) {
        if (input.dataset.mu) return;
        input.dataset.mu = "1";
        input.multiple = true;

        // photo+video boxes: up to 5 files, 20 MB. Photo-only boxes: up to 10 photos, 10 MB.
        var hasVideo = (input.getAttribute("accept") || "").toLowerCase().indexOf("video") !== -1;
        var max = hasVideo ? 5 : 10;
        var maxSize = hasVideo ? 20 * 1024 * 1024 : MAX_SIZE;
        var allowedType = hasVideo ? /^(image\/(jpe?g|png)|video\/mp4)$/i : /^image\/(jpe?g|png)$/i;
        var typeMsg = hasVideo ? "Only JPG, JPEG, PNG or MP4 files are allowed." : "Only JPG, JPEG or PNG photos are allowed.";

        // hide the page's own (big) preview boxes near this input
        var holder = (input.closest("label") || input).parentElement;
        var scope = input.closest(".form-section, .seva-form-group, .emergency-form-section") || holder;
        if (scope) {
            scope.querySelectorAll('[class*="preview"], [id*="review"]').forEach(function(el) {
                if (!el.classList.contains("mu-list") && !el.closest(".mu-list")) el.classList.add("mu-hide");
            });
        }

        var list = document.createElement("div");
        list.className = "mu-list";
        (input.closest("label") || input).insertAdjacentElement("afterend", list);

        var items = []; // {file, url}

        // page JS can call: input.dispatchEvent(new Event("mu-reset")) after a successful submit
        input.addEventListener("mu-reset", function() {
            items.forEach(function(i) { if (i.url) URL.revokeObjectURL(i.url); });
            items = [];
            render();
        });

        function sync() {
            var dt = new DataTransfer();
            items.forEach(function(i) { dt.items.add(i.file); });
            input.files = dt.files;
            render();
            // tell the page's own JS that the full photo list changed
            input.dispatchEvent(new CustomEvent("mu-change", { bubbles: true }));
        }

        function render() {
            list.innerHTML = "";
            if (!items.length) return;
            items.forEach(function(it, idx) {
                var box = document.createElement("div");
                box.className = "mu-thumb";
                var media;
                if (it.url) {
                    media = document.createElement("img");
                    media.src = it.url;
                    media.alt = "Selected photo " + (idx + 1);
                } else {
                    media = document.createElement("div");
                    media.className = "mu-video";
                    media.textContent = "🎬 " + it.file.name;
                }
                var rm = document.createElement("button");
                rm.type = "button";
                rm.className = "mu-remove";
                rm.setAttribute("aria-label", "Remove photo");
                rm.textContent = "×";
                rm.addEventListener("click", function() {
                    URL.revokeObjectURL(it.url);
                    items.splice(idx, 1);
                    sync();
                });
                box.append(media, rm);
                list.appendChild(box);
            });
            var c = document.createElement("div");
            c.className = "mu-count";
            c.textContent = items.length + " / " + max + (hasVideo ? " files" : " photos") + " · tap the upload box to add more";
            list.appendChild(c);
        }

        input.addEventListener("change", function() {
            var picked = Array.prototype.slice.call(input.files);
            var msg = "";
            picked.forEach(function(f) {
                if (!allowedType.test(f.type)) { msg = typeMsg; return; }
                if (f.size > maxSize) { msg = "Each file must be under " + (maxSize / 1048576) + " MB."; return; }
                if (items.length >= max) { msg = "You can upload up to " + max + " files here."; return; }
                var dup = items.some(function(i) {
                    return i.file.name === f.name && i.file.size === f.size && i.file.lastModified === f.lastModified;
                });
                if (!dup) items.push({ file: f, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : "" });
            });
            if (msg) alert(msg);
            sync();
        });

        if (input.form) {
            input.form.addEventListener("reset", function() {
                items.forEach(function(i) { URL.revokeObjectURL(i.url); });
                items = [];
                setTimeout(render, 0);
            });
        }
    }

    function run() {
        var count = 0;
        document.querySelectorAll('input[type="file"]').forEach(function(inp) {
            if (wantsThis(inp)) { init(inp);
                count++; }
        });
        // Visible proof in the browser console (F12) that this file is loaded
        console.log("multi-upload.js ready — photo inputs found: " + count);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
})();