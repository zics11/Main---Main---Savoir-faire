(function () {
  class CarteFrance extends HTMLElement {
    static get observedAttributes() { return ["data", "active"]; }
    connectedCallback() {
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      if (this.getAttribute("height")) this.style.height = this.getAttribute("height");
      else if (!this.style.height) this.style.height = "100%";
      if (!this._ro && window.ResizeObserver) {
        this._ro = new ResizeObserver(() => {
          if (!this._metro) return;
          const h = this.clientHeight, w = this.clientWidth;
          if (h > 80 && (h !== this._lastH || w !== this._lastW)) this.draw();
        });
        this._ro.observe(this);
      }
      if (!this._boot) {
        this._boot = true;
        this.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8a8072;font:13px monospace">chargement de la carte…</div>';
        this.waitLibs().then(() => this.loadGeo()).then(() => this.draw()).catch(() => {
          this.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8a8072;font:12px monospace">carte indisponible</div>';
        });
      }
    }
    attributeChangedCallback(name, oldV, newV) {
      if (!this._metro) return;
      if (name === "active") { this.applyActive(); return; }
      this.draw();
    }
    waitLibs() {
      return new Promise((res, rej) => {
        let n = 0;
        const t = setInterval(() => {
          if (window.d3 && window.topojson) { clearInterval(t); res(); }
          else if (++n > 120) { clearInterval(t); rej(new Error("libs")); }
        }, 100);
      });
    }
    async loadGeo() {
      const topo = await (await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json")).json();
      const fr = topojson.feature(topo, topo.objects.countries).features.find((f) => f.id === "250");
      const polys = fr.geometry.coordinates.filter((poly) => {
        const [lon, lat] = poly[0][0];
        return lon > -6 && lon < 10 && lat > 41 && lat < 52;
      });
      this._metro = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: polys } };
    }
    points() {
      try { return JSON.parse(this.getAttribute("data") || "[]"); } catch (e) { return []; }
    }
    applyActive() {
      const active = this.getAttribute("active") || "";
      const nodes = this._nodes || {};
      const k = this._k || 1;
      Object.keys(nodes).forEach((id) => {
        const on = id === active;
        nodes[id].halo.setAttribute("r", (on ? 18 : 11) / k);
        nodes[id].dot.setAttribute("r", (on ? 8 : 5.5) / k);
        nodes[id].dot.setAttribute("fill", on ? "#2b2620" : "#a3512a");
      });
    }
    draw() {
      const w = this.clientWidth || 640;
      const h = this.clientHeight > 80 ? this.clientHeight : 720;
      this._lastW = w; this._lastH = h;
      const metro = this._metro;
      const proj = d3.geoConicConformal().parallels([44, 49]).rotate([-3, 0]).fitExtent([[24, 24], [w - 24, h - 24]], metro);
      const path = d3.geoPath(proj);
      const svg = d3.create("svg").attr("width", w).attr("height", h).attr("viewBox", "0 0 " + w + " " + h).style("display", "block").style("cursor", "grab");
      const world = svg.append("g");
      const land = world.append("path").attr("d", path(metro)).attr("fill", "#f1ebdf").attr("stroke", "#d5cdbd").attr("stroke-width", 1.2);
      const g = world.append("g");
      const tip = document.createElement("div");
      tip.style.cssText = "position:absolute;pointer-events:none;background:#2b2620;color:#faf8f4;font:12.5px/1.45 'Work Sans',sans-serif;padding:8px 11px;border-radius:2px;opacity:0;transition:opacity .12s;max-width:220px;z-index:5;box-shadow:0 6px 18px rgba(43,38,32,.22)";
      const active = this.getAttribute("active") || "";
      this._nodes = {};
      this.points().forEach((p) => {
        const xy = proj([p.lon, p.lat]);
        if (!xy) return;
        const on = active && active === p.id;
        const halo = g.append("circle").attr("cx", xy[0]).attr("cy", xy[1]).attr("r", on ? 18 : 11).attr("fill", "#a3512a").attr("opacity", 0.16);
        const dot = g.append("circle").attr("cx", xy[0]).attr("cy", xy[1]).attr("r", on ? 8 : 5.5)
          .attr("fill", on ? "#2b2620" : "#a3512a").attr("stroke", "#faf8f4").attr("stroke-width", 1.6)
          .style("cursor", "pointer")
          .on("mouseenter", (ev) => {
            tip.innerHTML = '<strong style="font-weight:600">' + p.nom + '</strong><br>' + p.savoirFaire + '<br><span style="color:#b9b0a2">' + p.lieu + '</span>';
            const host = this.getBoundingClientRect();
            const px = ev && ev.clientX ? ev.clientX - host.left : xy[0];
            const py = ev && ev.clientY ? ev.clientY - host.top : xy[1];
            tip.style.left = Math.min(px + 14, w - 232) + "px";
            tip.style.top = Math.max(py - 18, 4) + "px";
            tip.style.opacity = 1;
            this.dispatchEvent(new CustomEvent("point-enter", { detail: p, bubbles: true }));
          })
          .on("mouseleave", () => { tip.style.opacity = 0; this.dispatchEvent(new CustomEvent("point-leave", { bubbles: true })); })
          .on("click", () => { if (p.href) window.location.href = p.href; });
        this._nodes[p.id] = { halo: halo.node(), dot: dot.node(), xy: xy };
      });

      const self = this;
      const zoom = d3.zoom().scaleExtent([1, 12]).translateExtent([[0, 0], [w, h]]).on("zoom", (ev) => {
        const k = ev.transform.k;
        self._k = k;
        world.attr("transform", ev.transform);
        land.attr("stroke-width", 1.2 / k);
        Object.keys(self._nodes).forEach((id) => {
          const on = id === (self.getAttribute("active") || "");
          self._nodes[id].halo.setAttribute("r", (on ? 18 : 11) / k);
          self._nodes[id].dot.setAttribute("r", (on ? 8 : 5.5) / k);
          self._nodes[id].dot.setAttribute("stroke-width", 1.6 / k);
        });
        tip.style.opacity = 0;
      });
      svg.call(zoom).on("dblclick.zoom", null)
        .on("mousedown", function () { this.style.cursor = "grabbing"; })
        .on("mouseup", function () { this.style.cursor = "grab"; });
      this._zoom = zoom;
      this._svgSel = svg;

      const ctrls = document.createElement("div");
      ctrls.style.cssText = "position:absolute;right:20px;top:20px;display:flex;flex-direction:column;gap:1px;background:#e2dbcb;border:1px solid #e2dbcb;border-radius:2px;overflow:hidden;z-index:6";
      [["+", 1.6], ["\u2212", 1 / 1.6], ["\u21ba", 0]].forEach(([label, f]) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.style.cssText = "width:34px;height:34px;background:#faf8f4;border:none;font:15px 'Work Sans',sans-serif;color:#2b2620;cursor:pointer;line-height:1";
        b.onmouseenter = () => { b.style.background = "#f6e8de"; };
        b.onmouseleave = () => { b.style.background = "#faf8f4"; };
        b.onclick = () => {
          if (f === 0) svg.transition().duration(260).call(zoom.transform, d3.zoomIdentity);
          else svg.transition().duration(200).call(zoom.scaleBy, f);
        };
        ctrls.appendChild(b);
      });

      this.innerHTML = "";
      this.appendChild(svg.node());
      this.appendChild(tip);
      this.appendChild(ctrls);
    }
  }
  if (!customElements.get("carte-france")) customElements.define("carte-france", CarteFrance);
})();
