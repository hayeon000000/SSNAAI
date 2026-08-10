// 아래에서 올라오는 반투명 시트. 뒤의 수룡이 화면이 다 가려지지 않도록
// 시트 자체를 반투명하게 하고, 화면 전체가 아니라 절반 정도만 올라오게 한다.
// 수룡이 캐릭터(스킨)를 그리드로 보여주고 고르면 onSelect(id)를 호출한다.
export default function PetSkinSheet({ open, skins, onSelect, onClose }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-colors duration-300 ${
        open ? 'bg-black/10' : 'pointer-events-none bg-transparent'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm max-h-[55vh] overflow-y-auto bg-white/70 backdrop-blur-sm rounded-t-[32px] shadow-[0px_-4px_30px_rgba(167,139,186,0.35)] px-6 pt-5 pb-8 transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-[#d8c8e4] mx-auto mb-5" />
        <h2 className="text-lg font-bold text-[#a775ca] text-center mb-5">수룡이 꾸미기</h2>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6">
          {skins.map((skin) => (
            <button
              key={skin.id}
              type="button"
              onClick={() => onSelect(skin.id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors hover:bg-[#a78bba]/10 active:bg-[#a78bba]/20"
            >
              <img src={skin.image} alt={skin.label} className="w-16 h-auto" />
              <span className="text-[12px] font-medium text-[#a775ca]">{skin.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
