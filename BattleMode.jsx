import React, { useEffect, useMemo, useState } from "react";
import { getPokemonDetailsByName } from "./pokemonDetails";
import { getTypeMultiplier, TYPE_COLORS } from "./TypeEffectiveness";
import { usePokemonList } from "./usePokemonList";

const getStat = (pokemon, statName, fallback) => {
  const found = pokemon?.stats?.find((stat) => stat.stat?.name === statName);
  return Number(found?.base_stat || fallback);
};

const buildCombatant = (pokemon) => {
  const hpStat = getStat(pokemon, "hp", 60);
  const attackStat = getStat(pokemon, "attack", 55);
  const defenseStat = getStat(pokemon, "defense", 50);
  const speedStat = getStat(pokemon, "speed", 50);
  const types = pokemon?.types?.map((entry) => entry.type.name) || ["normal"];

  return {
    pokemon,
    name: pokemon.name,
    id: pokemon.id,
    types,
    attack: attackStat,
    defense: defenseStat,
    speed: speedStat,
    maxHp: Math.max(90, hpStat * 2),
    hp: Math.max(90, hpStat * 2),
  };
};

const calcDamage = (attacker, defender, moveType) => {
  const typeMultiplier = getTypeMultiplier(moveType, defender.types);
  const critMultiplier = Math.random() < 0.1 ? 1.5 : 1;
  const variance = 0.9 + Math.random() * 0.2;
  const scaled = ((attacker.attack / Math.max(1, defender.defense)) * 18 + 8) * typeMultiplier;
  const damage = Math.max(1, Math.round(scaled * critMultiplier * variance));

  return {
    damage,
    typeMultiplier,
    isCrit: critMultiplier > 1,
  };
};

const hpPercent = (value, max) => {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
};

