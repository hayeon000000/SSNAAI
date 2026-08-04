// Figma(SSNAAI 수룡키우기, node-id 208:323)의 수룡이 꾸미기 화면.
import { useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import PetSkinSheet from './PetSkinSheet';
import suryong from '../assets/pet/suryong.png';
import strawberrySuryong from '../assets/pet/strawberry_suryong.png';

// 첫 칸은 원래 수룡이로 돌아가는 기본 스킨. 나머지는 지금은 딸기 수룡이로
// 채운 placeholder라, 나중에 각 칸을 다른 수룡이 캐릭터(이미지)로 바꾸면
// 그리드에 그대로 반영된다.
const SKINS = [
  { id: 'default', label: '수룡이', image: suryong },
  { id: 'strawberry-1', label: '딸기 수룡이', image: strawberrySuryong },
  { id: 'strawberry-2', label: '딸기 수룡이', image: strawberrySuryong },
  { id: 'strawberry-3', label: '딸기 수룡이', image: strawberrySuryong },
  { id: 'strawberry-4', label: '딸기 수룡이', image: strawberrySuryong },
  { id: 'strawberry-5', label: '딸기 수룡이', image: strawberrySuryong },
];

export default function PetScreen({ onHome, onOpenProfile }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSkinId, setActiveSkinId] = useState('default');

  const activeImage = SKINS.find((skin) => skin.id === activeSkinId)?.image ?? suryong;

  const handleSelectSkin = (id) => {
    setActiveSkinId(id);
    setSheetOpen(false);
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
      </div>

      <BottomNav onHome={onHome} onProfile={onOpenProfile} petActive />

      <PetSkinSheet
        open={sheetOpen}
        skins={SKINS}
        onSelect={handleSelectSkin}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
