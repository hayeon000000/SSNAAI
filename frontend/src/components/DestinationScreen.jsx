import { useState } from 'react';
import { BadgeIcon, ProfileIcon, HomeBadge } from './NavIcons';
import { getNow } from '../lib/getNow';

const TRANSPORT_OPTIONS = ['엘베만', '엘베+계단', '계단만'];

const DESTINATIONS = [
  '성신관',
  '학생회관',
  '난향관',
  '수정관A',
  '수정관B',
  '수정관C',
  '조형1관',
  '조형2관',
  '음악관',
  '도서관',
  '행정관',
  '체육관',
];

const CARD_CLASS = 'bg-[#f0f0f0] rounded-3xl p-5 shadow-[0_1px_11px_4px_rgba(195,199,244,0.44)]';

export default function DestinationScreen({ onComplete, onBack, onOpenProfile }) {
  const { date, time } = getNow();
  const [transport, setTransport] = useState(null);
  const [destination, setDestination] = useState(null);

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-neutral-950 text-white flex flex-col justify-between px-4 py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-purple-400">SSNAAI</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{date}</span>
            <span>{time}</span>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h2 className="text-neutral-600 text-lg font-medium mb-4">이용할 수단</h2>
          <div className="flex items-center justify-between px-2">
            {TRANSPORT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTransport(option)}
                className={`text-base font-medium transition-colors hover:text-purple-400 ${
                  transport === option ? 'text-purple-500' : 'text-black'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h2 className="text-neutral-600 text-lg font-medium mb-4">목적지</h2>
          <div className="grid grid-cols-3 gap-y-4 text-center">
            {DESTINATIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setDestination(name)}
                className={`text-base font-medium transition-colors hover:text-purple-400 ${
                  destination === name ? 'text-purple-500' : 'text-black'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComplete?.({ transport, destination })}
          className="w-full py-3 rounded-full bg-[#f0f0f0] text-black text-base font-medium transition-colors hover:bg-[#c8a8e9]"
        >
          완료
        </button>
      </div>

      <div className="flex items-center justify-between px-6 mt-8">
        <button type="button">
          <BadgeIcon className="w-7 h-9 text-neutral-400" />
        </button>

        <button type="button" onClick={onBack} className="w-14 h-14 transition hover:brightness-125">
          <HomeBadge className="w-full h-full" />
        </button>

        <button type="button" onClick={onOpenProfile}>
          <ProfileIcon className="w-7 h-9 text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
