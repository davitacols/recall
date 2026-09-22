import React, { useEffect, useRef } from "react";

/**
 * A live knowledge graph, rendered on canvas.
 *
 * This is the product's own subject rather than decoration: a decision at the
 * centre, with the pull requests, documents, threads and people that connect
 * to it. Nodes drift under a light force simulation, edges pulse as
 * "reasoning" travels along them, and the whole thing leans toward the cursor.
 *
 * Canvas rather than SVG because there are ~200 moving primitives per frame,
 * and canvas draws that without touching the DOM. Canvas rather than WebGL
 * because a 2D graph is far more legible than a 3D one — depth cues fight
 * edge-tracing, which is the one thing a viewer actually needs to do here.
 *
 * Honours prefers-reduced-motion by rendering a single static frame, and
 * pauses entirely when scrolled out of view so it costs nothing off-screen.
 */

const NODES = [
  { id: "dec", label: "DEC-128", kind: "decision", x: 0.5, y: 0.5, r: 9 },
  { id: "pr1", label: "#412", kind: "pr", x: 0.22, y: 0.26, r: 6 },
  { id: "pr2", label: "#418", kind: "pr", x: 0.79, y: 0.3, r: 6 },
  { id: "doc", label: "Rollout brief", kind: "doc", x: 0.16, y: 0.7, r: 6 },
  { id: "retro", label: "Sprint 42 retro", kind: "thread", x: 0.8, y: 0.74, r: 6 },
  { id: "who", label: "Priya", kind: "person", x: 0.5, y: 0.14, r: 5 },
  { id: "old", label: "DEC-119", kind: "superseded", x: 0.46, y: 0.87, r: 5 },
  { id: "chan", label: "#eng-releases", kind: "thread", x: 0.06, y: 0.46, r: 5 },
];

const EDGES = [
  ["dec", "pr1"], ["dec", "pr2"], ["dec", "doc"], ["dec", "retro"],
  ["dec", "who"], ["dec", "old"], ["doc", "chan"], ["retro", "pr2"],
];

// Tuned against the page's warm ground rather than pure hues, so the graph
// sits in the palette instead of on top of it.
const COLORS = {
  decision: "#d97706",
  pr: "#6d28d9",
  doc: "#0f766e",
  thread: "#3a3530",
  person: "#b45309",
  superseded: "#a8a29e",
};

export default function KnowledgeGraphCanvas({ className = "" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext("2d");
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Working copies so the module-level layout stays pristine across mounts.
    const nodes = NODES.map((n) => ({
      ...n,
      // Per-node drift phase, so nothing moves in lockstep.
      phase: Math.random() * Math.PI * 2,
      ox: 0,
      oy: 0,
    }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = null;
    let running = true;
    let t = 0;
    const pointer = { x: 0.5, y: 0.5, active: false };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pos = (n) => {
      // Parallax: nodes lean toward the cursor, further ones lean more.
      const lean = pointer.active ? (n.id === "dec" ? 4 : 12) : 0;
      const px = (pointer.x - 0.5) * lean;
      const py = (pointer.y - 0.5) * lean;
      return { x: n.x * w + n.ox + px, y: n.y * h + n.oy + py };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      if (!reduce) {
        t += 0.006;
        for (const n of nodes) {
          n.ox = Math.cos(t + n.phase) * (n.id === "dec" ? 2 : 6);
          n.oy = Math.sin(t * 0.9 + n.phase) * (n.id === "dec" ? 2 : 6);
        }
      }

      // Edges first, so nodes sit on top of their own connections.
      for (const [a, b] of EDGES) {
        const p1 = pos(byId[a]);
        const p2 = pos(byId[b]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "rgba(15, 12, 8, 0.13)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (reduce) continue;

        // A pulse travelling the edge — reasoning propagating between records.
        const seed = (a.charCodeAt(0) + b.charCodeAt(1)) % 10;
        const prog = ((t * 0.5 + seed / 10) % 1);
        const px = p1.x + (p2.x - p1.x) * prog;
        const py = p1.y + (p2.y - p1.y) * prog;
        const fade = Math.sin(prog * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(217, 119, 6, ${0.5 * fade})`;
        ctx.fill();
      }

      for (const n of nodes) {
        const p = pos(n);
        const color = COLORS[n.kind] || COLORS.thread;

        if (n.kind === "decision") {
          // Halo, so the decision reads as the thing everything else hangs off.
          const pulse = reduce ? 0 : (Math.sin(t * 1.6) + 1) / 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, n.r + 8 + pulse * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(217, 119, 6, ${0.10 - pulse * 0.04})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.kind === "superseded" ? "#fdfcf9" : color;
        ctx.fill();
        ctx.lineWidth = n.kind === "superseded" ? 1.5 : 0;
        if (n.kind === "superseded") {
          ctx.strokeStyle = color;
          ctx.stroke();
        }

        ctx.font =
          '500 13px ui-monospace, "SF Mono", "JetBrains Mono", Consolas, monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(58, 53, 48, 0.72)";
        ctx.fillText(n.label, p.x, p.y + n.r + 7);
      }
    };

    const loop = () => {
      if (!running) return;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e) => {
      const rect = wrap.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = (e.clientY - rect.top) / rect.height;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    resize();
    if (reduce) {
      draw();
    } else {
      loop();
    }

    // Stop drawing entirely when off-screen — an idle rAF loop on a marketing
    // page is a battery cost for nothing.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running && !reduce) {
          running = true;
          loop();
        } else if (!entry.isIntersecting) {
          running = false;
          if (raf) cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(wrap);

    wrap.addEventListener("pointermove", onPointer);
    wrap.addEventListener("pointerleave", onLeave);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointermove", onPointer);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`kgc ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
