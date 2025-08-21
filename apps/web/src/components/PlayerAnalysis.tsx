import React, { useState } from 'react';
import { Player } from '../types';
import { TrendingUp, Clock, Zap, Target, ArrowRight, BarChart3, Filter } from 'lucide-react';

interface PlayerAnalysisProps {
  players: Player[];
  playName: string;
  downDistance?: string;
}

export const PlayerAnalysis: React.FC<PlayerAnalysisProps> = ({
  players,
  playName,
  downDistance
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(players[0] || null);

  const summaryFor = (p: Player) => {
    const s = p.stats;
    let txt = `${p.position} performance on "${playName}": top ${s.topSpeed} mph, avg ${s.avgSpeed} mph, ${s.distanceCovered} yds covered. `;
    if (s.timeToTopSpeed) txt += `Reached top speed in ${s.timeToTopSpeed}s. `;
    if (s.reactionTime) txt += `Reaction ${s.reactionTime}s. `;
    if (s.separation) txt += `Separation ${s.separation} yds. `;
    if (s.blockWinRate) txt += `Block win rate ${s.blockWinRate}%. `;
    if (s.tackles) txt += `Tackles ${s.tackles}. `;
    if (s.receptions) txt += `Receptions ${s.receptions}. `;
    txt += `${s.accelProfile} pattern.`;
    return txt;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Player Analysis</h3>
        <p className="text-slate-600 text-sm">
          {downDistance ? `Down & Distance: ${downDistance}` : 'Single play breakdown'} — {players.length} players
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Player List */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Filter className="w-4 h-4" />
              Players
            </div>
          </div>
          <div className="space-y-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                  selectedPlayer?.id === p.id
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-500">{p.position} — {p.teamSide}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2">
          {selectedPlayer ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <BarChart3 className="w-4 h-4" />
                Metrics Summary
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded border bg-white">
                  <div className="text-xs text-slate-500">Top Speed</div>
                  <div className="text-lg font-semibold">{selectedPlayer.stats.topSpeed} mph</div>
                </div>
                <div className="p-3 rounded border bg-white">
                  <div className="text-xs text-slate-500">Avg Speed</div>
                  <div className="text-lg font-semibold">{selectedPlayer.stats.avgSpeed} mph</div>
                </div>
                <div className="p-3 rounded border bg-white">
                  <div className="text-xs text-slate-500">Distance</div>
                  <div className="text-lg font-semibold">{selectedPlayer.stats.distanceCovered} yds</div>
                </div>
                {selectedPlayer.stats.timeToTopSpeed !== undefined && (
                  <div className="p-3 rounded border bg-white">
                    <div className="text-xs text-slate-500">Time to Top</div>
                    <div className="text-lg font-semibold">{selectedPlayer.stats.timeToTopSpeed}s</div>
                  </div>
                )}
                {selectedPlayer.stats.reactionTime !== undefined && (
                  <div className="p-3 rounded border bg-white">
                    <div className="text-xs text-slate-500">Reaction</div>
                    <div className="text-lg font-semibold">{selectedPlayer.stats.reactionTime}s</div>
                  </div>
                )}
                {selectedPlayer.stats.separation !== undefined && (
                  <div className="p-3 rounded border bg-white">
                    <div className="text-xs text-slate-500">Separation</div>
                    <div className="text-lg font-semibold">{selectedPlayer.stats.separation} yds</div>
                  </div>
                )}
                {selectedPlayer.stats.blockWinRate !== undefined && (
                  <div className="p-3 rounded border bg-white">
                    <div className="text-xs text-slate-500">Block Win</div>
                    <div className="text-lg font-semibold">{selectedPlayer.stats.blockWinRate}%</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-800 font-semibold mt-4">
                <TrendingUp className="w-4 h-4" />
                Coaching Insight
              </div>
              <p className="text-sm text-slate-700 leading-6">{summaryFor(selectedPlayer)}</p>
            </div>
          ) : (
            <div className="text-slate-500">Select a player to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};
