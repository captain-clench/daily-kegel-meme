"use client";

import * as React from "react";
import rough from "roughjs";

interface RoughFinishIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  roughness?: number;
  animate?: boolean;
  animateInterval?: number;
}

export function RoughFinishIcon({
  size = 128,
  color = "#333333",
  strokeWidth = 2,
  roughness = 1,
  animate = false,
  animateInterval = 150,
}: RoughFinishIconProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [seed, setSeed] = React.useState(1);

  // Animate seed for jitter effect
  React.useEffect(() => {
    if (!animate) return;

    const interval = setInterval(() => {
      setSeed(Math.floor(Math.random() * 10000));
    }, animateInterval);

    return () => clearInterval(interval);
  }, [animate, animateInterval]);

  // Draw rough shapes
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);

    // 绘制圆形 (圆心在 512, 512，半径约 468)
    const circle = rc.circle(512, 512, 870, {
      stroke: color,
      strokeWidth: strokeWidth * 4,
      fill: "none",
      roughness,
      seed,
    });
    svg.appendChild(circle);

    // 绘制勾选符号
    // 原始路径的关键点：
    // 起点: (351.92, 506.61) - 勾的左端
    // 中点: (451.98, 606.67) - 勾的底部
    // 终点: (678.24, 363.23) - 勾的右端
    const checkPath = rc.linearPath(
      [
        [352, 507],
        [452, 607],
        [678, 363],
      ],
      {
        stroke: color,
        strokeWidth: strokeWidth * 4,
        roughness,
        seed,
      }
    );
    svg.appendChild(checkPath);
  }, [color, strokeWidth, roughness, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    />
  );
}
