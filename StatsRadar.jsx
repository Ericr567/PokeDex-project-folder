import React from "react";

const STAT_ABBR = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "SPD",
};

const MAX_STAT = 180;

const StatsRadar = ({ stats, color = "#d13325" }) => {
  const SIZE = 220;
  const C = SIZE / 2;
  const R = 72;
  const LR = R + 24;
  const n = stats.length;

  const angle = (i) => (2 * Math.PI * i) / n - Math.PI / 2;

  const pt = (i, ratio) => ({
    x: C + R * ratio * Math.cos(angle(i)),
    y: C + R * ratio * Math.sin(angle(i)),
  });

  const path = (pts) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + "Z";

  const rings = [0.25, 0.5, 0.75, 1].map((r) => path(stats.map((_, i) => pt(i, r))));

  const dataPath = path(stats.map((s, i) => pt(i, Math.min(s.base_stat / MAX_STAT, 1))));

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      style={{ display: "block", margin: "0 auto" }}
    >
      {rings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#e0d8bc" strokeWidth={i === 3 ? 1.5 : 0.8} />
      ))}
      {stats.map((_, i) => {
        const outer = pt(i, 1);
        return <line key={i} x1={C} y1={C} x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)} stroke="#e0d8bc" strokeWidth="0.8" />;
      })}
      <path
        d={dataPath}
        fill={color}
        fillOpacity="0.3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {stats.map((s, i) => {
        const lx = C + LR * Math.cos(angle(i));
        const ly = C + LR * Math.sin(angle(i));
        return (
          <text
            key={i}
            x={lx.toFixed(2)}
            y={ly.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontFamily="'Press Start 2P', sans-serif"
            fill="#5a4a2a"
          >
            {STAT_ABBR[s.stat.name] || s.stat.name.slice(0, 3).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
};

export default StatsRadar;
