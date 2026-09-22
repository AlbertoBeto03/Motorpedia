/* Motorpedia V4.3 — robust image rendering + detail hero carousel */
(() => {
  const MEDIA_VERSION = "4.3";

  function mediaAssetUrl(path) {
    const raw = String(path || "").trim();
    if (!raw) return "";
    try {
      if (/^https?:\/\//i.test(raw)) return raw;
      const clean = raw.replace(/^\.?\//, "");
      const url = new URL(clean, document.baseURI);
      // Cache-busting only for the media renderer version. It does not alter the file path.
      url.searchParams.set("mpv", MEDIA_VERSION);
      return url.href;
    } catch (err) {
      return raw;
    }
  }

  function v43MediaImages(v) {
    return Array.isArray(v?.media?.images)
      ? v.media.images.filter(Boolean).slice(0, 2)
      : [];
  }

  // Replace the V4 image URL helper with a version that resolves paths explicitly
  // against the current GitHub Pages base URL.
  vehicleCoverHtml = function(v) {
    const images = v43MediaImages(v);

    if (!images.length) {
      return `<span class="vehicleMark">${escapeHtml(initials(v.brand))}</span>`;
    }

    const src = mediaAssetUrl(images[0]);

    return `<img
      class="vehicleCover"
      src="${escapeAttr(src)}"
      alt="${escapeAttr(v.name)}"
      loading="lazy"
      decoding="async"
      data-vehicle-image
      data-vehicle-image-path="${escapeAttr(images[0])}">
      <span class="vehicleMark vehicleMediaFallback" hidden>${escapeHtml(initials(v.brand))}</span>`;
  };

  // V4 could mark a lazy image as failed immediately if naturalWidth was still 0.
  // V4.3 only falls back after a real browser "error" event.
  bindVehicleImages = function(scope = document) {
    if (!scope) return;

    scope.querySelectorAll("img[data-vehicle-image]").forEach(img => {
      if (img.dataset.mediaBound === "1") return;
      img.dataset.mediaBound = "1";

      const markLoaded = () => {
        img.classList.add("is-loaded");
        img.classList.remove("is-failed");
        img.style.display = "block";
        const fallback = img.nextElementSibling;
        if (fallback?.classList?.contains("vehicleMediaFallback")) {
          fallback.hidden = true;
          fallback.style.display = "none";
        }
      };

      img.addEventListener("load", markLoaded);

      img.addEventListener("error", () => {
        img.classList.add("is-failed");
        img.style.display = "none";

        const fallback = img.nextElementSibling;
        if (fallback?.classList?.contains("vehicleMediaFallback")) {
          fallback.hidden = false;
          fallback.style.display = "flex";
        }
      });

      // A cached image may already be fully loaded before the listener is attached.
      // Positive naturalWidth is safe; V4.3 deliberately never treats naturalWidth=0
      // as an error until the browser fires the real "error" event.
      if (img.complete && img.naturalWidth > 0) {
        markLoaded();
      }
    });
  };

  function detailHeroMediaHtml(v) {
    const images = v43MediaImages(v);
    if (!images.length) return "";

    return `<div class="detailHeroMediaPanel" data-detail-media>
      <div class="detailHeroMediaStage">
        ${images.map((path, index) => `
          <img
            class="detailHeroSlide ${index === 0 ? "is-active" : ""}"
            src="${escapeAttr(mediaAssetUrl(path))}"
            alt="${escapeAttr(`${v.name} — foto ${index + 1}`)}"
            ${index === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}
            decoding="async"
            data-detail-slide
            data-slide-index="${index}">
        `).join("")}

        ${images.length > 1 ? `
          <button
            type="button"
            class="detailMediaNext"
            data-detail-media-next
            aria-label="Ver siguiente fotografía"
            title="Siguiente fotografía">›</button>
          <span class="detailMediaCounter" data-detail-media-counter>1 / ${images.length}</span>
        ` : ""}
      </div>
    </div>`;
  }

  function bindDetailMediaViewer(scope = document) {
    if (!scope) return;

    scope.querySelectorAll("[data-detail-media]").forEach(viewer => {
      if (viewer.dataset.viewerBound === "1") return;
      viewer.dataset.viewerBound = "1";

      const allSlides = [...viewer.querySelectorAll("[data-detail-slide]")];
      const nextButton = viewer.querySelector("[data-detail-media-next]");
      const counter = viewer.querySelector("[data-detail-media-counter]");
      let current = 0;

      const validSlides = () => allSlides.filter(slide => !slide.classList.contains("is-failed"));

      const activate = index => {
        const available = validSlides();
        if (!available.length) {
          viewer.classList.add("mediaUnavailable");
          if (nextButton) nextButton.hidden = true;
          if (counter) counter.hidden = true;
          return;
        }

        viewer.classList.remove("mediaUnavailable");
        current = ((index % available.length) + available.length) % available.length;

        allSlides.forEach(slide => slide.classList.remove("is-active"));
        available[current].classList.add("is-active");

        if (counter) {
          const absoluteIndex = Number(available[current].dataset.slideIndex || 0) + 1;
          counter.textContent = `${absoluteIndex} / ${allSlides.length}`;
          counter.hidden = available.length < 2;
        }

        if (nextButton) {
          nextButton.hidden = available.length < 2;
          nextButton.setAttribute(
            "aria-label",
            current === available.length - 1 ? "Volver a la primera fotografía" : "Ver siguiente fotografía"
          );
        }
      };

      allSlides.forEach(slide => {
        slide.addEventListener("load", () => {
          slide.classList.add("is-loaded");
        });

        slide.addEventListener("error", () => {
          slide.classList.add("is-failed");
          slide.classList.remove("is-active");
          activate(current);
        });
      });

      nextButton?.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        activate(current + 1);
      });

      activate(0);
    });
  }

  // V4.3 puts photo 1 directly inside the main identity/specification area.
  // Photo 2 is reached with one discreet arrow instead of a second full-width gallery.
  openDetail = function(id) {
    const v = vehicles.find(x => x.id === id);
    if (!v) return;

    const images = v43MediaImages(v);
    const key = [
      ["Potencia", v.power],
      ["Par", v.torque],
      ["Peso", v.weight],
      ["kg/CV", v.kgcv],
    ];

    const keyValue = (label, value) => {
      if (label === "Potencia") return value == null ? "—" : `${formatNumber(value, 0, 1)} CV`;
      if (label === "Par") return value == null ? "—" : `${formatNumber(value, 0, 1)} Nm`;
      if (label === "Peso") return value == null ? "—" : `${formatNumber(value, 0, 0)} kg`;
      return formatKgCv(value);
    };

    const specGroups = groupedDetailSpecs(v);

    $("#dialogContent").innerHTML = `
      <div class="detailHero detailHeroV43 ${images.length ? "hasVehicleMedia" : "noVehicleMedia"}">
        <div class="detailHeroCopy">
          <span class="badge">${v.type === "car" ? "COCHE" : "MOTO"} · ${escapeHtml(v.brand)}</span>
          <h2>${escapeHtml(v.name)}</h2>
          <p>${escapeHtml(v.model || "")} · ${escapeHtml(displayGeneration(v))} · ${escapeHtml(v.yearText || "Año sin especificar")}</p>
          <div class="keySpecs">
            ${key.map(([label, value]) => `
              <div>
                <strong>${escapeHtml(keyValue(label, value))}</strong>
                <span>${escapeHtml(label)}</span>
              </div>
            `).join("")}
          </div>
          ${priceRangeHtml(v)}
        </div>

        ${detailHeroMediaHtml(v)}
      </div>

      <div class="details">
        ${articleSectionHtml(v)}
        ${ratingHtml(v)}
        <section class="specsSection">
          <div class="detailsSectionHead">
            <div>
              <span class="detailKicker">FICHA TÉCNICA</span>
              <h3>Especificaciones</h3>
            </div>
            <span class="specSectionHint">${specGroups.length} bloques</span>
          </div>
          <div class="specGroups">
            ${specGroups.map(specGroupHtml).join("")}
          </div>
        </section>
      </div>`;

    $("#vehicleDialog").showModal();
    bindDetailMediaViewer($("#vehicleDialog"));
    bindArticleLoader($("#vehicleDialog"));
  };

  window.MotorpediaMedia = {
    version: MEDIA_VERSION,
    mediaAssetUrl,
    mediaImages: v43MediaImages,
    bindVehicleImages,
    bindDetailMediaViewer,
  };
})();
