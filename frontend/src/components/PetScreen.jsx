// Figma(SSNAAI 수룡키우기, node-id 208:323)의 수룡이 꾸미기 화면.
import { useEffect, useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import PetSkinSheet from './PetSkinSheet';
import suryong from '../assets/pet/suryong.png';
import strawberrySuryong from '../assets/pet/strawberry_suryong.png';
import jacketSuryong from '../assets/pet/jacket_suryong.png';
import shortSleeveSuryong from '../assets/pet/short_sleeve_suryong.png';
import { logStairUse, getRewards } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';
import CameraTimestampRecorder from './CameraTimestampRecorder';

// requiredBadges: 뱃지를 그만큼 모아야 해금됨(3개마다 하나씩). 기본 수룡이는 항상 해금.
const SKINS = [
  { id: 'strawberry', label: '딸기 수룡이', image: strawberrySuryong, requiredBadges: 9 },
  { id: 'jacket', label: '과잠 수룡이', image: jacketSuryong, requiredBadges: 6 },
  { id: 'short-sleeve', label: '반소매 수룡이', image: shortSleeveSuryong, requiredBadges: 3 },
  { id: 'default', label: '수룡이', image: suryong, requiredBadges: 0 },
];

export default function PetScreen({ onHome, onOpenProfile }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSkinId, setActiveSkinId] = useState('default');
  const [rewards, setRewards] = useState(null);
  const [stairStatus, setStairStatus] = useState('idle'); // idle | logging | done | error
  const [showRecorder, setShowRecorder] = useState(false);

  const activeImage = SKINS.find((skin) => skin.id === activeSkinId)?.image ?? suryong;
  const badgeCount = rewards?.badges?.length ?? 0;

  const handleSelectSkin = (id) => {
    const skin = SKINS.find((s) => s.id === id);
    if (skin && badgeCount < skin.requiredBadges) return; // 아직 해금 안 됨 — 선택 무시
    setActiveSkinId(id);
    setSheetOpen(false);
  };

  // 화면 진입 시 보상 현황(뱃지/출석 도장 등) 조회
  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;
    getRewards(studentId)
      .then(setRewards)
      .catch((err) => console.error('[PetScreen] 보상 조회 실패:', err));
  }, []);

  const handleStairButtonClick = () => {
    const studentId = getStudentId();
    if (!studentId) {
      setStairStatus('error');
      return;
    }
    setShowRecorder(true);
  };

  const handleStairUse = async () => {
    setShowRecorder(false);
    const studentId = getStudentId();
    setStairStatus('logging');
    try {
      await logStairUse(studentId, 1);
      setStairStatus('done');
      // 기록 후 보상 현황 갱신
      getRewards(studentId).then(setRewards).catch(() => {});
    } catch (err) {
      console.error('[PetScreen] 계단 이용 기록 실패:', err);
      setStairStatus('error');
    }
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">SSNAAI</h1>
        <NotificationBell />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div className="bg-white/50 rounded-2xl shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] px-5 py-2 mb-4">
          <p className="text-[#a775ca] font-bold text-[15px]">수룡이를 눌러보세요!</p>
        </div>

        <div
          className="absolute w-72 h-72 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(167,139,186,0) 70%)' }}
        />

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="수룡이 꾸미기"
          className="relative transition active:scale-95"
        >
          <img src={activeImage} alt="수룡이" className="w-56 h-auto drop-shadow-xl" />
        </button>

        <div
          className="w-40 h-3 rounded-full mt-2"
          style={{ background: 'radial-gradient(closest-side, rgba(75,59,99,0.35) 0%, rgba(75,59,99,0) 80%)' }}
        />

        {/* 보상 현황 — app/models/schemas.py RewardResponse 기준 실제 필드명 사용 */}
        {rewards && (
          <div className="mt-4 bg-white/50 rounded-2xl px-5 py-2 text-center">
            <p className="text-[#a775ca] text-xs font-medium">
              🏅 뱃지 {rewards.badges?.length ?? 0}개 · 🪜 계단 {rewards.stair_use_floors ?? 0}층 · ⭐{' '}
              {rewards.reward_points ?? 0}점
            </p>
            <p className="text-[#a775ca] text-[10px] mt-0.5">수룡이 건강도 {rewards.suyong_health ?? 0}/100</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleStairButtonClick}
          disabled={stairStatus === 'logging'}
          className="mt-3 py-2 px-6 rounded-full bg-white/50 text-[#a775ca] text-sm font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition hover:bg-white/70 disabled:opacity-50"
        >
          {stairStatus === 'logging' ? '기록 중...' : '🪜 계단 이용했어요!'}
        </button>
        {stairStatus === 'done' && <p className="text-xs text-white mt-1">기록 완료!</p>}
        {stairStatus === 'error' && (
          <p className="text-xs text-white mt-1">기록 실패 (로그인/백엔드 연동 확인 필요)</p>
        )}
      </div>

      <BottomNav onHome={onHome} onProfile={onOpenProfile} petActive />

      <PetSkinSheet
        open={sheetOpen}
        skins={SKINS}
        badgeCount={badgeCount}
        onSelect={handleSelectSkin}
        onClose={() => setSheetOpen(false)}
      />

      {showRecorder && (
        <CameraTimestampRecorder onConfirm={handleStairUse} onCancel={() => setShowRecorder(false)} />
      )}
    </div>
  );
}
