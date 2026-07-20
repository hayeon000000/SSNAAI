import { X } from 'lucide-react';

export default function StairsTipBanner({ onClose }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-50">
      <div className="relative bg-white/50 rounded-2xl shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] px-5 py-3 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-[#a775ca]/70 hover:text-[#a775ca]"
          aria-label="알림 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-[#a775ca] font-bold text-[15px]">계단 이용을 추천해요!</p>
      </div>
    </div>
  );
}
