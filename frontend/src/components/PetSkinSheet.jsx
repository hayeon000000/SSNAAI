\import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

// 아래에서 올라오는 반투명 시트. 뒤의 수룡이 화면이 다 가려지지 않도록
// 시트 자체를 반투명하게 하고, 화면 전체가 아니라 절반 정도만 올라오게 한다.
// 수룡이 캐릭터(스킨)를 그리드로 보여주고 고르면 onSelect(id)를 호출한다.
// badgeCount보다 skin.requiredBadges가 크면 잠금 처리(흐리게 + 자물쇠 + 필요 개수 안내).
// 잠긴 스킨을 누르면 "뱃지 N개 이상이어야 해제됩니다!" 토스트가 잠깐 떴다가 사라진다.
export default function PetSkinSheet({ open, skins, badgeCount = 0, onSelect, onClose }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!open) setToast(null);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleClickSkin = (skin) => {
    const required = skin.requiredBadges ?? 0;
    if (badgeCount < required) {
      setToast(`🔒 뱃지 ${required}개 이상이어야 해제됩니다! (지금 ${badgeCount}개)`);
      return;
    }
    onSelect(skin.id);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        open ? 'bg-black/10' : 'pointer-events-none bg-transparent'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm max-h-[55vh] overflow-y-auto bg-white/70 backdrop-blur-sm rounded-t-[32px] shadow-[0px_-4px_30px_rgba(167,139,186,0.35)] px-6 pt-5 pb-8 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-[#d8c8e4] mx-auto mb-5" />
        <h2 className="text-lg font-bold text-[#a775ca] text-center mb-5">수룡이 꾸미기</h2>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          {skins.map((skin) => {
            const required = skin.requiredBadges ?? 0;
            const locked = badgeCount < required;
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => handleClickSkin(skin)}
                aria-label={locked ? `${skin.label} (뱃지 ${required}개 필요)` : skin.label}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors ${
                  locked ? '' : 'hover:bg-[#a78bba]/10 active:bg-[#a78bba]/20'
                }`}
              >
                <div className="relative">
                  <img
                    src={skin.image}
                    alt={skin.label}
                    className={`w-16 h-auto ${locked ? 'opacity-30 grayscale' : ''}`}
                  />
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#a775ca]" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <span className="text-[12px] font-medium text-[#a775ca]">
                  {locked ? `뱃지 ${required}개 필요` : skin.label}
                </span>
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 bg-[#4a3b57] text-white text-[13px] font-medium px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
