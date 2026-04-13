import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./TeamBuilder.css";
import { ALL_TYPES, TYPE_COLORS, getTypeMultiplier } from "./TypeEffectiveness";
import { preloadPokemonDetails } from "./pokemonDetails";

const TeamBuilder = ({ team, onRemove }) => {
  const slots = Array.from({ length: 6 });
  const [detailsByName, setDetailsByName] = useState({});

  useEffect(() => {
    if (!team.length) return;
    preloadPokemonDetails(team.map((member) => member.name)).then((details) => {
      setDetailsByName((current) => ({ ...current, ...details }));
    });
  }, [team]);

  const memberTypes = useMemo(() => team
    .map((member) => {
      const detail = detailsByName[member.name];
      const types = detail?.types?.map((type) => type.type.name) || [];
      return { ...member, types };
    })
    .filter((member) => member.types.length > 0), [team, detailsByName]);

  const defensiveCoverage = useMemo(() => ALL_TYPES.map((attackingType) => {
    let weak = 0;
    let resist = 0;
    let immune = 0;

    for (const member of memberTypes) {
      const multiplier = getTypeMultiplier(attackingType, member.types);
      if (multiplier === 0) immune += 1;
      else if (multiplier > 1) weak += 1;
      else if (multiplier < 1) resist += 1;
    }

    return { attackingType, weak, resist, immune };
  }), [memberTypes]);

  const offensiveCoverage = useMemo(() => ALL_TYPES.map((defendingType) => {
    const hasCoverage = memberTypes.some((member) => member.types.some((attackingType) => getTypeMultiplier(attackingType, [defendingType]) > 1));
    return { defendingType, hasCoverage };
  }), [memberTypes]);

  const biggestThreats = defensiveCoverage
    .filter((row) => row.weak >= 3)
    .sort((a, b) => b.weak - a.weak)
    .slice(0, 4);

  const uncoveredTypes = offensiveCoverage.filter((row) => !row.hasCoverage).map((row) => row.defendingType);

  return (
    <div className="page-shell">
      <h1 className="section-title">My Team</h1>
      <p className="section-subtitle">Build a team of 6 Pokémon. Add members from any Pokémon detail page.</p>
      {team.length > 0 && (
        <div className="team-analysis">
          <h3 className="stats-title">Coverage Analyzer</h3>
          {biggestThreats.length > 0 ? (
            <div className="team-analysis-row">
              <span className="team-analysis-label">Biggest Threats</span>
              <div className="eff-chips">
                {biggestThreats.map((threat) => (
                  <span key={threat.attackingType} className="type-chip" style={{ background: TYPE_COLORS[threat.attackingType] || "#999" }}>
                    {threat.attackingType} ({threat.weak}/6 weak)
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="team-analysis-good">No major 3+ shared weakness detected.</p>
          )}

          <div className="team-analysis-row">
            <span className="team-analysis-label">Offensive Holes</span>
            {uncoveredTypes.length === 0 ? (
              <p className="team-analysis-good">Your team has at least one STAB super-effective angle on every type.</p>
            ) : (
              <div className="eff-chips">
                {uncoveredTypes.map((type) => (
                  <span key={type} className="type-chip" style={{ background: TYPE_COLORS[type] || "#999" }}>
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="team-grid">
        {slots.map((_, i) => {
          const member = team[i];
          if (!member) {
            return (
              <div key={i} className="team-slot team-slot-empty">
                <span className="team-slot-number">#{i + 1}</span>
                <span className="team-slot-placeholder">Empty</span>
              </div>
            );
          }
          return (
            <div key={i} className="team-slot team-slot-filled">
              <span className="team-slot-number">#{i + 1}</span>
              <Link to={`/pokemon?name=${member.name}`} className="team-link">
                <img
                  src={`https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${member.id}.png`}
                  alt={member.name}
                  className="team-sprite"
                />
                <span className="team-member-name">{member.name}</span>
              </Link>
              <button
                className="status-clear"
                type="button"
                onClick={() => onRemove(member.name)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      {team.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">[ ? ]</div>
          <h3>No team yet</h3>
          <p>Visit any Pokémon's detail page and click "Add to Team".</p>
        </div>
      )}
    </div>
  );
};

export default TeamBuilder;
