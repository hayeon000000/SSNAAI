import { useState } from 'react';
import CampusMap from './CampusMap';
import { BadgeIcon, ProfileIcon, HomeBadge } from './NavIcons';
import WarningModal from './WarningModal';
import { getNow } from '../lib/getNow';

const TRANSPORT_LABELS = {
  엘베만: '엘리베이터만으로',
  '엘베+계단': '엘리베이터+계단으로',
  계단만: '계단만으로',
};

export default function ResultScreen({ destination, transport, onEditDestination, onBack, onOpenProfile }) {
  const { date, time } = getNow();
  const [showWarning, setShowWarning] = useState(false);
  const transportLabel = TRANSPORT_LABELS[transport] ?? '경로 안내로';

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

        <div className="w-full h-56 rounded-2xl overflow-hidden bg-neutral-700">
          <CampusMap routeTo={destination} />
        </div>

        <div className="relative bg-[#c8a8e9]/[0.63] border border-[#f4e7fb] rounded-3xl p-5">
          <button
            type="button"
            onClick={() => setShowWarning(true)}
            className="absolute top-4 right-5 text-white text-xs"
          >
            X
          </button>
          <p className="font-semibold text-base">{destination}까지</p>
          <p className="font-semibold text-lg mt-3">
            {transportLabel} <span className="text-[#2a0d47]">00분</span> 예상
          </p>
          <p className="text-sm mt-3">※ 현재 상황에서는 계단 이용을 추천해요!</p>
        </div>

        <button
          type="button"
          onClick={onEditDestination}
          className="w-full py-3 rounded-full border border-[#f0f0f0] text-[#f0f0f0] text-sm font-medium transition-colors hover:bg-[#f0f0f0] hover:text-black"
        >
          목적지 수정하기
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

      {showWarning && (
        <WarningModal onClose={() => setShowWarning(false)} onConfirm={onEditDestination} />
      )}
    </div>
  );
}
