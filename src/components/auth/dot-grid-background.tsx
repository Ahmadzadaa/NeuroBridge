"use client";

import { useEffect, useRef } from "react";

/**
 * Signature login background: a barely-visible indigo dot grid that slowly
 * drifts — suggests an active system running underneath. Canvas-based,
 * pointer-events none, respects prefers-reduced-motion (renders static grid).
 */
export function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const SPACING = 36; // Distance between dots
    const DOT_RADIUS = 1.2;
    const OPACITY = 0.07; // Very subtle
    const SPEED = prefersReduced ? 0 : 0.3; // Drift speed

    let offset = 0;
    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = document.documentElement.classList.contains("dark");
      // Brand indigo — matches --primary tokens (#4F46E5 light / #6366F1 dark)
      ctx.fillStyle = isDark
        ? `rgba(99, 102, 241, ${OPACITY})`
        : `rgba(79, 70, 229, ${OPACITY})`;

      const cols = Math.ceil(canvas.width / SPACING) + 2;
      const rows = Math.ceil(canvas.height / SPACING) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING + (offset % SPACING) - SPACING;
          const y = j * SPACING + ((offset * 0.4) % SPACING) - SPACING;
          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      offset += SPEED;
      if (!prefersReduced) {
        animationId = requestAnimationFrame(draw);
      }
    };

    // Redraw the static grid when the theme class flips (reduced-motion case;
    // the animated loop picks up theme changes on its own each frame)
    const themeObserver = new MutationObserver(() => {
      if (prefersReduced) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const onResize = () => {
      resize();
      if (prefersReduced) draw();
    };

    resize();
    draw();

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
