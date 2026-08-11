// Figma "주의 안내" 경고 팝업 참고 스크린샷 기반 (목적지 삭제 확인).
export default function WarningModal({ onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center px-8 z-50"
      onClick={onClose}
    >
      <div className="w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 text-[#c8a8e9] text-sm mb-2 ml-1">
          <span>◆</span>
          <span>주의 안내</span>
        </div>

        <div className="bg-[#f0f0f0] rounded-3xl px-6 py-6 text-center">
          <p className="text-red-600 font-bold text-base mb-3">주의!</p>
          <p className="text-red-600 font-semibold text-base mb-5">목적지를 삭제하시겠습니까?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-full bg-[#cfc3dd] text-black text-sm font-medium"
            >
              예
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-[#cfc3dd] text-black text-sm font-medium"
            >
              아니오
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
