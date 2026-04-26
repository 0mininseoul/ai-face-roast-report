"use client";

import { motion } from "framer-motion";

export interface CardConnector {
  key: string;
  index: number;
  active: boolean;
  source?: { x: number; y: number } | null;
}

const FACE_TARGETS: Record<string, [number, number]> = {
  meta: [50, 36],
  geometry: [56, 42],
  forehead: [50, 31],
  eyes: [50, 43],
  nose: [50, 53],
  mouth: [50, 61],
  jaw: [50, 69],
  skin: [61, 55],
  scores: [43, 68],
  impression: [59, 64],
  conclusion: [50, 72],
};

export function CardConnectors({ connectors }: { connectors: CardConnector[] }) {
  if (connectors.length === 0) return null;

  return (
    <svg className="pointer-events-none fixed inset-0 z-[15] h-screen w-screen" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="connectorGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.55" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="connectorActive" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(125,216,255,0.38)" />
          <stop offset="65%" stopColor="rgba(125,216,255,0.92)" />
          <stop offset="100%" stopColor="rgba(245,247,251,1)" />
        </linearGradient>
      </defs>
      {connectors.map((connector) => {
        const [x1, y1] = connector.source ? [connector.source.x, connector.source.y] : connectorSource(connector.index, connector.key);
        const [x2, y2] = FACE_TARGETS[connector.key] ?? [50, 50];
        return (
          <g key={connector.key}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(0,0,0,0.48)"
              strokeWidth={connector.active ? 0.52 : 0.32}
              vectorEffect="non-scaling-stroke"
            />
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: connector.active ? 1 : 0.52 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={connector.active ? "url(#connectorActive)" : "rgba(125,216,255,0.68)"}
              strokeWidth={connector.active ? 0.34 : 0.18}
              strokeDasharray={connector.active ? "1.1 0.52" : "0.45 0.82"}
              vectorEffect="non-scaling-stroke"
              filter={connector.active ? "url(#connectorGlow)" : undefined}
            />
            <circle
              cx={x1}
              cy={y1}
              r={connector.active ? 0.42 : 0.28}
              fill={connector.active ? "rgba(245,247,251,0.9)" : "rgba(125,216,255,0.56)"}
              filter={connector.active ? "url(#connectorGlow)" : undefined}
            />
            {connector.active && <circle cx={x2} cy={y2} r="0.56" fill="rgba(245,247,251,0.94)" filter="url(#connectorGlow)" />}
          </g>
        );
      })}
    </svg>
  );
}

function connectorSource(index: number, key: string): [number, number] {
  if (key === "conclusion") return [50, 80];
  const isLeft = index % 2 === 0;
  const row = Math.floor(index / 2);
  return [isLeft ? 26 : 74, 11 + row * 11.4];
}
