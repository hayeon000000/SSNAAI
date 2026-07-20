import { useState } from 'react';
import { X } from 'lucide-react';
import CampusMap from './CampusMap';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import WarningModal from './WarningModal';
import { getNow } from '../lib/getNow';
import { useEta } from '../lib/useEta';

const TRANSPORT_LABELS = {
  엘베만: '엘리베이터만으로',
  계단만: '계단만으로',
};

const ALT_TRANSPORT = {
  엘베만: '계단만',
  계단만: '엘베만',
};

const TRANSPORT_SHORT_LABELS = {
  엘베만: '엘리베이터',
  계단만: '계단',
};

export default function ResultScreen({ destination, transport, onEditDestination, onBack, onOpenProfile }) {
  const { date, time } = getNow();
  const [showWarning, setShowWarning] = useState(false);
  const selectedTransport = transport ?? [];
  const transportLabel =
    selectedTransport.length === 2
      ? '엘리베이터+계단으로'
      : (TRANSPORT_LABELS[selectedTransport[0]] ?? '경로 안내로');
  // 정확히 하나만 선택했을 때만 "다른 수단을 쓴다면" 비교를 보여준다.
  const showAlternative = selectedTransport.length === 1;
  const altTransportShort = TRANSPORT_SHORT_LABELS[ALT_TRANSPORT[selectedTransport[0]]] ?? '다른 수단';

  const { data: eta } = useEta(destination, selectedTransport);
  const etaLabel = eta?.etaMinutes != null ? `${eta.etaMinutes}분` : '00분';
  const altEtaLabel = eta?.alternative?.etaMinutes != null ? `${eta.alternative.etaMinutes}분` : '00분';
  const altSteps = eta?.alternative?.steps ?? [];

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex flex-col gap-1 px-7 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">SSNAAI</h1>
          <NotificationBell />
        </div>

        <div className="flex items-center justify-between text-lg font-medium">
          <span>{date}</span>
          <span>{time}</span>
        </div>
      </div>

      <div className="flex-1 min-h-[110px] px-7 py-2">
        <CampusMap />
      </div>

      <div className="relative rounded-t-[43px] bg-white/20 px-7 pt-4 pb-4">
        <button
          type="button"
          onClick={() => setShowWarning(true)}
          className="absolute top-4 right-7 text-black/50 hover:text-black"
          aria-label="목적지 삭제"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="text-black text-[15px] font-medium text-center">
          {destination}까지 {transportLabel}
        </p>
        <p className="text-[#a775ca] text-[32px] font-bold text-center mt-1">{etaLabel}</p>

        {showAlternative && (
          <>
            <hr className="border-black/10 my-3" />

            <p className="text-black text-[13px] font-medium text-center">
              만약, {altTransportShort}을 이용한다면
            </p>
            <p className="text-[#d480bc] text-2xl font-semibold text-center mt-1">{altEtaLabel}</p>

            <div className="flex flex-col gap-1.5 mt-3">
              {(altSteps.length > 0 ? altSteps : [{ from: '000', to: 'ㅁㅁㅁ', minutes: null }, { from: '000', to: 'ㅁㅁㅁ', minutes: null }]).map(
                (step, index) => (
                  <div key={index} className="flex items-center justify-between text-black text-sm">
                    <span>{step.from} → {step.to}</span>
                    <span className="text-[#d480bc] font-semibold">
                      {step.minutes != null ? `${step.minutes}분` : '00분'}
                    </span>
                  </div>
                )
              )}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onEditDestination}
          className="w-full mt-3 py-2.5 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
        >
          목적지 다시 선택하기
        </button>

        <div className="mt-3">
          <BottomNav onHome={onBack} onProfile={onOpenProfile} />
        </div>
      </div>

      {showWarning && (
        <WarningModal onClose={() => setShowWarning(false)} onConfirm={onEditDestination} />
      )}
    </div>
  );
}
