/* ──────────────────────────────────────────────────────────
   Vaste Prik — inhoud + agenda logica

   • Alle teksten, foto's en contactgegevens staan in content.json
     (te bewerken via Pages CMS). Dit script laadt dat bestand en
     vult de pagina. De tekst die al in index.html staat blijft
     als vangnet staan voor het geval content.json niet laadt.
   • De agenda werkt zichzelf bij: alleen de datum van vandaag
     is nodig. Welke activiteit op welke dag valt (bijv. "eerste
     dinsdag van de maand") staat hieronder in activiteitenOpDag().
   ────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const MAANDNAMEN = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];

  const DAGNAMEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxClose = lightbox.querySelector(".lightbox-close");
  let lightboxTrigger;

  function sluitLightbox() {
    lightbox.close();
    if (lightboxTrigger) lightboxTrigger.focus();
  }

  function openLightbox(image) {
    lightboxTrigger = image;
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightbox.showModal();
  }

  document.querySelectorAll("[data-lightbox]").forEach((image) => {
    image.addEventListener("click", () => openLightbox(image));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(image);
      }
    });
  });

  lightboxClose.addEventListener("click", sluitLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) sluitLightbox();
  });
  lightbox.addEventListener("close", () => {
    lightboxImage.removeAttribute("src");
  });

  /* ── Inhoud uit content.json ───────────────────────────── */

  let INHOUD = {};

  // Haal een waarde op via een pad als "hero.titel" of "agenda.activiteiten.koffie.tijd"
  function haal(pad) {
    return pad.split(".").reduce(
      (o, k) => (o !== undefined && o !== null ? o[k] : undefined),
      INHOUD
    );
  }

  // {dagen}, {dagen_kort}, {dagen_titel}, {van}, {tot} → openingstijden uit content.json
  function vervangTokens(tekst) {
    const o = INHOUD.openingstijden || {};
    return String(tekst).replace(/\{(\w+)\}/g, (m, k) =>
      typeof o[k] === "string" ? o[k] : m
    );
  }

  function tekstElt(tag, className, tekst) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    e.textContent = tekst;
    return e;
  }

  function parseDatum(iso) {
    // "2026-10-15" → lokale datum (geen tijdzone-verschuiving)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }

  function zoekParam(adres) {
    return encodeURIComponent(adres).replace(/%20/g, "+");
  }

  function vulTeksten() {
    document.querySelectorAll("[data-c]").forEach((el) => {
      const w = haal(el.dataset.c);
      if (typeof w !== "string") return;
      let t = vervangTokens(w);
      if (el.hasAttribute("data-c-quotes") && t) t = "\u201C" + t + "\u201D";
      el.textContent = t;
    });

    document.querySelectorAll("[data-tpl]").forEach((el) => {
      el.textContent = vervangTokens(el.dataset.tpl);
    });

    document.querySelectorAll("[data-c-src]").forEach((el) => {
      const w = haal(el.dataset.cSrc);
      if (typeof w === "string" && w) el.setAttribute("src", w);
    });
    document.querySelectorAll("[data-c-alt]").forEach((el) => {
      const w = haal(el.dataset.cAlt);
      if (typeof w === "string") el.setAttribute("alt", w);
    });

    // Lijsten van alinea's
    document.querySelectorAll("[data-c-lijst]").forEach((el) => {
      const lijst = haal(el.dataset.cLijst);
      if (!Array.isArray(lijst)) return;
      el.replaceChildren(
        ...lijst.filter(Boolean).map((t) => tekstElt("p", "", vervangTokens(t)))
      );
    });
  }

  function vulLinks() {
    const c = INHOUD.contact;
    if (!c) return;
    const zoek = zoekParam(c.adres_zoek || c.adres || "");
    const links = {
      mail: c.email && "mailto:" + c.email,
      tel: c.telefoon && "tel:" + c.telefoon.replace(/[^\d+]/g, ""),
      maps: zoek && "https://www.google.com/maps/search/?api=1&query=" + zoek,
      route: zoek && "https://www.google.com/maps/dir/?api=1&destination=" + zoek,
    };
    Object.keys(links).forEach((k) => {
      if (!links[k]) return;
      document.querySelectorAll('[data-link="' + k + '"]').forEach((a) => {
        a.setAttribute("href", links[k]);
      });
    });
    const kaart = document.querySelector('[data-link="mapembed"]');
    if (kaart && zoek) {
      kaart.setAttribute("src", "https://www.google.com/maps?q=" + zoek + "&output=embed");
    }
  }

  function vulRecept() {
    const grid = document.getElementById("recept-grid");
    const kaarten = haal("recept.kaarten");
    if (!grid || !Array.isArray(kaarten) || !kaarten.length) return;
    grid.replaceChildren();
    kaarten.forEach((k, i) => {
      const kaart = elt("div", "recept-card");
      const kop = elt("div", "recept-head");
      kop.appendChild(tekstElt("span", "recept-icon", k.icoon || ""));
      kop.appendChild(tekstElt("span", "recept-num", String(i + 1).padStart(2, "0")));
      kaart.appendChild(kop);
      kaart.appendChild(tekstElt("h3", "", k.titel || ""));
      kaart.appendChild(tekstElt("p", "", k.tekst || ""));
      grid.appendChild(kaart);
    });
  }

  function vulMarquee() {
    const track = document.querySelector(".marquee-track");
    const items = haal("marquee");
    if (!track || !Array.isArray(items) || !items.length) return;
    track.replaceChildren();
    // Twee identieke groepen zodat de animatie naadloos doorloopt
    for (let i = 0; i < 2; i++) {
      const groep = elt("div", "marquee-group");
      items.filter(Boolean).forEach((t) => {
        groep.appendChild(tekstElt("span", "", t + " \u00A0\u2022"));
      });
      track.appendChild(groep);
    }
  }

  function vulFaq() {
    const lijst = document.getElementById("faq-list");
    if (!lijst) return;
    const items = Array.isArray(haal("faq")) ? haal("faq") : [];
    lijst.replaceChildren();

    if (!items.length) {
      lijst.innerHTML = "";
      return;
    }

    items.forEach((item, index) => {
      const details = document.createElement("details");
      if (index === 0) details.setAttribute("open", "open");
      const summary = document.createElement("summary");
      summary.textContent = vervangTokens(item.vraag || "Vraag");
      const p = document.createElement("p");
      p.textContent = vervangTokens(item.antwoord || "");
      details.appendChild(summary);
      details.appendChild(p);
      lijst.appendChild(details);
    });
  }

  let testimonialIndex = 0;
  let testimonialTimer = null;

  function getVerhalenItems() {
    const items = haal("verhalen");
    if (Array.isArray(items)) {
      return items.filter((item) => item && (item.quote || item.naam));
    }
    if (items && (items.quote || items.naam)) {
      return [items];
    }
    return [];
  }

  function zetTestimonial(index) {
    const slider = document.querySelector("[data-testimonials]");
    if (!slider) return;
    const slides = slider.querySelectorAll(".testimonial-slide");
    const dots = slider.querySelectorAll(".testimonial-dot");
    const totaal = slides.length || 1;
    testimonialIndex = ((index % totaal) + totaal) % totaal;
    slides.forEach((slide, i) => slide.classList.toggle("active", i === testimonialIndex));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === testimonialIndex));
  }

  function startTestimonialCarousel() {
    const items = getVerhalenItems();
    if (!items.length || items.length < 2) {
      clearTimeout(testimonialTimer);
      testimonialTimer = null;
      return;
    }
    clearTimeout(testimonialTimer);
    testimonialTimer = setTimeout(() => {
      zetTestimonial(testimonialIndex + 1);
      startTestimonialCarousel();
    }, 8000);
  }

  function vulVerhalen() {
    const slider = document.querySelector("[data-testimonials]");
    if (!slider) return;

    const items = getVerhalenItems();
    const track = slider.querySelector(".testimonial-track");
    const dots = slider.querySelector(".testimonial-dots");

    if (!track || !dots) return;

    if (!items.length) {
      slider.hidden = true;
      clearTimeout(testimonialTimer);
      testimonialTimer = null;
      return;
    }

    slider.hidden = false;
    track.replaceChildren();
    dots.replaceChildren();

    items.forEach((item, index) => {
      const slide = elt("article", index === 0 ? "testimonial-slide active" : "testimonial-slide");
      const quote = tekstElt("p", "testimonial-quote", item.quote || "");
      if (item.quote) quote.textContent = "“" + vervangTokens(item.quote) + "”";
      const name = tekstElt("p", "testimonial-name", item.naam || "");
      slide.appendChild(quote);
      slide.appendChild(name);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = index === 0 ? "testimonial-dot active" : "testimonial-dot";
      dot.setAttribute("aria-label", "Bekijk testimonial " + (index + 1));
      dot.addEventListener("click", () => zetTestimonial(index));
      dots.appendChild(dot);
    });

    testimonialIndex = 0;
    zetTestimonial(0);
    startTestimonialCarousel();
  }

  function vulActiviteiten() {
    Object.keys(ACTIVITEITEN).forEach((k) => {
      const j = haal("agenda.activiteiten." + k);
      if (!j) return;
      ["kort", "label", "tijd"].forEach((veld) => {
        if (typeof j[veld] === "string" && j[veld]) ACTIVITEITEN[k][veld] = vervangTokens(j[veld]);
      });
      if (typeof j.vanaf === "string") ACTIVITEITEN[k].vanaf = j.vanaf;
    });
  }

  function vulInhoud() {
    vulTeksten();
    vulLinks();
    vulRecept();
    vulMarquee();
    vulFaq();
    vulVerhalen();
    vulActiviteiten();
  }

  // Deze maand en volgende maand worden automatisch berekend vanaf
  // vandaag — dus de knoppen en maandnamen rollen vanzelf door.
  // Niets aan te passen.
  function maandVanaf(offset) {
    const nu = new Date();
    const d = new Date(nu.getFullYear(), nu.getMonth() + offset, 1);
    return { jaar: d.getFullYear(), maand: d.getMonth() };
  }

  // Losse, wisselende extra's staan in content.json onder
  // agenda.losse_activiteiten, elk met een datum (JJJJ-MM-DD) en een titel.
  function losseActiviteitenVoorMaand(jaar, maand) {
    const lijst = haal("agenda.losse_activiteiten");
    if (!Array.isArray(lijst)) return [];
    const uit = [];
    lijst.forEach((l) => {
      const d = l && parseDatum(l.datum);
      if (d && l.titel && d.getFullYear() === jaar && d.getMonth() === maand) {
        uit.push({ dag: d.getDate(), titel: l.titel });
      }
    });
    return uit;
  }

  // key → weergave. kleur verwijst naar een palet-variabele.
  // kort/label/tijd worden overschreven door content.json (agenda.activiteiten).
  const ACTIVITEITEN = {
    koffie: { kort: "Inloop & koffie", label: "Inloop & koffie", tijd: "11:00–15:00", kleur: "var(--vp-green)" },
    weegschaal: { kort: "Weegschaal", label: "Slimme weegschaal & bloeddruk", tijd: "12:00–13:30", kleur: "var(--vp-blue)" },
    beweeg: { kort: "Beweegspreekuur", label: "Beweegspreekuur (met studenten)", tijd: "15:00–17:00", kleur: "var(--vp-orange)", vanaf: "2026-09-21" },
    stoelyoga: { kort: "Stoelyoga", label: "Stoelyoga", tijd: "ochtend", kleur: "var(--vp-rust)" },
    diabetes: { kort: "Diabetes", label: "Diabetes spreekuur", tijd: "middag", kleur: "#8a6d3b" },
  };

  // Welke activiteiten vallen op een bepaalde datum?
  function activiteitenOpDag(jaar, maand, dag) {
    const d = new Date(jaar, maand, dag);
    const wd = d.getDay(); // 0 = zo … 6 = za
    const dagenInMaand = new Date(jaar, maand + 1, 0).getDate();
    const keys = [];

    const isDinsdag = wd === 2;
    const isVrijdag = wd === 5;
    const isMaandag = wd === 1;

    if (isDinsdag || isVrijdag) keys.push("koffie");
    if (isDinsdag && dag <= 7) keys.push("stoelyoga"); // eerste dinsdag
    if (isVrijdag) keys.push("weegschaal");
    if (isVrijdag && dag > dagenInMaand - 7) keys.push("diabetes"); // laatste vrijdag
    const beweegVanaf = parseDatum(ACTIVITEITEN.beweeg.vanaf);
    if (isMaandag && (!beweegVanaf || d >= beweegVanaf)) keys.push("beweeg"); // vanaf datum uit content.json

    return keys;
  }

  function elt(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  let mobileShowPastDays = false;

  function renderKalender(jaar, maand) {
    const grid = document.getElementById("calendar-grid");
    const legend = document.getElementById("calendar-legend");
    const calendarWrap = document.querySelector(".calendar-wrap");
    const mobileAgenda = window.matchMedia("(max-width: 1030px)").matches;
    grid.innerHTML = "";
    legend.innerHTML = "";

    const losse = losseActiviteitenVoorMaand(jaar, maand);
    const dagenInMaand = new Date(jaar, maand + 1, 0).getDate();
    const vandaag = new Date();
    const dagNamen = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

    if (mobileAgenda) {
      let toggle = document.getElementById("mobile-past-toggle");
      if (!toggle) {
        toggle = document.createElement("button");
        toggle.id = "mobile-past-toggle";
        toggle.type = "button";
        calendarWrap.insertBefore(toggle, grid);
      }
      toggle.className = "btn btn-ghost mobile-past-toggle";
      toggle.textContent = mobileShowPastDays ? "verberg afgelopen dagen" : "toon afgelopen dagen";
      toggle.onclick = () => {
        mobileShowPastDays = !mobileShowPastDays;
        renderKalender(jaar, maand);
      };

      const dagenMetActiviteit = [];

      const vandaagStart = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());

      for (let dag = 1; dag <= dagenInMaand; dag++) {
        const acts = activiteitenOpDag(jaar, maand, dag);
        const extras = losse.filter((l) => l.dag === dag);
        if (!acts.length && !extras.length) continue;

        const date = new Date(jaar, maand, dag);
        dagenMetActiviteit.push({ date, acts, extras, isPast: date < vandaagStart && !(vandaag.getFullYear() === jaar && vandaag.getMonth() === maand && vandaag.getDate() === date.getDate()) });
      }

      const zichtbareDagen = dagenMetActiviteit.filter(({ isPast }) => mobileShowPastDays || !isPast);

      if (!zichtbareDagen.length) {
        const empty = elt("div", "day-cell empty mobile-day-card");
        const emptyText = elt("div", "mobile-empty-state", mobileShowPastDays ? "Geen activiteiten in deze maand" : "Geen komende activiteiten in deze maand");
        empty.appendChild(emptyText);
        grid.appendChild(empty);
      } else {
        zichtbareDagen.forEach(({ date, acts, extras, isPast }) => {
          const isVandaag =
            vandaag.getFullYear() === jaar &&
            vandaag.getMonth() === maand &&
            vandaag.getDate() === date.getDate();

          const cellClasses = ["day-cell", "mobile-day-card"];
          if (acts.length || extras.length) cellClasses.push("has-events");
          if (isVandaag) cellClasses.push("is-today");
          if (isPast) cellClasses.push("is-past");

          const cell = elt("div", cellClasses.join(" "));
          const header = elt("div", "mobile-day-header");
          const formattedDate = new Intl.DateTimeFormat("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }).format(date);
          header.appendChild(elt("span", "mobile-day-date", formattedDate));
          cell.appendChild(header);

          const eventsWrap = elt("div", "day-events mobile-day-events");
          acts.forEach((k) => {
            const a = ACTIVITEITEN[k];
            const row = elt("div", "day-event mobile-day-event");
            row.title = `${a.label} · ${a.tijd}`;
            const dot = elt("span", "day-event-dot");
            dot.style.backgroundColor = a.kleur;
            const textWrap = elt("div", "mobile-event-text");
            textWrap.appendChild(elt("span", "mobile-event-title", a.label));
            textWrap.appendChild(elt("span", "mobile-event-time", a.tijd));
            row.appendChild(dot);
            row.appendChild(textWrap);
            eventsWrap.appendChild(row);
          });
          extras.forEach((e) => {
            const row = elt("div", "day-event mobile-day-event");
            row.title = e.titel;
            const dot = elt("span", "day-event-dot");
            dot.style.backgroundColor = "var(--vp-mustard)";
            const textWrap = elt("div", "mobile-event-text");
            textWrap.appendChild(elt("span", "mobile-event-title", e.titel));
            textWrap.appendChild(elt("span", "mobile-event-time", "Extra activiteit"));
            row.appendChild(dot);
            row.appendChild(textWrap);
            eventsWrap.appendChild(row);
          });
          cell.appendChild(eventsWrap);
          grid.appendChild(cell);
        });
      }
    } else {
      const mobileToggle = document.getElementById("mobile-past-toggle");
      if (mobileToggle && mobileToggle.parentNode) {
        mobileToggle.parentNode.removeChild(mobileToggle);
      }

      const start = (new Date(jaar, maand, 1).getDay() + 6) % 7; // ma = 0

      // Lege cellen vóór de eerste dag van de maand
      for (let i = 0; i < start; i++) {
        grid.appendChild(elt("div", "day-cell empty"));
      }

      const vandaagStart = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());

      for (let dag = 1; dag <= dagenInMaand; dag++) {
        const acts = activiteitenOpDag(jaar, maand, dag);
        const extras = losse.filter((l) => l.dag === dag);
        const date = new Date(jaar, maand, dag);
        const isVandaag =
          vandaag.getFullYear() === jaar &&
          vandaag.getMonth() === maand &&
          vandaag.getDate() === dag;
        const isPast = date < vandaagStart && !isVandaag;

        const cellClasses = ["day-cell"];
        if (acts.length || extras.length) cellClasses.push("has-events");
        if (isVandaag) cellClasses.push("is-today");
        if (isPast) cellClasses.push("is-past");

        const cell = elt("div", cellClasses.join(" "));
        cell.appendChild(elt("div", "day-number", String(dag)));

        const eventsWrap = elt("div", "day-events");
        acts.forEach((k) => {
          const a = ACTIVITEITEN[k];
          const row = elt("div", "day-event");
          row.title = `${a.label} · ${a.tijd}`;
          const dot = elt("span", "day-event-dot");
          dot.style.backgroundColor = a.kleur;
          row.appendChild(dot);
          row.appendChild(elt("span", "day-event-label", a.kort));
          eventsWrap.appendChild(row);
        });
        extras.forEach((e) => {
          const row = elt("div", "day-event");
          row.title = e.titel;
          const dot = elt("span", "day-event-dot");
          dot.style.backgroundColor = "var(--vp-mustard)";
          row.appendChild(dot);
          row.appendChild(elt("span", "day-event-label", e.titel));
          eventsWrap.appendChild(row);
        });
        cell.appendChild(eventsWrap);
        grid.appendChild(cell);
      }
    }

    // Legenda
    Object.keys(ACTIVITEITEN).forEach((k) => {
      const a = ACTIVITEITEN[k];
      const item = elt("span", "legend-item");
      const dot = elt("span", "legend-dot");
      dot.style.backgroundColor = a.kleur;
      item.appendChild(dot);
      item.appendChild(elt("span", "legend-label", a.label));
      item.appendChild(elt("span", "legend-time", a.tijd));
      legend.appendChild(item);
    });
    const wisselItem = elt("span", "legend-item");
    const wisselDot = elt("span", "legend-dot");
    wisselDot.style.backgroundColor = "var(--vp-mustard)";
    wisselItem.appendChild(wisselDot);
    wisselItem.appendChild(elt("span", "legend-label", "Wisselende activiteit"));
    legend.appendChild(wisselItem);
  }

  function renderMaandKnoppen(actieveOffset) {
    const knoppen = document.querySelectorAll(".month-btn");
    knoppen.forEach((btn) => {
      const offset = Number(btn.dataset.offset);
      const m = maandVanaf(offset);
      btn.querySelector(".month-btn-sub").textContent = `${MAANDNAMEN[m.maand]} ${m.jaar}`;
      btn.classList.toggle("active", offset === actieveOffset);
    });
  }

  function zetKaartFallback() {
    const iframe = document.getElementById("map-embed");
    const fallback = document.querySelector(".map-fallback");
    if (!iframe || !fallback) return;
    iframe.hidden = true;
    fallback.hidden = false;
  }

  let actieveOffset = 0;

  function toonMaand(offset) {
    actieveOffset = offset;
    mobileShowPastDays = false;
    const m = maandVanaf(offset);
    renderMaandKnoppen(offset);
    renderKalender(m.jaar, m.maand);
  }

  document.querySelectorAll(".month-btn").forEach((btn) => {
    btn.addEventListener("click", () => toonMaand(Number(btn.dataset.offset)));
  });

  const mapEmbed = document.getElementById("map-embed");
  if (mapEmbed) {
    let heeftFallbackGetoond = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!heeftFallbackGetoond) zetKaartFallback();
    }, 1800);

    mapEmbed.addEventListener("error", () => {
      heeftFallbackGetoond = true;
      window.clearTimeout(fallbackTimer);
      zetKaartFallback();
    });

    mapEmbed.addEventListener("load", () => {
      try {
        const doc = mapEmbed.contentDocument || mapEmbed.contentWindow?.document;
        if (doc && doc.body && doc.body.innerText && doc.body.innerText.trim() !== "") {
          heeftFallbackGetoond = true;
          window.clearTimeout(fallbackTimer);
        } else {
          heeftFallbackGetoond = false;
        }
      } catch (error) {
        heeftFallbackGetoond = true;
        window.clearTimeout(fallbackTimer);
        zetKaartFallback();
      }
    });
  }

  // Weekdag-headers (ma..zo) staan al vast in de HTML, maar mochten ze ooit
  // dynamisch moeten zijn, dan zit de volgorde hier klaar: DAGNAMEN.

  // Init: meteen de kalender tonen (met standaardwaarden), daarna
  // content.json laden en alles opnieuw vullen.
  toonMaand(0);
  document.getElementById("footer-year").textContent = "© " + new Date().getFullYear();

  fetch("content.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      INHOUD = data || {};
      vulInhoud();
      toonMaand(actieveOffset);
    })
    .catch((err) => {
      // Geen ramp: de tekst uit index.html blijft gewoon staan.
      console.warn("content.json kon niet worden geladen:", err);
    });
})();
