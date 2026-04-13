import React from "react";

const TYPE_CHART = {
  normal:   { weak: ["fighting"],                                   immune: ["ghost"],              resist: [] },
  fire:     { weak: ["water", "ground", "rock"],                    immune: [],                     resist: ["fire", "grass", "ice", "bug", "steel", "fairy"] },
  water:    { weak: ["electric", "grass"],                          immune: [],                     resist: ["fire", "water", "ice", "steel"] },
  electric: { weak: ["ground"],                                     immune: [],                     resist: ["electric", "flying", "steel"] },
  grass:    { weak: ["fire", "ice", "poison", "flying", "bug"],     immune: [],                     resist: ["water", "electric", "grass", "ground"] },
  ice:      { weak: ["fire", "fighting", "rock", "steel"],          immune: [],                     resist: ["ice"] },
  fighting: { weak: ["flying", "psychic", "fairy"],                 immune: [],                     resist: ["bug", "rock", "dark"] },
  poison:   { weak: ["ground", "psychic"],                          immune: [],                     resist: ["grass", "fighting", "poison", "bug", "fairy"] },
  ground:   { weak: ["water", "grass", "ice"],                      immune: ["electric"],           resist: ["poison", "rock"] },
  flying:   { weak: ["electric", "ice", "rock"],                    immune: ["ground"],             resist: ["grass", "fighting", "bug"] },
  psychic:  { weak: ["bug", "ghost", "dark"],                       immune: [],                     resist: ["fighting", "psychic"] },
  bug:      { weak: ["fire", "flying", "rock"],                     immune: [],                     resist: ["grass", "fighting", "ground"] },
  rock:     { weak: ["water", "grass", "fighting", "ground", "steel"], immune: [],                 resist: ["normal", "fire", "poison", "flying"] },
  ghost:    { weak: ["ghost", "dark"],                              immune: ["normal", "fighting"], resist: ["poison", "bug"] },
  dragon:   { weak: ["ice", "dragon", "fairy"],                     immune: [],                     resist: ["fire", "water", "electric", "grass"] },
  dark:     { weak: ["fighting", "bug", "fairy"],                   immune: ["psychic"],            resist: ["ghost", "dark"] },
  steel:    { weak: ["fire", "fighting", "ground"],                 immune: ["poison"],             resist: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"] },
  fairy:    { weak: ["poison", "steel"],                            immune: ["dragon"],             resist: ["fighting", "bug", "dark"] },
};

export const TYPE_COLORS = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c",
  grass: "#7ac74c", ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1",
  ground: "#e2bf65", flying: "#a98ff3", psychic: "#f95587", bug: "#a6b91a",
  rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc", dark: "#705746",
  steel: "#b7b7ce", fairy: "#d685ad",
};

const ALL_TYPES = Object.keys(TYPE_CHART);

const computeEffectiveness = (defTypes) => {
  const out = { immune: [], quarter: [], half: [], double: [], quadruple: [] };
  for (const atk of ALL_TYPES) {
    let m = 1;
    for (const def of defTypes) {
      const c = TYPE_CHART[def];
      if (!c) continue;
      if (c.immune.includes(atk)) { m = 0; break; }
      if (c.weak.includes(atk)) m *= 2;
      if (c.resist.includes(atk)) m *= 0.5;
    }
    if (m === 0) out.immune.push(atk);
    else if (m === 0.25) out.quarter.push(atk);
    else if (m === 0.5) out.half.push(atk);
    else if (m === 2) out.double.push(atk);
    else if (m === 4) out.quadruple.push(atk);
  }
  return out;
};

const TypeChip = ({ type }) => (
  <span
    className="type-chip"
    style={{ background: TYPE_COLORS[type] || "#999" }}
  >
    {type}
  </span>
);

const TypeEffectiveness = ({ types }) => {
  const defTypes = types.map((t) => t.type.name);
  const eff = computeEffectiveness(defTypes);

  return (
    <div className="type-effectiveness">
      <h3 className="stats-title">Type Effectiveness</h3>
      {eff.quadruple.length > 0 && (
        <div className="eff-row">
          <span className="eff-label eff-x4">4× Weak</span>
          <div className="eff-chips">{eff.quadruple.map((t) => <TypeChip key={t} type={t} />)}</div>
        </div>
      )}
      {eff.double.length > 0 && (
        <div className="eff-row">
          <span className="eff-label eff-x2">2× Weak</span>
          <div className="eff-chips">{eff.double.map((t) => <TypeChip key={t} type={t} />)}</div>
        </div>
      )}
      {eff.half.length > 0 && (
        <div className="eff-row">
          <span className="eff-label eff-half">½× Resist</span>
          <div className="eff-chips">{eff.half.map((t) => <TypeChip key={t} type={t} />)}</div>
        </div>
      )}
      {eff.quarter.length > 0 && (
        <div className="eff-row">
          <span className="eff-label eff-quarter">¼× Resist</span>
          <div className="eff-chips">{eff.quarter.map((t) => <TypeChip key={t} type={t} />)}</div>
        </div>
      )}
      {eff.immune.length > 0 && (
        <div className="eff-row">
          <span className="eff-label eff-immune">Immune</span>
          <div className="eff-chips">{eff.immune.map((t) => <TypeChip key={t} type={t} />)}</div>
        </div>
      )}
    </div>
  );
};

export default TypeEffectiveness;
