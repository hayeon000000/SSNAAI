import { useEffect, useState } from 'react';
import CampusMap from './CampusMap';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import StairsTipBanner from './StairsTipBanner';
import { useNow } from '../lib/useNow';
import { useEta } from '../lib/useEta';
import { useCongestion } from '../lib/useCongestion';
import { getNextRoute } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';

export default function HomeScreen({
  destination,
  transport,
  justSelected,
  onSelectDestination,
  onOpenResult,
  onOpenProfile,
  onOpenPet,
  onSyncTimetable,
}) {
  const { date, time } = useNow();
  const { data: eta, loading } = useEta(destination, transport);
  const { data: congestion } = useCongestion();
  const etaLabel = loading ? '계산 중' : eta?.etaMinutes != null ? `${eta.etaMinutes}분` : '00분';

  // 목적지를 방금 선택하고 온 경우에만 카드/추천 알림을 보여준다.
  // (마이페이지 등 다른 화면을 거쳐 홈으로 돌아오면 justSelected가 false가 되어 사라진다.)
  const showDestinationCard = Boolean(justSelected && destination);
  const elevatorOnly = (transport ?? []).length === 1 && transport[0] === '엘베만';
  const showStairsTip = showDestinationCard && elevatorOnly;
  const [dismissed, setDismissed] = useState(false);

  // 시간표 기반 다음 수업 이동 루트 추천 — 목적지를 직접 고르지 않았을 때(홈 첫 진입)만 보여줌
  const [nextRoute, setNextRoute] = useState(null);
  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId || showDestinationCard) return;
    getNextRoute(studentId)
      .then(setNextRoute)
      .catch((err) => {
        // "오늘 남은 시간표가 없습니다" 같은 400은 시간표를 아직 저장 안 한 경우라
        // 정상적인 상황임 — 콘솔에 에러로 찍지 않고 조용히 넘어감.
        if (!err.message?.includes('400')) {
          console.error('[HomeScreen] 다음 루트 추천 조회 실패:', err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDestinationCard]);

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
          <CampusMap congestion={congestion} showLabels={true} />
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

        {/* getNextRoute도 #3(경로추천)이랑 같은 RouteRecommendationResponse를 반환함.
            과목명은 응답에 없어서 "다음 수업" 같은 고정 문구 대신 이동 경로로 보여줌. */}
        {!showDestinationCard && nextRoute && (
          <div className="w-full rounded-2xl bg-white/50 shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] px-5 py-3">
            <p className="text-[#a775ca] text-xs font-medium mb-1">다음 이동</p>
            <div className="flex items-center justify-between">
              <span className="text-[#a775ca] text-[15px] font-medium">
                {(nextRoute.route_building_names ?? []).join(' → ') || '경로 정보 없음'}
              </span>
              <span className="text-[#a775ca] text-xl font-bold">
                {nextRoute.estimated_minutes != null ? `${nextRoute.estimated_minutes}분` : '00분'}
              </span>
            </div>
          </div>
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

      <BottomNav onPet={onOpenPet} onProfile={onOpenProfile} homeActive />
    </div>
  );
}
