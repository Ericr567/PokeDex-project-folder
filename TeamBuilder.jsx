import React from "react";
import { Link } from "react-router-dom";
import "./TeamBuilder.css";

const TeamBuilder = ({ team, onRemove }) => {
  const slots = Array.from({ length: 6 });

  return (
    <div className="page-shell">
      <h1 className="section-title">My Team</h1>
      <p className="section-subtitle">Build a team of 6 Pokémon. Add members from any Pokémon detail page.</p>
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