const BattleMode = ({ team = [], notify, shinyDexMode = false }) => {
  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "battle" });

  const [selectedPlayerName, setSelectedPlayerName] = useState(team?.[0]?.name || "");
  const [player, setPlayer] = useState(null);
  const [enemy, setEnemy] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [status, setStatus] = useState("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const teamNames = useMemo(() => (team || []).map((member) => member.name).filter(Boolean), [team]);

  useEffect(() => {
    if (teamNames.length > 0 && !teamNames.includes(selectedPlayerName)) {
      setSelectedPlayerName(teamNames[0]);
    }
  }, [teamNames, selectedPlayerName]);

  const loadBattle = async () => {
    if (!pokemons.length) return;

    setIsBusy(true);
    setLoadError(null);
    setStatus("idle");
    setBattleLog([]);

    try {
      const fallbackName = pokemons[Math.floor(Math.random() * pokemons.length)]?.name;
      const playerName = selectedPlayerName || fallbackName;

      if (!playerName) {
        throw new Error("Could not select player Pokemon");
      }

      const enemyPool = pokemons.filter((pokemon) => pokemon.name !== playerName);
      const enemyName = enemyPool[Math.floor(Math.random() * enemyPool.length)]?.name;

      if (!enemyName) {
        throw new Error("Could not select opponent Pokemon");
      }

      const [playerDetails, enemyDetails] = await Promise.all([
        getPokemonDetailsByName(playerName),
        getPokemonDetailsByName(enemyName),
      ]);

      if (!playerDetails || !enemyDetails) {
        throw new Error("Could not load Pokemon details");
      }

      const playerCombatant = buildCombatant(playerDetails);
      const enemyCombatant = buildCombatant(enemyDetails);

      setPlayer(playerCombatant);
      setEnemy(enemyCombatant);
      setBattleLog([`Battle started: ${playerCombatant.name} vs ${enemyCombatant.name}`]);
    } catch (err) {
      setLoadError(err.message || "Failed to start battle");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && pokemons.length > 0 && !player && !enemy) {
      loadBattle();
    }
  }, [loading, pokemons, player, enemy]);

  const playerMoves = useMemo(() => {
    if (!player) return ["normal"];
    return player.types.length > 0 ? player.types : ["normal"];
  }, [player]);

  const pushLog = (line) => {
    setBattleLog((current) => [...current.slice(-7), line]);
  };

  const runTurn = async (moveType) => {
    if (!player || !enemy || isBusy || status !== "idle") return;

    setIsBusy(true);

    const firstPlayer = player.speed >= enemy.speed;

    const playerAttack = () => {
      const result = calcDamage(player, enemy, moveType);
      const nextEnemyHp = Math.max(0, enemy.hp - result.damage);
      const multiplierLabel = result.typeMultiplier === 0
        ? "no effect"
        : `${result.typeMultiplier}x`;
      pushLog(`${player.name} used ${moveType}! ${result.damage} dmg (${multiplierLabel})${result.isCrit ? " CRIT" : ""}`);
      setEnemy((current) => ({ ...current, hp: nextEnemyHp }));
      return nextEnemyHp;
    };

    const enemyMove = enemy.types[Math.floor(Math.random() * enemy.types.length)] || "normal";

    const enemyAttack = (freshEnemyHp) => {
      if (freshEnemyHp <= 0) return player.hp;
      const result = calcDamage(enemy, player, enemyMove);
      const nextPlayerHp = Math.max(0, player.hp - result.damage);
      const multiplierLabel = result.typeMultiplier === 0
        ? "no effect"
        : `${result.typeMultiplier}x`;
      pushLog(`${enemy.name} used ${enemyMove}! ${result.damage} dmg (${multiplierLabel})${result.isCrit ? " CRIT" : ""}`);
      setPlayer((current) => ({ ...current, hp: nextPlayerHp }));
      return nextPlayerHp;
    };

    let nextEnemyHp = enemy.hp;
    let nextPlayerHp = player.hp;

    if (firstPlayer) {
      nextEnemyHp = playerAttack();
      await new Promise((resolve) => setTimeout(resolve, 220));
      nextPlayerHp = enemyAttack(nextEnemyHp);
    } else {
      nextPlayerHp = enemyAttack(enemy.hp);
      await new Promise((resolve) => setTimeout(resolve, 220));
      if (nextPlayerHp > 0) {
        nextEnemyHp = playerAttack();
      }
    }

    if (nextEnemyHp <= 0) {
      setStatus("won");
      pushLog(`You won! ${enemy.name} fainted.`);
    } else if (nextPlayerHp <= 0) {
      setStatus("lost");
      pushLog(`You lost. ${player.name} fainted.`);
    }

    setIsBusy(false);
  };

  const handleRetryList = () => {
    retry("Retrying battle data fetch");
  };

  const getSprite = (combatant) => {
    if (!combatant?.id) return "";
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shinyDexMode ? "shiny/" : ""}${combatant.id}.png`;
  };

  return (
    <div className="page-shell">
      <h1 className="section-title">Battle Mode</h1>
      <p className="section-subtitle">Fight a computer-controlled Pokemon in a turn-based duel.</p>

      {error && (
        <div className="status-error" role="alert">
          <p>Error: {error}</p>
          <button className="app-button" type="button" onClick={handleRetryList}>Retry</button>
        </div>
      )}
      {loadError && (
        <div className="status-error" role="alert">
          <p>Error: {loadError}</p>
          <button className="app-button" type="button" onClick={loadBattle}>Retry Match</button>
        </div>
      )}

      <div className="battle-setup-row">
        <label className="battle-label" htmlFor="battle-player-select">Your Pokemon</label>
        <select
          id="battle-player-select"
          className="sort-select"
          value={selectedPlayerName}
          onChange={(event) => setSelectedPlayerName(event.target.value)}
          disabled={isBusy || loading || teamNames.length === 0}
        >
          {teamNames.length > 0 ? (
            teamNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))
          ) : (
            <option value="">No team Pokemon (random rental)</option>
          )}
        </select>

        <button className="app-button" type="button" onClick={loadBattle} disabled={isBusy || loading}>
          New Match
        </button>
      </div>

      <div className="battle-field">
        <div className="battle-card battle-player">
          <h3>{player?.name || "Loading..."}</h3>
          {player && (
            <img
              className="battle-sprite"
              src={getSprite(player)}
              alt={player.name}
              onError={(event) => {
                event.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`;
              }}
            />
          )}
          <div className="battle-hp-track">
            <div className="battle-hp-fill" style={{ width: `${hpPercent(player?.hp || 0, player?.maxHp || 1)}%` }} />
          </div>
          <p className="battle-hp-text">HP: {player?.hp || 0}/{player?.maxHp || 0}</p>
          <div className="card-types">
            {(player?.types || []).map((type) => (
              <span key={`p-${type}`} className="type-chip" style={{ background: TYPE_COLORS[type] || "#999" }}>{type}</span>
            ))}
          </div>
        </div>

        <div className="battle-versus">VS</div>

        <div className="battle-card battle-enemy">
          <h3>{enemy?.name || "Loading..."}</h3>
          {enemy && (
            <img
              className="battle-sprite"
              src={getSprite(enemy)}
              alt={enemy.name}
              onError={(event) => {
                event.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`;
              }}
            />
          )}
          <div className="battle-hp-track">
            <div className="battle-hp-fill" style={{ width: `${hpPercent(enemy?.hp || 0, enemy?.maxHp || 1)}%` }} />
          </div>
          <p className="battle-hp-text">HP: {enemy?.hp || 0}/{enemy?.maxHp || 0}</p>
          <div className="card-types">
            {(enemy?.types || []).map((type) => (
              <span key={`e-${type}`} className="type-chip" style={{ background: TYPE_COLORS[type] || "#999" }}>{type}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="battle-moves">
        {playerMoves.map((moveType) => (
          <button
            key={moveType}
            className="app-button"
            type="button"
            onClick={() => runTurn(moveType)}
            disabled={isBusy || status !== "idle" || !player || !enemy}
          >
            Use {moveType}
          </button>
        ))}
      </div>

      {status === "won" && <p className="battle-result-win">Victory! Start a new match to battle again.</p>}
      {status === "lost" && <p className="battle-result-lose">Defeat. Start a new match for a rematch.</p>}

      <div className="battle-log" role="log" aria-live="polite">
        {battleLog.length === 0 ? (
          <p className="battle-log-line">Battle log will appear here.</p>
        ) : (
          battleLog.map((line, index) => (
            <p key={`${line}-${index}`} className="battle-log-line">{line}</p>
          ))
        )}
      </div>
    </div>
  );
};

export default BattleMode;
