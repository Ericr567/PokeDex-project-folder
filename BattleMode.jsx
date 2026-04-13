import React, { useEffect, useMemo, useState } from "react";
import { fetchJsonWithTimeout, getPokemonDetailsByName } from "./pokemonDetails";
import { getTypeMultiplier, TYPE_COLORS } from "./TypeEffectiveness";
import { usePokemonList } from "./usePokemonList";

const BATTLE_STATS_KEY = "pokedex-battle-stats";
const MOVE_CACHE = new Map();
const MOVE_PENDING = new Map();

const getStat = (pokemon, statName, fallback) => {
  const found = pokemon?.stats?.find((stat) => stat.stat?.name === statName);
  return Number(found?.base_stat || fallback);
};

const unique = (arr) => [...new Set(arr)];

const getDefaultBattleStats = () => ({
  wins: 0,
  losses: 0,
  streak: 0,
  bestStreak: 0,
  coins: 0,
});

const getBattleStatsFromStorage = () => {
  try {
    const raw = localStorage.getItem(BATTLE_STATS_KEY);
    if (!raw) return getDefaultBattleStats();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultBattleStats(),
      ...parsed,
    };
  } catch {
    return getDefaultBattleStats();
  }
};

const normalizeMoveMeta = (moveEntry, fallbackType) => {
  const name = moveEntry?.name || moveEntry?.move?.name || "tackle";
  return {
    id: name,
    name,
    type: fallbackType || "normal",
    pp: 12,
    maxPp: 12,
    power: 55,
    accuracy: 100,
  };
};

const loadMoveMeta = async (moveEntry, fallbackType) => {
  const moveUrl = moveEntry?.url || moveEntry?.move?.url;
  const moveName = moveEntry?.name || moveEntry?.move?.name;
  const cacheKey = moveUrl || moveName;

  if (!cacheKey) return normalizeMoveMeta(moveEntry, fallbackType);
  if (MOVE_CACHE.has(cacheKey)) return MOVE_CACHE.get(cacheKey);
  if (MOVE_PENDING.has(cacheKey)) return MOVE_PENDING.get(cacheKey);

  const request = (async () => {
    try {
      if (!moveUrl) {
        const fallback = normalizeMoveMeta(moveEntry, fallbackType);
        MOVE_CACHE.set(cacheKey, fallback);
        return fallback;
      }

      const response = await fetchJsonWithTimeout(moveUrl, { timeoutMs: 8000 });
      if (!response.ok) throw new Error("Move request failed");
      const data = await response.json();

      const normalized = {
        id: moveName || data.name,
        name: moveName || data.name,
        type: data?.type?.name || fallbackType || "normal",
        pp: Math.max(1, Number(data?.pp || 10)),
        maxPp: Math.max(1, Number(data?.pp || 10)),
        power: Math.max(25, Number(data?.power || 55)),
        accuracy: Math.max(55, Number(data?.accuracy || 100)),
      };

      MOVE_CACHE.set(cacheKey, normalized);
      return normalized;
    } catch {
      const fallback = normalizeMoveMeta(moveEntry, fallbackType);
      MOVE_CACHE.set(cacheKey, fallback);
      return fallback;
    } finally {
      MOVE_PENDING.delete(cacheKey);
    }
  })();

  MOVE_PENDING.set(cacheKey, request);
  return request;
};

const pickMovesForPokemon = (pokemon, fallbackType) => {
  const entries = (pokemon?.moves || []).slice(0, 24);
  if (entries.length === 0) {
    return [
      normalizeMoveMeta({ name: `${fallbackType || "normal"} strike` }, fallbackType),
      normalizeMoveMeta({ name: "quick attack" }, "normal"),
    ];
  }

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
};

const buildCombatant = async (pokemon, side) => {
  const hpStat = getStat(pokemon, "hp", 60);
  const attackStat = getStat(pokemon, "attack", 55);
  const defenseStat = getStat(pokemon, "defense", 50);
  const speedStat = getStat(pokemon, "speed", 50);
  const types = pokemon?.types?.map((entry) => entry.type.name) || ["normal"];
  const moveEntries = pickMovesForPokemon(pokemon, types[0]);
  const loadedMoves = await Promise.all(moveEntries.map((entry) => loadMoveMeta(entry, types[0])));
  const moves = loadedMoves.map((move, index) => ({ ...move, id: `${move.id}-${index}` }));

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
    status: null,
    fainted: false,
    side,
    moves,
  };
};

