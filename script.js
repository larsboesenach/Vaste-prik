/* ──────────────────────────────────────────────────────────
   Vaste Prik — agenda logica
   Herschreven vanuit de React-versie naar vanilla JavaScript.
   Alles hieronder werkt zichzelf bij: geen React-state nodig,
   alleen de datum van vandaag als input.
   ────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const MAANDNAMEN = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];

  const DAGNAMEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

  // Deze maand en volgende maand worden automatisch berekend vanaf
  // vandaag — dus de knoppen en maandnamen rollen vanzelf door.
  // Niets aan te passen.
  function maandVanaf(offset) {
    const nu = new Date();
    const d = new Date(nu.getFullYear(), nu.getMonth() + offset, 1);
    return { jaar: d.getFullYear(), maand: d.getMonth() };
  }

  // Losse, wisselende extra's per maand. Sleutel = "JAAR-MAAND" (maand 0-gebaseerd).
  // Voorbeeld: "2026-9" is oktober 2026. Voeg hier gewoon nieuwe dagen toe.
  const LOSSE_ACTIVITEITEN = {
    // "2026-9": [{ dag: 15, titel: "Grote pan couscous" }],
  };

  // key → weergave. kleur verwijst naar een palet-variabele.
  const ACTIVITEITEN = {
    koffie: { kort: "Inloop & koffie", label: "Inloop & koffie", tijd: "11:00–15:00", kleur: "var(--vp-green)" },
    weegschaal: { kort: "Weegschaal", label: "Slimme weegschaal & bloeddruk", tijd: "12:00–13:30", kleur: "var(--vp-blue)" },
    beweeg: { kort: "Beweegspreekuur", label: "Beweegspreekuur (met studenten)", tijd: "15:00–17:00", kleur: "var(--vp-orange)" },
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
    if (isMaandag && d >= new Date(2026, 8, 21)) keys.push("beweeg"); // vanaf 21 sept

    return keys;
  }

  function elt(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function renderKalender(jaar, maand) {
    const grid = document.getElementById("calendar-grid");
    const legend = document.getElementById("calendar-legend");
    grid.innerHTML = "";
    legend.innerHTML = "";

    const losse = LOSSE_ACTIVITEITEN[`${jaar}-${maand}`] || [];
    const dagenInMaand = new Date(jaar, maand + 1, 0).getDate();
    const start = (new Date(jaar, maand, 1).getDay() + 6) % 7; // ma = 0
    const vandaag = new Date();

    // Lege cellen vóór de eerste dag van de maand
    for (let i = 0; i < start; i++) {
      grid.appendChild(elt("div", "day-cell empty"));
    }

    for (let dag = 1; dag <= dagenInMaand; dag++) {
      const acts = activiteitenOpDag(jaar, maand, dag);
      const extras = losse.filter((l) => l.dag === dag);
      const isVandaag =
        vandaag.getFullYear() === jaar &&
        vandaag.getMonth() === maand &&
        vandaag.getDate() === dag;

      const cellClasses = ["day-cell"];
      if (acts.length || extras.length) cellClasses.push("has-events");
      if (isVandaag) cellClasses.push("is-today");

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

  let actieveOffset = 0;

  function toonMaand(offset) {
    actieveOffset = offset;
    const m = maandVanaf(offset);
    renderMaandKnoppen(offset);
    renderKalender(m.jaar, m.maand);
  }

  document.querySelectorAll(".month-btn").forEach((btn) => {
    btn.addEventListener("click", () => toonMaand(Number(btn.dataset.offset)));
  });

  // Weekdag-headers (ma..zo) staan al vast in de HTML, maar mochten ze ooit
  // dynamisch moeten zijn, dan zit de volgorde hier klaar: DAGNAMEN.

  // Init
  toonMaand(0);

  // Jaartal in de footer, automatisch bijgewerkt
  document.getElementById("footer-year").textContent = "© " + new Date().getFullYear();
})();
