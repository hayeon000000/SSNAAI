import { useRef, useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

const ALL_BUILDINGS = [
  '수정관A',
  '성신관',
  '난향관',
  '도서관',
  '수정관B',
  '수정관C',
  '음악관',
  '조형1관',
  '조형2관',
  '체육관',
  '학생회관',
  '행정관',
];

function pointInRect(x, y, rect) {
  return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// dragged를 제거한 뒤 target 바로 앞자리에 끼워 넣어 순서를 재배치한다.
function reorder(list, dragged, target) {
  const without = list.filter((name) => name !== dragged);
  const targetIndex = without.indexOf(target);
  if (targetIndex === -1) return list;
  const next = [...without];
  next.splice(targetIndex, 0, dragged);
  return next;
}

function BuildingPill({ name, favorited, onDragStart, onDragEnd, onDragEnter, onTouchStart, pillRef }) {
  return (
    <div
      ref={pillRef}
      draggable
      onDragStart={() => onDragStart(name)}
      onDragEnd={onDragEnd}
      onDragEnter={(e) => {
        e.stopPropagation();
        onDragEnter(name);
      }}
      onTouchStart={(e) => onTouchStart(name, e)}
      style={{ touchAction: 'none' }}
      className={`h-[46px] rounded-full text-[15px] font-medium flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-colors ${
        favorited ? 'bg-[#a78bba]/50 text-white' : 'bg-white/50 text-[#a78bba]'
      }`}
    >
      {name}
    </div>
  );
}

export default function BuildingFavoritesScreen({ onSave, onBack, onHome }) {
  const [favorites, setFavorites] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [touchPoint, setTouchPoint] = useState(null);
  const topZoneRef = useRef(null);
  const bottomZoneRef = useRef(null);
  const pillRefs = useRef({});

  const remaining = ALL_BUILDINGS.filter((name) => !favorites.includes(name));

  const handleDragStart = (name) => setDragging(name);
  const handleDragEnd = () => setDragging(null);

  const handleFavoritesEnter = () => {
    if (dragging && !favorites.includes(dragging)) {
      setFavorites((prev) => [...prev, dragging]);
    }
  };

  const handleRemainingEnter = () => {
    if (dragging && favorites.includes(dragging)) {
      setFavorites((prev) => prev.filter((name) => name !== dragging));
    }
  };

  // 즐겨찾기 pill 위로 직접 들어오면 그 자리에 끼워 넣어 순서를 바꾼다.
  const handlePillEnter = (targetName) => {
    if (!dragging || dragging === targetName) return;
    setFavorites((prev) => {
      if (!prev.includes(targetName)) return prev;
      const base = prev.includes(dragging) ? prev : [...prev, dragging];
      return reorder(base, dragging, targetName);
    });
  };

  // 모바일 터치는 HTML5 드래그 이벤트를 지원하지 않아, 손가락 좌표를 직접 추적해
  // 같은 "줄을 넘는 순간 즐겨찾기 전환/순서 변경" 동작을 재현한다.
  const handleTouchStart = (name, e) => {
    setDragging(name);
    const touch = e.touches[0];
    setTouchPoint({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setTouchPoint({ x: touch.clientX, y: touch.clientY });

    const hoveredEntry = Object.entries(pillRefs.current).find(([name, el]) => {
      if (name === dragging || !el) return false;
      return pointInRect(touch.clientX, touch.clientY, el.getBoundingClientRect());
    });

    if (hoveredEntry && favorites.includes(hoveredEntry[0])) {
      handlePillEnter(hoveredEntry[0]);
      return;
    }

    const topRect = topZoneRef.current?.getBoundingClientRect();
    const bottomRect = bottomZoneRef.current?.getBoundingClientRect();

    if (pointInRect(touch.clientX, touch.clientY, topRect)) {
      setFavorites((prev) => (prev.includes(dragging) ? prev : [...prev, dragging]));
    } else if (pointInRect(touch.clientX, touch.clientY, bottomRect)) {
      setFavorites((prev) => prev.filter((name) => name !== dragging));
    }
  };

  const handleTouchEnd = () => {
    setDragging(null);
    setTouchPoint(null);
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">SSNAAI</h1>
          <NotificationBell />
        </div>

        <div className="mt-8 rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-6">
          <h2 className="text-center font-semibold text-xl">건물 즐겨찾기</h2>
          <p className="text-center text-sm mt-2 leading-relaxed">
            즐겨찾기한 건물은 목적지 선택 시
            <br />
            아래의 순서로 상단에 배치됩니다.
          </p>

          <div
            ref={topZoneRef}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={handleFavoritesEnter}
            className="min-h-[46px] grid grid-cols-3 gap-3 mt-5"
          >
            {favorites.map((name) => (
              <BuildingPill
                key={name}
                name={name}
                favorited
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handlePillEnter}
                onTouchStart={handleTouchStart}
                pillRef={(el) => {
                  pillRefs.current[name] = el;
                }}
              />
            ))}
          </div>

          <hr className="border-white/60 my-4" />

          <div
            ref={bottomZoneRef}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={handleRemainingEnter}
            className="min-h-[46px] grid grid-cols-3 gap-3"
          >
            {remaining.map((name) => (
              <BuildingPill
                key={name}
                name={name}
                favorited={false}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={() => {}}
                onTouchStart={handleTouchStart}
                pillRef={(el) => {
                  pillRefs.current[name] = el;
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={onBack}
            className="w-[162px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSave?.(favorites)}
            className="w-[162px] py-3 rounded-[37px] bg-[#a78bba]/50 text-white text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-[#a78bba]/70"
          >
            저장
          </button>
        </div>
      </div>

      <BottomNav onHome={onHome} profileActive />

      {dragging && touchPoint && (
        <div
          className="fixed z-50 pointer-events-none h-[46px] px-6 rounded-full text-[15px] font-medium flex items-center justify-center bg-[#a78bba] text-white shadow-lg"
          style={{ left: touchPoint.x, top: touchPoint.y, transform: 'translate(-50%, -50%)' }}
        >
          {dragging}
        </div>
      )}
    </div>
  );
}