const getSpeedForTurn = (combatant) => (combatant.status === "paralysis" ? Math.floor(combatant.speed * 0.55) : combatant.speed);

const calcDamage = (attacker, defender, move) => {
  const typeMultiplier = getTypeMultiplier(move.type, defender.types);
  const critMultiplier = Math.random() < 0.1 ? 1.5 : 1;
  const variance = 0.9 + Math.random() * 0.2;
  const burnModifier = attacker.status === "burn" ? 0.8 : 1;
  const powerScale = Math.max(25, Number(move?.power || 55)) / 55;
  const scaled = (((attacker.attack / Math.max(1, defender.defense)) * 18 + 8) * powerScale) * typeMultiplier * burnModifier;
  const damage = Math.max(1, Math.round(scaled * critMultiplier * variance));

  return {
    damage,
    typeMultiplier,
    isCrit: critMultiplier > 1,
  };
};

const rollStatusInfliction = (moveType, defender) => {
  if (defender.status) return null;
  if (moveType === "fire" && Math.random() < 0.15) return "burn";
  if (moveType === "electric" && Math.random() < 0.15) return "paralysis";
  return null;
};

const chooseEnemyMoveIndex = (enemyActive, playerActive) => {
  if (!enemyActive?.moves?.length) return 0;
  let bestScore = -Infinity;
  let bestIdx = 0;

  enemyActive.moves.forEach((move, idx) => {
    if (move.pp <= 0) return;
    const multiplier = getTypeMultiplier(move.type, playerActive.types);
    const score = multiplier + Math.random() * 0.12;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
};

const findNextAliveIndex = (team, preferredIndex = 0) => {
  if (!Array.isArray(team) || team.length === 0) return -1;
  if (team[preferredIndex] && !team[preferredIndex].fainted && team[preferredIndex].hp > 0) {
    return preferredIndex;
  }
  return team.findIndex((member) => !member.fainted && member.hp > 0);
};

const updateMovePp = (team, activeIndex, moveIndex) => {
  if (!team[activeIndex]?.moves?.[moveIndex]) return team;
  return team.map((member, idx) => {
    if (idx !== activeIndex) return member;
    return {
      ...member,
      moves: member.moves.map((move, mIdx) => (mIdx === moveIndex ? { ...move, pp: Math.max(0, move.pp - 1) } : move)),
    };
  });
};

const applyDamageToTeam = (team, targetIndex, damage) => team.map((member, idx) => {
  if (idx !== targetIndex) return member;
  const nextHp = Math.max(0, member.hp - damage);
  return {
    ...member,
    hp: nextHp,
    fainted: nextHp <= 0,
  };
});

const applyStatusToTeam = (team, targetIndex, status) => team.map((member, idx) => (idx === targetIndex ? { ...member, status: status || member.status } : member));

const applyEndTurnStatus = (team, activeIndex) => team.map((member, idx) => {
  if (idx !== activeIndex || member.fainted || member.hp <= 0) return member;
  if (member.status === "burn") {
    const chip = Math.max(1, Math.round(member.maxHp * 0.08));
    const nextHp = Math.max(0, member.hp - chip);
    return {
      ...member,
      hp: nextHp,
      fainted: nextHp <= 0,
    };
  }
  return member;
});

const hpPercent = (value, max) => {
  if (!max) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
};

const BattleMode = ({ team = [], notify, shinyDexMode = false }) => {
  const { pokemons, loading, error, retry } = usePokemonList({ notify, pageName: "battle" });

  const [selectedPlayerName, setSelectedPlayerName] = useState(team?.[0]?.name || "");
  const [playerTeam, setPlayerTeam] = useState([]);
  const [enemyTeam, setEnemyTeam] = useState([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeEnemyIndex, setActiveEnemyIndex] = useState(0);
  const [battleLog, setBattleLog] = useState([]);
  const [status, setStatus] = useState("setup");
  const [isBusy, setIsBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [battleStats, setBattleStats] = useState(getBattleStatsFromStorage);

  const teamNames = useMemo(() => (team || []).map((member) => member.name).filter(Boolean), [team]);

  const playerActive = playerTeam[activePlayerIndex] || null;
  const enemyActive = enemyTeam[activeEnemyIndex] || null;

  useEffect(() => {
    localStorage.setItem(BATTLE_STATS_KEY, JSON.stringify(battleStats));
  }, [battleStats]);

  useEffect(() => {
    if (teamNames.length > 0 && !teamNames.includes(selectedPlayerName)) {
      setSelectedPlayerName(teamNames[0]);
    }
  }, [teamNames, selectedPlayerName]);

  const loadBattle = async () => {
    if (!pokemons.length) return;

    setIsBusy(true);
    setLoadError(null);
    setStatus("setup");
    setBattleLog([]);

    try {
      const playerPool = [...teamNames];
      if (!playerPool.length) {
        throw new Error("Create a team first to enter battle mode");
      }

      const leadName = selectedPlayerName || playerPool[0];
      const orderedPlayer = unique([leadName, ...playerPool]).slice(0, 6);

      const enemyPool = pokemons
        .map((entry) => entry.name)
        .filter((name) => !orderedPlayer.includes(name))
        .sort(() => Math.random() - 0.5)
        .slice(0, orderedPlayer.length);

      const [playerDetailsList, enemyDetailsList] = await Promise.all([
        Promise.all(orderedPlayer.map((name) => getPokemonDetailsByName(name))),
        Promise.all(enemyPool.map((name) => getPokemonDetailsByName(name))),
      ]);

      const builtPlayer = await Promise.all(playerDetailsList.filter(Boolean).map((pokemon) => buildCombatant(pokemon, "player")));
      const builtEnemy = await Promise.all(enemyDetailsList.filter(Boolean).map((pokemon) => buildCombatant(pokemon, "enemy")));

      if (!builtPlayer.length || !builtEnemy.length) {
        throw new Error("Could not assemble teams");
      }

      setPlayerTeam(builtPlayer);
      setEnemyTeam(builtEnemy);
      setActivePlayerIndex(0);
      setActiveEnemyIndex(0);
      setStatus("idle");
      setBattleLog([`Battle started: ${builtPlayer[0].name} vs ${builtEnemy[0].name}`]);
    } catch (err) {
      setLoadError(err.message || "Failed to start battle");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && pokemons.length > 0 && teamNames.length > 0 && playerTeam.length === 0 && enemyTeam.length === 0) {
      loadBattle();
    }
  }, [loading, pokemons, teamNames.length, playerTeam.length, enemyTeam.length]);

  const playerMoves = useMemo(() => {
    if (!playerActive?.moves?.length) return [];
    return playerActive.moves;
  }, [playerActive]);

  const pushLog = (line) => {
    setBattleLog((current) => [...current.slice(-7), line]);
  };

  const finalizeBattle = (didWin) => {
    setStatus(didWin ? "won" : "lost");
    setBattleStats((current) => {
      const next = { ...current };
      if (didWin) {
        next.wins += 1;
        next.streak += 1;
        next.bestStreak = Math.max(next.bestStreak, next.streak);
        const reward = 40 + next.streak * 10;
        next.coins += reward;
        pushLog(`Reward: +${reward} coins (streak ${next.streak})`);
      } else {
        next.losses += 1;
        next.streak = 0;
      }
      return next;
    });
  };

  const ensureAutoSwitches = (nextPlayerTeam, nextEnemyTeam, nextPlayerIdx, nextEnemyIdx) => {
    const resolvedPlayerIdx = findNextAliveIndex(nextPlayerTeam, nextPlayerIdx);
    const resolvedEnemyIdx = findNextAliveIndex(nextEnemyTeam, nextEnemyIdx);

    if (resolvedPlayerIdx === -1) {
      finalizeBattle(false);
      pushLog("All your Pokemon have fainted.");
      return { playerIdx: -1, enemyIdx: resolvedEnemyIdx };
    }

    if (resolvedEnemyIdx === -1) {
      finalizeBattle(true);
      pushLog("Opponent team fainted. You win!");
      return { playerIdx: resolvedPlayerIdx, enemyIdx: -1 };
    }

    if (resolvedPlayerIdx !== nextPlayerIdx) {
      pushLog(`You switched in ${nextPlayerTeam[resolvedPlayerIdx].name}.`);
    }
    if (resolvedEnemyIdx !== nextEnemyIdx) {
      pushLog(`Enemy switched in ${nextEnemyTeam[resolvedEnemyIdx].name}.`);
    }

    return { playerIdx: resolvedPlayerIdx, enemyIdx: resolvedEnemyIdx };
  };

  const runTurn = async (moveIndex) => {
    if (!playerActive || !enemyActive || isBusy || status !== "idle") return;
    if (!playerMoves[moveIndex] || playerMoves[moveIndex].pp <= 0) return;

    setIsBusy(true);

    let nextPlayerTeam = updateMovePp(playerTeam, activePlayerIndex, moveIndex);
    let nextEnemyTeam = [...enemyTeam];
    let nextPlayerIdx = activePlayerIndex;
    let nextEnemyIdx = activeEnemyIndex;

    const playerMove = nextPlayerTeam[nextPlayerIdx].moves[moveIndex];

    const maybeParalyzed = (combatant, sideName) => {
      if (combatant.status === "paralysis" && Math.random() < 0.3) {
        pushLog(`${combatant.name} is paralyzed and cannot move (${sideName}).`);
        return true;
      }
      return false;
    };

    const executeAttack = (attackerSide, move) => {
      const attackerTeam = attackerSide === "player" ? nextPlayerTeam : nextEnemyTeam;
      const defenderTeam = attackerSide === "player" ? nextEnemyTeam : nextPlayerTeam;
      const attackerIdx = attackerSide === "player" ? nextPlayerIdx : nextEnemyIdx;
      const defenderIdx = attackerSide === "player" ? nextEnemyIdx : nextPlayerIdx;

      const attacker = attackerTeam[attackerIdx];
      const defender = defenderTeam[defenderIdx];
      if (!attacker || !defender || attacker.fainted || defender.fainted) return;

      const accuracy = Math.max(1, Number(move?.accuracy || 100));
      if (Math.random() * 100 > accuracy) {
        pushLog(`${attacker.name} used ${move.type} but missed.`);
        return;
      }

      const result = calcDamage(attacker, defender, move);
      const multiplierLabel = result.typeMultiplier === 0 ? "no effect" : `${result.typeMultiplier}x`;
      pushLog(`${attacker.name} used ${move.name}! ${result.damage} dmg (${multiplierLabel})${result.isCrit ? " CRIT" : ""}`);

      const damagedTeam = applyDamageToTeam(defenderTeam, defenderIdx, result.damage);
      const statusInflicted = rollStatusInfliction(move.type, damagedTeam[defenderIdx]);
      const finalTeam = statusInflicted ? applyStatusToTeam(damagedTeam, defenderIdx, statusInflicted) : damagedTeam;

      if (statusInflicted) {
        pushLog(`${finalTeam[defenderIdx].name} is now ${statusInflicted}.`);
      }

      if (attackerSide === "player") {
        nextEnemyTeam = finalTeam;
      } else {
        nextPlayerTeam = finalTeam;
      }
    };

    const enemyMoveIdx = chooseEnemyMoveIndex(nextEnemyTeam[nextEnemyIdx], nextPlayerTeam[nextPlayerIdx]);
    const enemyMove = nextEnemyTeam[nextEnemyIdx].moves[enemyMoveIdx];
    nextEnemyTeam = updateMovePp(nextEnemyTeam, nextEnemyIdx, enemyMoveIdx);

    const firstPlayer = getSpeedForTurn(nextPlayerTeam[nextPlayerIdx]) >= getSpeedForTurn(nextEnemyTeam[nextEnemyIdx]);

    if (firstPlayer) {
      if (!maybeParalyzed(nextPlayerTeam[nextPlayerIdx], "player")) {
        executeAttack("player", playerMove);
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (findNextAliveIndex(nextEnemyTeam, nextEnemyIdx) !== -1 && !maybeParalyzed(nextEnemyTeam[nextEnemyIdx], "enemy")) {
        executeAttack("enemy", enemyMove);
      }
    } else {
      if (!maybeParalyzed(nextEnemyTeam[nextEnemyIdx], "enemy")) {
        executeAttack("enemy", enemyMove);
      }
      await new Promise((resolve) => setTimeout(resolve, 180));
      if (findNextAliveIndex(nextPlayerTeam, nextPlayerIdx) !== -1 && !maybeParalyzed(nextPlayerTeam[nextPlayerIdx], "player")) {
        executeAttack("player", playerMove);
      }
    }

    nextPlayerTeam = applyEndTurnStatus(nextPlayerTeam, nextPlayerIdx);
    nextEnemyTeam = applyEndTurnStatus(nextEnemyTeam, nextEnemyIdx);

    if (nextPlayerTeam[nextPlayerIdx]?.status === "burn" && !nextPlayerTeam[nextPlayerIdx]?.fainted) {
      pushLog(`${nextPlayerTeam[nextPlayerIdx].name} is hurt by burn.`);
    }
    if (nextEnemyTeam[nextEnemyIdx]?.status === "burn" && !nextEnemyTeam[nextEnemyIdx]?.fainted) {
      pushLog(`${nextEnemyTeam[nextEnemyIdx].name} is hurt by burn.`);
    }

    const switched = ensureAutoSwitches(nextPlayerTeam, nextEnemyTeam, nextPlayerIdx, nextEnemyIdx);
    nextPlayerIdx = switched.playerIdx;
    nextEnemyIdx = switched.enemyIdx;

    setPlayerTeam(nextPlayerTeam);
    setEnemyTeam(nextEnemyTeam);

    if (nextPlayerIdx >= 0) {
      setActivePlayerIndex(nextPlayerIdx);
    }
    if (nextEnemyIdx >= 0) {
      setActiveEnemyIndex(nextEnemyIdx);
    }

    setIsBusy(false);
  };

  const handlePlayerSwitch = (targetIndex) => {
    if (isBusy || status !== "idle") return;
    if (targetIndex === activePlayerIndex) return;
    if (!playerTeam[targetIndex] || playerTeam[targetIndex].fainted) return;

    setActivePlayerIndex(targetIndex);
    pushLog(`You switched to ${playerTeam[targetIndex].name}.`);

    const enemyMoveIdx = chooseEnemyMoveIndex(enemyActive, playerTeam[targetIndex]);
    const enemyMove = enemyActive?.moves?.[enemyMoveIdx];
    if (!enemyMove || enemyMove.pp <= 0) return;

    setIsBusy(true);
    let nextEnemyTeam = updateMovePp(enemyTeam, activeEnemyIndex, enemyMoveIdx);
    let nextPlayerTeam = playerTeam;

    const accuracy = Math.max(1, Number(enemyMove?.accuracy || 100));
    if (Math.random() * 100 > accuracy) {
      pushLog(`${nextEnemyTeam[activeEnemyIndex].name} used ${enemyMove.name} on switch-in but missed.`);
      setEnemyTeam(nextEnemyTeam);
      setIsBusy(false);
      return;
    }

    const result = calcDamage(nextEnemyTeam[activeEnemyIndex], nextPlayerTeam[targetIndex], enemyMove);
    nextPlayerTeam = applyDamageToTeam(nextPlayerTeam, targetIndex, result.damage);
    pushLog(`${nextEnemyTeam[activeEnemyIndex].name} used ${enemyMove.name} on switch-in for ${result.damage} dmg.`);

    const statusInflicted = rollStatusInfliction(enemyMove.type, nextPlayerTeam[targetIndex]);
    if (statusInflicted) {
      nextPlayerTeam = applyStatusToTeam(nextPlayerTeam, targetIndex, statusInflicted);
      pushLog(`${nextPlayerTeam[targetIndex].name} is now ${statusInflicted}.`);
    }

    const switched = ensureAutoSwitches(nextPlayerTeam, nextEnemyTeam, targetIndex, activeEnemyIndex);

    setPlayerTeam(nextPlayerTeam);
    setEnemyTeam(nextEnemyTeam);
    if (switched.playerIdx >= 0) setActivePlayerIndex(switched.playerIdx);
    if (switched.enemyIdx >= 0) setActiveEnemyIndex(switched.enemyIdx);
    setIsBusy(false);
  };

  const handleRetryList = () => {
    retry("Retrying battle data fetch");
  };

  const getSprite = (combatant) => {
    if (!combatant?.id) return "";
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shinyDexMode ? "shiny/" : ""}${combatant.id}.png`;
  };

  const alivePlayerCount = playerTeam.filter((member) => !member.fainted).length;
  const aliveEnemyCount = enemyTeam.filter((member) => !member.fainted).length;

  return (
    <div className="page-shell">
      <h1 className="section-title">Battle Mode</h1>
      <p className="section-subtitle">6v6 turn-based battle with switching, PP management, status effects, and AI strategy.</p>

      <div className="status-bar" role="status" aria-live="polite">
        <span>W: {battleStats.wins} L: {battleStats.losses}</span>
        <span>Streak: {battleStats.streak} (Best {battleStats.bestStreak})</span>
        <span>Coins: {battleStats.coins}</span>
      </div>

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
            <option value="">Create a team first</option>
          )}
        </select>

        <button className="app-button" type="button" onClick={loadBattle} disabled={isBusy || loading}>
          New Match
        </button>
      </div>

      <div className="battle-team-summary">
        <span>Allies Alive: {alivePlayerCount}/{Math.max(1, playerTeam.length)}</span>
        <span>Enemies Alive: {aliveEnemyCount}/{Math.max(1, enemyTeam.length)}</span>
      </div>

      <div className="battle-field">
        <div className="battle-card battle-player">
          <h3>{playerActive?.name || "Loading..."}</h3>
          {playerActive && (
            <img
              className="battle-sprite"
              src={getSprite(playerActive)}
              alt={playerActive.name}
              onError={(event) => {
                event.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${playerActive.id}.png`;
              }}
            />
          )}
          <div className="battle-hp-track">
            <div className="battle-hp-fill" style={{ width: `${hpPercent(playerActive?.hp || 0, playerActive?.maxHp || 1)}%` }} />
          </div>
          <p className="battle-hp-text">HP: {playerActive?.hp || 0}/{playerActive?.maxHp || 0}</p>
          <p className="battle-hp-text">Status: {playerActive?.status || "none"}</p>
          <div className="card-types">
            {(playerActive?.types || []).map((type) => (
              <span key={`p-${type}`} className="type-chip" style={{ background: TYPE_COLORS[type] || "#999" }}>{type}</span>
            ))}
          </div>
        </div>

        <div className="battle-versus">VS</div>

        <div className="battle-card battle-enemy">
          <h3>{enemyActive?.name || "Loading..."}</h3>
          {enemyActive && (
            <img
              className="battle-sprite"
              src={getSprite(enemyActive)}
              alt={enemyActive.name}
              onError={(event) => {
                event.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyActive.id}.png`;
              }}
            />
          )}
          <div className="battle-hp-track">
            <div className="battle-hp-fill" style={{ width: `${hpPercent(enemyActive?.hp || 0, enemyActive?.maxHp || 1)}%` }} />
          </div>
          <p className="battle-hp-text">HP: {enemyActive?.hp || 0}/{enemyActive?.maxHp || 0}</p>
          <p className="battle-hp-text">Status: {enemyActive?.status || "none"}</p>
          <div className="card-types">
            {(enemyActive?.types || []).map((type) => (
              <span key={`e-${type}`} className="type-chip" style={{ background: TYPE_COLORS[type] || "#999" }}>{type}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="battle-moves">
        {playerMoves.map((move, index) => (
          <button
            key={move.id}
            className="app-button"
            type="button"
            onClick={() => runTurn(index)}
            disabled={isBusy || status !== "idle" || !playerActive || !enemyActive || move.pp <= 0}
          >
            {move.name} ({move.pp}/{move.maxPp})
          </button>
        ))}
      </div>

      <div className="battle-switch-grid">
        {playerTeam.map((member, index) => {
          const active = index === activePlayerIndex;
          return (
            <button
              key={`switch-${member.name}-${index}`}
              className={`battle-switch-btn ${active ? "battle-switch-active" : ""}`}
              type="button"
              onClick={() => handlePlayerSwitch(index)}
              disabled={isBusy || status !== "idle" || member.fainted || active}
            >
              <span>{member.name}</span>
              <span>{member.hp}/{member.maxHp}</span>
              <span>{member.fainted ? "fainted" : member.status || "ready"}</span>
            </button>
          );
        })}
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
