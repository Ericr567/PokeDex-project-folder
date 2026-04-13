import React from "react";
import { Link } from "react-router-dom";

const flattenChain = (node, depth = 0) => {
  if (!node) return [];
  const result = [{ name: node.species.name, url: node.species.url, depth }];
  for (const next of node.evolves_to || []) {
    result.push(...flattenChain(next, depth + 1));
  }
  return result;
};

const EvolutionChain = ({ chain, currentName }) => {
  if (!chain?.chain) return null;
  const stages = flattenChain(chain.chain);
  if (stages.length <= 1) return null;

  return (
    <div className="evolution-chain">
      <h3 className="stats-title">Evolution Chain</h3>
      <div className="evolution-stages">
        {stages.map((stage, i) => {
          const id = stage.url.split("/").filter(Boolean).pop();
          const isCurrent = stage.name === currentName;
          const showArrow = i > 0 && stage.depth > stages[i - 1].depth;
          return (
            <React.Fragment key={`${stage.name}-${i}`}>
              {showArrow && <span className="evolution-arrow">▶</span>}
              <Link
                to={`/pokemon?name=${stage.name}`}
                className={`evolution-stage ${isCurrent ? "evolution-current" : ""}`}
              >
                <img
                  src={`https://raw.githubusercontent.com/getmimo/things-api/main/files/pokedex/sprites/master/sprites/pokemon/${id}.png`}
                  alt={stage.name}
                  className="evolution-sprite"
                />
                <span className="evolution-name">{stage.name}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default EvolutionChain;
