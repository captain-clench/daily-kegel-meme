"use client";

import * as React from "react";
import rough from "roughjs";
import { cn } from "@/lib/utils";

export interface RoughOptions {
  roughness?: number;
  bowing?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  fillStyle?: "hachure" | "solid" | "zigzag" | "cross-hatch" | "dots" | "dashed" | "zigzag-line";
  fillWeight?: number;
  hachureAngle?: number;
  hachureGap?: number;
  seed?: number;
}

interface RoughCardProps extends React.HTMLAttributes<HTMLDivElement> {
  roughOptions?: RoughOptions;
  padding?: number;
  /** 启用抖动动画 */
  animate?: boolean;
  /** 抖动间隔（毫秒），默认 150 */
  animateInterval?: number;
  /** 先绘制一个 solid 填充的背景垫底 */
  solidBackgroundFill?: string;
}

const defaultRoughOptions: RoughOptions = {
  roughness: 1.5,
  bowing: 1,
  stroke: "#333333",
  strokeWidth: 2,
  fill: "#ffffff",
  fillStyle: "solid",
  seed: 1,
};

function RoughCard({
  className,
  children,
  roughOptions,
  padding = 2,
  animate = true,
  animateInterval = 200,
  solidBackgroundFill = '#ffefefec',
  ...props
}: RoughCardProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [seed, setSeed] = React.useState(roughOptions?.seed ?? 1);

  // Merge options with animated seed
  const options = React.useMemo(
    () => ({ ...defaultRoughOptions, ...roughOptions, seed }),
    [roughOptions, seed]
  );

  // Animate seed for jitter effect
  React.useEffect(() => {
    if (!animate) return;

    const interval = setInterval(() => {
      setSeed(Math.floor(Math.random() * 10000));
    }, animateInterval);

    return () => clearInterval(interval);
  }, [animate, animateInterval]);

  // Observe container size using getBoundingClientRect
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw rough rectangle
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width === 0 || size.height === 0) return;

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);

    // 先绘制 solid 背景垫底
    if (solidBackgroundFill) {
      const bgNode = rc.rectangle(
        padding,
        padding,
        size.width - padding * 2,
        size.height - padding * 2,
        {
          ...options,
          fill: solidBackgroundFill,
          fillStyle: "solid",
          stroke: "none",
          strokeWidth: 0,
        }
      );
      svg.appendChild(bgNode);
    }

    // 绘制主矩形
    const node = rc.rectangle(
      padding,
      padding,
      size.width - padding * 2,
      size.height - padding * 2,
      options
    );
    svg.appendChild(node);
  }, [size, options, padding, solidBackgroundFill]);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      {...props}
    >
      {/* SVG Background */}
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        width={size.width || "100%"}
        height={size.height || "100%"}
        style={{ zIndex: 0 }}
      />
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export { RoughCard };
