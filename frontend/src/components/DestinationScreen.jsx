import { useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import { getNow } from '../lib/getNow';

function ElevatorIcon({ className, selected }) {
  const fill = selected ? 'rgba(167,139,186,0.5)' : 'rgba(255,255,255,0.5)';
  return (
    <svg viewBox="0 0 62 81" className={className} fill="none">
      <rect x="1" y="1" width="60" height="79" rx="12" fill={fill} stroke="white" />
      <rect x="9" y="8" width="44" height="63" rx="10" fill={fill} stroke="white" />
      <line x1="31" y1="8" x2="31" y2="71" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function StairsIcon({ className, selected }) {
  return (
    <svg viewBox="0 0 79 81" className={className} fill={selected ? '#a78bba' : 'white'}>
      <path d="M0 81 L0 61 L20 61 L20 41 L40 41 L40 21 L60 21 L60 0 L79 0 L79 81 Z" />
    </svg>
  );
}

const TRANSPORT_OPTIONS = [
  { id: '엘베만', label: '엘리베이터', Icon: ElevatorIcon },
  { id: '계단만', label: '계단', Icon: StairsIcon },
];

const PRIMARY_DESTINATIONS = ['수정관A', '성신관', '난향관'];
const OTHER_DESTINATIONS = ['도서관', '수정관B', '수정관C', '음악관', '조형1관', '조형2관', '체육관', '학생회관', '행정관'];

const CARD_CLASS = 'bg-white/50 rounded-2xl shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] p-5';

function DestinationPill({ name, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[46px] rounded-full text-[15px] font-medium transition-colors ${
        selected ? 'bg-[#a78bba] text-white' : 'bg-white/50 text-[#a78bba] hover:bg-white/80'
      }`}
    >
      {name}
    </button>
  );
}

export default function DestinationScreen({ onComplete, onBack, onOpenProfile }) {
  const { date, time } = getNow();
  const [transport, setTransport] = useState([]);
  const [destination, setDestination] = useState(null);

  const toggleTransport = (id) => {
    setTransport((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">SSNAAI</h1>
            <NotificationBell />
          </div>

          <div className="flex items-center justify-between text-lg font-medium">
            <span>{date}</span>
            <span>{time}</span>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h2 className="text-xl font-bold text-center mb-5">이용 수단</h2>
          <div className="flex items-center justify-center gap-10">
            {TRANSPORT_OPTIONS.map(({ id, label, Icon }) => {
              const selected = transport.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTransport(id)}
                  className="flex flex-col items-center gap-2 rounded-2xl px-3 py-2 transition-colors hover:bg-white/20"
                >
                  <Icon className="w-14 h-16" selected={selected} />
                  <span className={`text-[13px] font-semibold ${selected ? 'text-[#a78bba]' : 'text-white'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h2 className="text-xl font-bold text-center mb-5">목적지</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRIMARY_DESTINATIONS.map((name) => (
              <DestinationPill
                key={name}
                name={name}
                selected={destination === name}
                onClick={() => setDestination(name)}
              />
            ))}
          </div>
          <hr className="border-white/60 my-4" />
          <div className="grid grid-cols-3 gap-3">
            {OTHER_DESTINATIONS.map((name) => (
              <DestinationPill
                key={name}
                name={name}
                selected={destination === name}
                onClick={() => setDestination(name)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-[163px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70 active:bg-[#a78bba]/50 active:text-white"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={() => onComplete?.({ transport, destination })}
            className="w-[163px] py-3 rounded-[37px] bg-[#a78bba]/50 text-white text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-[#a78bba]/70"
          >
            선택하기
          </button>
        </div>
      </div>

      <BottomNav onHome={onBack} onProfile={onOpenProfile} />
    </div>
  );
}
