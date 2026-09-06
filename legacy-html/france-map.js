(function () {
  const POINTS = [
    { lon: 4.36, lat: 44.62, label: "Pain au levain — Ardèche", fam: "Alimentation" },
    { lon: -1.68, lat: 48.11, label: "Vannerie — Ille-et-Vilaine", fam: "Artisanat" },
    { lon: 2.29, lat: 43.21, label: "Pierre sèche — Aude", fam: "Habitat" },
    { lon: 5.72, lat: 45.18, label: "Charpente — Isère", fam: "Habitat" },
    { lon: 0.15, lat: 47.99, label: "Forge — Sarthe", fam: "Artisanat" },
    { lon: 6.02, lat: 47.24, label: "Fromage — Doubs", fam: "Alimentation" },
    { lon: -0.57, lat: 44.84, label: "Greffe fruitière — Gironde", fam: "Jardin" },
    { lon: 3.08, lat: 45.77, label: "Coutellerie — Puy-de-Dôme", fam: "Artisanat" },
    { lon: 7.26, lat: 48.58, label: "Brasserie — Bas-Rhin", fam: "Alimentation" },
    { lon: 1.44, lat: 43.6, label: "Enduits terre — Haute-Garonne", fam: "Habitat" },
    { lon: -4.1, lat: 48.28, label: "Apiculture — Finistère", fam: "Jardin" },
    { lon: 4.83, lat: 46.3, label: "Poterie — Saône-et-Loire", fam: "Artisanat" },
    { lon: 2.35, lat: 48.86, label: "Menuiserie — Paris", fam: "Habitat" },
    { lon: 3.88, lat: 43.61, label: "Semences paysannes — Hérault", fam: "Jardin" },
    { lon: 0.69, lat: 47.39, label: "Meunerie — Indre-et-Loire", fam: "Alimentation" },
    { lon: 6.13, lat: 49.11, label: "Cuir — Moselle", fam: "Artisanat" },
  ];
  class FranceMap extends HTMLElement {
    connectedCallback() {
      this.style.display = "block";
      this.style.width = "100%";
      this.style.height = this.getAttribute("height") ? this.getAttribute("height") + "px" : "520px";
      this.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8a8072;font:13px monospace">chargement de la carte…</div>';
      this.waitLibs().then(() => this.render()).catch((e) => {
        this.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8a8072;font:12px monospace">carte de France — indisponible hors ligne</div>';
      });
    }
    waitLibs() {
      return new Promise((res, rej) => {
        let n = 0;
        const t = setInterval(() => {
          if (window.d3 && window.topojson) { clearInterval(t); res(); }
          else if (++n > 100) { clearInterval(t); rej(new Error("libs")); }
        }, 100);
      });
    }
    async render() {
      const topo = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")).json();
      const countries = topojson.feature(topo, topo.objects.countries);
      const fr = countries.features.find((f) => f.id === "250");
      // keep metropolitan polygons only
      const polys = fr.geometry.coordinates.filter((poly) => {
        const [lon, lat] = poly[0][0];
        return lon > -6 && lon < 10 && lat > 41 && lat < 52;
      });
      const metro = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: polys } };
      const w = this.clientWidth || 520, h = this.clientHeight || 560;
      const proj = d3.geoConicConformal().parallels([44, 49]).rotate([-3, 0]).fitExtent([[16, 16], [w - 16, h - 16]], metro);
      const path = d3.geoPath(proj);
      const svg = d3.create("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`).style("display", "block");
      svg.append("path").attr("d", path(metro)).attr("fill", "#f1ebdf").attr("stroke", "#d5cdbd").attr("stroke-width", 1);
      const tip = document.createElement("div");
      tip.style.cssText = "position:absolute;pointer-events:none;background:#2b2620;color:#faf8f4;font:12px 'Work Sans',sans-serif;padding:6px 10px;border-radius:2px;opacity:0;transition:opacity .15s;white-space:nowrap;z-index:5";
      this.style.position = "relative";
      const g = svg.append("g");
      POINTS.forEach((p) => {
        const [x, y] = proj([p.lon, p.lat]);
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", 5).attr("fill", "#a3512a").attr("stroke", "#faf8f4").attr("stroke-width", 1.5).style("cursor", "pointer")
          .on("mouseenter", () => { tip.textContent = p.label; tip.style.left = x + 12 + "px"; tip.style.top = y - 14 + "px"; tip.style.opacity = 1; })
          .on("mouseleave", () => { tip.style.opacity = 0; });
        g.append("circle").attr("cx", x).attr("cy", y).attr("r", 10).attr("fill", "#a3512a").attr("opacity", 0.15);
      });
      this.innerHTML = "";
      this.appendChild(svg.node());
      this.appendChild(tip);
    }
  }
  if (!customElements.get("france-map")) customElements.define("france-map", FranceMap);
})();
