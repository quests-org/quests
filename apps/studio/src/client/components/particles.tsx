import React, { useCallback, useEffect, useRef, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
}

interface ParticlesProps {
  className?: string;
  color?: string;
  color2?: string;
  disableMouseMovement?: boolean;
  ease?: number;
  mobileBreakpoint?: number;
  quantityDesktop?: number;
  quantityMobile?: number;
  refresh?: boolean;
  size?: number;
  staticity?: number;
  vx?: number;
  vy?: number;
}

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  const hexInt = Number.parseInt(hex, 16);
  const red = (hexInt >> 16) & 255;
  const green = (hexInt >> 8) & 255;
  const blue = hexInt & 255;
  return [red, green, blue];
}

function mixColors(
  color1: [number, number, number],
  color2: [number, number, number],
  ratio: number,
): number[] {
  return [
    Math.round(color1[0] * (1 - ratio) + color2[0] * ratio),
    Math.round(color1[1] * (1 - ratio) + color2[1] * ratio),
    Math.round(color1[2] * (1 - ratio) + color2[2] * ratio),
  ];
}

const remapValue = (
  value: number,
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): number => {
  const remapped =
    ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
  return Math.max(remapped, 0);
};

function useMousePosition(): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return mousePosition;
}

const Particles: React.FC<ParticlesProps> = ({
  className = "",
  color = "#ffffff",
  color2 = "#ffffff",
  disableMouseMovement = false,
  ease = 50,
  mobileBreakpoint = 768,
  quantityDesktop = 100,
  quantityMobile = 50,
  refresh = false,
  size = 0.4,
  staticity = 50,
  vx = 0,
  vy = 0,
}): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mousePosition = useMousePosition();
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ h: number; w: number }>({ h: 0, w: 0 });
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio;

  const [quantity, setQuantity] = useState(quantityDesktop);

  const circleParams = (): Circle => {
    const x = Math.floor(Math.random() * canvasSize.current.w);
    const y = Math.floor(Math.random() * canvasSize.current.h);
    const translateX = 0;
    const translateY = 0;
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = 0;
    const targetAlpha = Number.parseFloat(
      (Math.random() * 0.6 + 0.1).toFixed(1),
    );
    const dx = (Math.random() - 0.5) * 0.05;
    const dy = (Math.random() - 0.5) * 0.05;
    const magnetism = 0.1 + Math.random() * 4;

    // Mix colors based on random ratio
    const rgb1 = hexToRgb(color);
    const rgb2 = hexToRgb(color2);
    const mixRatio = Math.random();
    const mixedColor = mixColors(rgb1, rgb2, mixRatio);

    return {
      alpha,
      color: mixedColor,
      dx,
      dy,
      magnetism,
      size: pSize,
      targetAlpha,
      translateX,
      translateY,
      x,
      y,
    };
  };

  const drawCircle = (circle: Circle, update = false) => {
    if (context.current) {
      const {
        alpha,
        color: circleColor,
        size: circleSize,
        translateX,
        translateY,
        x,
        y,
      } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, circleSize, 0, 2 * Math.PI);
      context.current.fillStyle = `rgba(${circleColor.join(", ")}, ${alpha})`;
      context.current.fill();
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!update) {
        circles.current.push(circle);
      }
    }
  };

  const clearContext = () => {
    if (context.current) {
      context.current.clearRect(
        0,
        0,
        canvasSize.current.w,
        canvasSize.current.h,
      );
    }
  };

  const animate = () => {
    clearContext();
    // eslint-disable-next-line unicorn/no-array-for-each
    circles.current.forEach((circle: Circle, i: number) => {
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      // eslint-disable-next-line unicorn/no-array-reduce
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = Number.parseFloat(
        remapValue(closestEdge, 0, 20, 0, 1).toFixed(2),
      );
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;

      if (!disableMouseMovement) {
        circle.translateX +=
          (mouse.current.x / (staticity / circle.magnetism) -
            circle.translateX) /
          ease;
        circle.translateY +=
          (mouse.current.y / (staticity / circle.magnetism) -
            circle.translateY) /
          ease;
      }

      drawCircle(circle, true);

      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current.splice(i, 1);
        const newCircle = circleParams();
        drawCircle(newCircle);
      }
    });
    window.requestAnimationFrame(animate);
  };

  const resizeCanvas = () => {
    if (canvasRef.current && context.current) {
      circles.current.length = 0;
      canvasSize.current.w = window.innerWidth;
      canvasSize.current.h = window.innerHeight;
      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `100vw`;
      canvasRef.current.style.height = `100vh`;
      context.current.scale(dpr, dpr);
    }
  };

  const drawParticles = () => {
    clearContext();
    circles.current = [];
    for (let i = 0; i < quantity; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  };

  const onMouseMove = () => {
    if (canvasRef.current && !disableMouseMovement) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { h, w } = canvasSize.current;
      const x = mousePosition.x - rect.left - w / 2;
      const y = mousePosition.y - rect.top - h / 2;
      const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    }
  };

  const initCanvas = useCallback(() => {
    resizeCanvas();
    drawParticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, color]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < mobileBreakpoint) {
        setQuantity(quantityMobile);
      } else {
        setQuantity(quantityDesktop);
      }
      initCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [quantityDesktop, quantityMobile, mobileBreakpoint, initCanvas]);

  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext("2d");
    }
    initCanvas();
    animate();
    window.addEventListener("resize", initCanvas);

    return () => {
      window.removeEventListener("resize", initCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, initCanvas]);

  useEffect(() => {
    onMouseMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mousePosition.x, mousePosition.y, disableMouseMovement]);

  useEffect(() => {
    initCanvas();
  }, [refresh, initCanvas]);

  interface Circle {
    alpha: number;
    color: number[];
    dx: number;
    dy: number;
    magnetism: number;
    size: number;
    targetAlpha: number;
    translateX: number;
    translateY: number;
    x: number;
    y: number;
  }

  return (
    <div
      aria-hidden="true"
      className={`${className} fixed inset-0`}
      ref={canvasContainerRef}
    >
      <canvas ref={canvasRef} style={{ height: "100vh", width: "100vw" }} />
    </div>
  );
};

export default Particles;
