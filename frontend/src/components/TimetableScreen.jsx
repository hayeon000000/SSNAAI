import { useRef, useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import { uploadTimetableImage } from '../lib/timetableUploadApi';
import { addTimetableEntry, searchSchedules } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';
import { getLocalTimetable, setLocalTimetable } from '../lib/localCache';
import { findCurrentOrNextClass } from '../lib/timetable';

// 업로드된 시간표의 실제 과목 시간에 맞춰 그리드 범위를 자동으로 잡는다.
// 과목이 없을 때만 09:00~18:00 기본값을 쓴다.
const FALLBACK_START_HOUR = 9;
const FALLBACK_END_HOUR = 18;
const SLOT_MINUTES = 30;

const DAYS = ['월', '화', '수', '목', '금'];

const SUBJECT_COLORS = [
  '#a78bba', '#c8a8e9', '#93b58f', '#d9c37a', '#d480bc', '#8fb5ac', '#e0a9a2',
];

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// 과목들의 시작/끝 시간을 훑어서 그리드가 보여줄 시간 범위를 구한다.
// 정각 단위로 살짝 여유를 둬서(내림/올림) 블록이 그리드 맨 끝에 딱 붙지 않게 한다.
function getHourRange(subjects) {
  if (!subjects || subjects.length === 0) {
    return { startHour: FALLBACK_START_HOUR, endHour: FALLBACK_END_HOUR };
  }
  const starts = subjects.map((s) => timeToMinutes(s.start_time));
  const ends = subjects.map((s) => timeToMinutes(s.end_time));
  const startHour = Math.floor(Math.min(...starts) / 60);
  const endHour = Math.ceil(Math.max(...ends) / 60);
  return { startHour, endHour: Math.max(endHour, startHour + 1) };
}

function timeToSlot(timeStr, startHour) {
  const [h, m] = timeStr.split(':').map(Number);
  return Math.round(((h - startHour) * 60 + m) / SLOT_MINUTES);
}

// 시간표 그리드 한 칸(요일x시간) 위에 과목 블록을 절대 배치로 그린다.
function WeeklyGrid({ subjects }) {
  const { startHour, endHour } = getHourRange(subjects);
  const totalSlots = ((endHour - startHour) * 60) / SLOT_MINUTES;
  const hourLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const rowHeight = 22; // px, 30분당 높이

  return (
    <div className="flex bg-white/70 rounded-xl overflow-hidden text-[10px] text-[#4a3b57]">
      {/* 시간 라벨 컬럼 */}
      <div className="flex flex-col shrink-0 w-9 border-r border-[#c9b8d6]/50">
        <div style={{ height: 24 }} />
        {hourLabels.map((h) => (
          <div
            key={h}
            style={{ height: rowHeight * 2 }}
            className="flex items-start justify-center pt-0.5 border-t border-[#c9b8d6]/30"
          >
            {String(h).padStart(2, '0')}
          </div>
        ))}
      </div>

      {/* 요일 컬럼들 */}
      <div className="flex-1 grid grid-cols-5">
        {DAYS.map((day) => (
          <div key={day} className="relative border-r last:border-r-0 border-[#c9b8d6]/30">
            <div style={{ height: 24 }} className="flex items-center justify-center font-semibold border-b border-[#c9b8d6]/30">
              {day}
            </div>
            <div className="relative" style={{ height: rowHeight * totalSlots }}>
              {/* 시간대 구분선 */}
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-[#c9b8d6]/20"
                  style={{ top: (h - startHour) * rowHeight * 2 }}
                />
              ))}

              {subjects
                .filter((s) => s.day === day)
                .map((s, i) => {
                  const top = timeToSlot(s.start_time, startHour) * rowHeight;
                  const height = Math.max(
                    (timeToSlot(s.end_time, startHour) - timeToSlot(s.start_time, startHour)) * rowHeight,
                    rowHeight
                  );
                  const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                  return (
                    <div
                      key={`${s.subject}-${s.start_time}-${i}`}
                      className="absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 text-white overflow-hidden"
                      style={{ top, height, backgroundColor: color }}
                    >
                      <p className="font-semibold leading-tight truncate">{s.subject}</p>
                      {s.room && <p className="opacity-80 leading-tight truncate">{s.room}</p>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimetableScreen({ onSave, onBack, onHome, onOpenPet }) {
  const fileInputRef = useRef(null);
  const cached = getLocalTimetable();
  // 캐시에 저장된 시간표가 있으면 업로드 없이 바로 그리드를 보여준다('ready').
  const [status, setStatus] = useState(cached.subjects.length > 0 ? 'ready' : 'idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [semester, setSemester] = useState(cached.semester);
  const [subjects, setSubjects] = useState(cached.subjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = 검색 안 함
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchSchedules({ keyword: searchQuery.trim() });
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('[TimetableScreen] 수업 검색 실패:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 검색 결과에서 과목을 눌러 현재 시간표에 바로 추가
  const handleAddFromSearch = (result) => {
    setSubjects((prev) => [...prev, result]);
    setStatus('ready');
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setErrorMessage(null);

    try {
      const result = await uploadTimetableImage(file);
      setSemester(result.semester ?? null);
      setSubjects(result.subjects ?? []);
      setStatus('ready');
    } catch (err) {
      console.error('[TimetableScreen] 업로드 실패:', err);
      setErrorMessage(err.message ?? '시간표 인식에 실패했어요. 다시 시도해줘.');
      setStatus('error');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const studentId = getStudentId();
    if (!studentId) {
      setErrorMessage('로그인 정보가 없어요. (로그인 화면 연동 후 해결됨)');
      return;
    }
    if (subjects.length === 0) {
      setErrorMessage('저장할 과목이 없어요.');
      return;
    }
    setStatus('saving');
    setErrorMessage(null);

    // ⚠️ 시간표 등록 API는 과목 하나씩만 받음 — 반복 호출.
    // building_id/floor는 안 보내도 백엔드가 room으로 알아서 추정해줌.
    let failCount = 0;
    for (const subject of subjects) {
      try {
        await addTimetableEntry(studentId, {
          subject: subject.subject,
          day: subject.day,
          start_time: subject.start_time,
          end_time: subject.end_time,
          room: subject.room ?? '',
        });
      } catch (err) {
        console.error('[TimetableScreen] 과목 저장 실패:', subject, err);
        failCount += 1;
      }
    }

    if (failCount > 0) {
      setErrorMessage(`${failCount}개 과목 저장에 실패했어요. 다시 시도해줘.`);
      setStatus('ready');
    } else {
      setLocalTimetable({ semester, subjects });
      onSave?.();
    }
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">SSNAAI</h1>
          <NotificationBell />
        </div>

        <div className="mt-8 rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-4 py-5">
          <h2 className="text-center font-semibold text-xl text-[#4a3b57] mb-4">시간표 관리</h2>

          {/* 수업/강의실 검색 — 이름·과목명으로 검색해서 시간표에 바로 추가 가능 */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="과목명/강의실 검색"
                className="flex-1 h-9 rounded-full bg-white/70 px-4 text-sm text-[#4a3b57] placeholder:text-[#4a3b57]/50 outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-4 h-9 rounded-full bg-[#a78bba] text-white text-sm font-medium disabled:opacity-50"
              >
                {searching ? '검색 중...' : '검색'}
              </button>
            </div>
            {searchResults !== null && (
              <div className="mt-2 flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                {searchResults.length === 0 && (
                  <p className="text-xs text-[#4a3b57]/60 text-center py-2">검색 결과가 없어요.</p>
                )}
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddFromSearch(result)}
                    className="text-left text-xs bg-white/70 rounded-lg px-3 py-1.5 text-[#4a3b57] hover:bg-white"
                  >
                    <span className="font-semibold">{result.subject}</span>{' '}
                    {result.day} {result.start_time}–{result.end_time}
                    {result.room ? ` · ${result.room}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {status === 'idle' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-[#4a3b57] text-sm text-center leading-relaxed">
                에브리타임 시간표 스크린샷을
                <br />
                올리면 자동으로 인식해줘요.
              </p>
              <button
                type="button"
                onClick={handlePickImage}
                className="py-2.5 px-6 rounded-full bg-[#a78bba] text-white text-[14px] font-medium transition hover:brightness-95"
              >
                스크린샷 업로드
              </button>
            </div>
          )}

          {status === 'uploading' && (
            <div className="flex items-center justify-center py-16">
              <p className="text-[#a78bba] text-sm font-medium">시간표 인식 중...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <p className="text-red-500 text-sm text-center">{errorMessage}</p>
              <button
                type="button"
                onClick={handlePickImage}
                className="py-2.5 px-6 rounded-full bg-[#a78bba] text-white text-[14px] font-medium transition hover:brightness-95"
              >
                다시 업로드
              </button>
            </div>
          )}

          {(status === 'ready' || status === 'saving') && (
            <div className="flex flex-col gap-2">
              {semester && <p className="text-[#a78bba] text-sm font-medium text-center">{semester}</p>}

              {(() => {
                const found = findCurrentOrNextClass(subjects);
                if (!found) return null;
                const { subject, status: classStatus } = found;
                return (
                  <div className="rounded-xl bg-white/70 px-4 py-2.5 text-center mb-1">
                    <p className="text-[#a78bba] text-xs font-medium">
                      {classStatus === 'ongoing' ? '지금 수업 중' : '다음 수업'}
                    </p>
                    <p className="text-[#4a3b57] text-sm font-semibold mt-0.5">
                      {subject.subject} · {subject.start_time}~{subject.end_time}
                      {subject.room ? ` · ${subject.room}` : ''}
                    </p>
                  </div>
                );
              })()}

              <WeeklyGrid subjects={subjects} />

              <button
                type="button"
                onClick={handlePickImage}
                className="mt-2 text-[#a78bba] text-xs font-medium underline self-center"
              >
                다른 스크린샷으로 다시 인식하기
              </button>
            </div>
          )}
        </div>

        {errorMessage && status !== 'error' && (
          <p className="text-center text-sm text-white mt-3">{errorMessage}</p>
        )}

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={status !== 'ready' && status !== 'saving'}
            className="w-[162px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70 disabled:opacity-40"
          >
            {status === 'saving' ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-[162px] py-3 rounded-[37px] bg-[#a78bba]/50 text-white text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-[#a78bba]/70"
          >
            취소
          </button>
        </div>
      </div>

      <BottomNav onPet={onOpenPet} onHome={onHome} profileActive />
    </div>
  );
}
