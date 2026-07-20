import { useState } from 'react';
import CampusMap from './CampusMap';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import StairsTipBanner from './StairsTipBanner';
import { getNow } from '../lib/getNow';
import { useEta } from '../lib/useEta';

export default function HomeScreen({
  destination,
  transport,
  justSelected,
  onSelectDestination,
  onOpenResult,
  onOpenProfile,
  onSyncTimetable,
}) {
  const { date, time } = getNow();
  const { data: eta, loading } = useEta(destination, transport);
  const etaLabel = loading ? '계산 중' : eta?.etaMinutes != null ? `${eta.etaMinutes}분` : '00분';

  // 목적지를 방금 선택하고 온 경우에만 카드/추천 알림을 보여준다.
  // (마이페이지 등 다른 화면을 거쳐 홈으로 돌아오면 justSelected가 false가 되어 사라진다.)
  const showDestinationCard = Boolean(justSelected && destination);
  const elevatorOnly = (transport ?? []).length === 1 && transport[0] === '엘베만';
  const showStairsTip = showDestinationCard && elevatorOnly;
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      {showStairsTip && !dismissed && <StairsTipBanner onClose={() => setDismissed(true)} />}

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

        <div className="w-full h-96">
          <CampusMap />
        </div>

        {showDestinationCard && (
          <button
            type="button"
            onClick={onOpenResult}
            className="w-full rounded-2xl bg-white/50 shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] px-5 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/70"
          >
            <span className="text-[#a775ca] text-[15px] font-medium">{destination}까지</span>
            <span className="text-[#a775ca] text-xl font-bold">{etaLabel}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onSelectDestination}
          className="w-[200px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
        >
          목적지 선택하기
        </button>

        <button
          type="button"
          onClick={onSyncTimetable}
          className="w-[200px] py-3 rounded-[37px] bg-[#a78bba]/50 text-white text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-[#a78bba]/70"
        >
          내 시간표 연동하기
        </button>
      </div>

      <BottomNav onProfile={onOpenProfile} homeActive />
    </div>
  );
}
