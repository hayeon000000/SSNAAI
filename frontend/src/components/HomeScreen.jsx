import CampusMap from './CampusMap';
import { BadgeIcon, ProfileIcon, HomeBadge } from './NavIcons';
import { getNow } from '../lib/getNow';

const CONGESTION_LEVELS = [
  { label: '혼잡', color: 'bg-red-500' },
  { label: '보통', color: 'bg-yellow-400' },
  { label: '양호', color: 'bg-green-500' },
];

export default function HomeScreen({ onSelectDestination, onOpenProfile }) {
  const { date, time } = getNow();

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-neutral-950 text-white flex flex-col justify-between px-4 py-6">
      <div className="bg-neutral-800/70 border border-neutral-700 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-purple-400">SSNAAI</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{date}</span>
            <span>{time}</span>
          </div>
        </div>

        <div className="w-full h-56 rounded-2xl overflow-hidden bg-neutral-700">
          <CampusMap />
        </div>

        <div className="flex items-center justify-center gap-4 mt-3">
          {CONGESTION_LEVELS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
              {label}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onSelectDestination}
          className="w-full mt-5 py-3 rounded-full bg-white/10 border border-white/20 text-sm font-medium transition-colors hover:bg-[#c8a8e9]/20 hover:border-[#c8a8e9]"
        >
          목적지 선택하기
        </button>
      </div>

      <div className="flex items-center justify-between px-6 mt-8">
        <button type="button">
          <BadgeIcon className="w-7 h-9 text-neutral-400" />
        </button>

        <button type="button" className="w-14 h-14 transition hover:brightness-125">
          <HomeBadge className="w-full h-full" />
        </button>

        <button type="button" onClick={onOpenProfile}>
          <ProfileIcon className="w-7 h-9 text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
