"use client";

import { motion } from "framer-motion";

export interface CardConnector {
  key: string;
  index: number;
  active: boolean;
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
        <linearGradient id="connectorActive" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(125,216,255,0.05)" />
          <stop offset="65%" stopColor="rgba(125,216,255,0.7)" />
          <stop offset="100%" stopColor="rgba(245,247,251,0.85)" />
        </linearGradient>
      </defs>
      {connectors.map((connector) => {
        const [x1, y1] = connectorSource(connector.index, connector.key);
        const [x2, y2] = FACE_TARGETS[connector.key] ?? [50, 50];
        return (
          <g key={connector.key}>
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: connector.active ? 0.9 : 0.22 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={connector.active ? "url(#connectorActive)" : "rgba(125,216,255,0.34)"}
              strokeWidth={connector.active ? 0.18 : 0.09}
              strokeDasharray={connector.active ? "0.8 0.5" : "0.3 0.8"}
              vectorEffect="non-scaling-stroke"
            />
            {connector.active && <circle cx={x2} cy={y2} r="0.42" fill="rgba(245,247,251,0.82)" />}
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
  return [isLeft ? 24 : 76, 10 + row * 8.2];
}
