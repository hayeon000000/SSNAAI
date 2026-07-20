import { useState } from 'react';
import { User, Plus } from 'lucide-react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

const DEPARTMENTS = ['컴퓨터공학과', '경영학과', 'AI융합학부', '간호학과'];
const STUDENT_YEARS = ['24학번', '23학번', '22학번', '21학번'];

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px]';

export default function ProfileScreen({ profile, onSave, onBack, onHome }) {
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [department, setDepartment] = useState(profile?.department ?? null);
  const [studentYear, setStudentYear] = useState(profile?.studentYear ?? null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [studentYearOpen, setStudentYearOpen] = useState(false);

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

        <div className="mt-8 rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-6">
          <h2 className="text-center font-semibold text-xl">프로필 편집</h2>

          <div className="relative w-[103px] h-[103px] mx-auto mt-6 mb-6">
            <div className="w-full h-full rounded-full bg-[#f4ebf7] flex items-center justify-center overflow-hidden">
              <User className="w-14 h-14 text-[#a78bba]" strokeWidth={1.5} />
            </div>
            <button
              type="button"
              aria-label="프로필 사진 변경"
              className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#a78bba] flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 작성해 주세요."
              className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setDepartmentOpen((v) => !v)}
                className={`${FIELD_CLASS} ${department ? 'text-[#a78bba]' : 'text-[#a78bba]/60'}`}
              >
                {department ?? '학과(부) 선택'}
              </button>
              {departmentOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                  {DEPARTMENTS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setDepartment(option);
                        setDepartmentOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm ${
                        department === option ? 'text-[#a78bba] font-medium' : 'text-black'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setStudentYearOpen((v) => !v)}
                className={`${FIELD_CLASS} ${studentYear ? 'text-[#a78bba]' : 'text-[#a78bba]/60'}`}
              >
                {studentYear ?? '학번 선택'}
              </button>
              {studentYearOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-2xl shadow-lg overflow-hidden">
                  {STUDENT_YEARS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setStudentYear(option);
                        setStudentYearOpen(false);
                      }}
                      className={`w-full text-left px-5 py-2.5 text-sm ${
                        studentYear === option ? 'text-[#a78bba] font-medium' : 'text-black'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={() => onSave?.({ nickname, department, studentYear })}
            className="w-[162px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
          >
            저장
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

      <BottomNav onHome={onHome} profileActive />
    </div>
  );
}
