import { useState } from 'react';
import { User, Plus } from 'lucide-react';
import { BadgeIcon, ProfileBadge, HomeIcon } from './NavIcons';
import { getNow } from '../lib/getNow';

const DEPARTMENTS = ['컴퓨터공학과', '경영학과', 'AI융합학부', '간호학과'];
const STUDENT_YEARS = ['24학번', '23학번', '22학번', '21학번'];

const FIELD_CLASS = 'w-full h-[47px] rounded-full bg-[#d9d9d9] px-5 flex items-center text-left text-sm';

export default function ProfileScreen({ profile, onSave, onBack }) {
  const { date, time } = getNow();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [department, setDepartment] = useState(profile?.department ?? null);
  const [studentYear, setStudentYear] = useState(profile?.studentYear ?? null);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [studentYearOpen, setStudentYearOpen] = useState(false);

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-neutral-950 text-white flex flex-col justify-between px-4 py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-purple-400">SSNAAI</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>{date}</span>
            <span>{time}</span>
          </div>
        </div>

        <div className="bg-[#f0f0f0] rounded-3xl px-6 py-6">
          <h2 className="text-black text-center font-semibold text-lg mb-5">프로필 수정</h2>

          <div className="relative w-[100px] h-[100px] mx-auto mb-6">
            <div className="w-full h-full rounded-full bg-neutral-400 flex items-center justify-center overflow-hidden">
              <User className="w-14 h-14 text-neutral-100" strokeWidth={1.5} />
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#c8a8e9] flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 작성해 주세요."
              className={`${FIELD_CLASS} text-black placeholder:text-black/50 outline-none`}
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setDepartmentOpen((v) => !v)}
                className={`${FIELD_CLASS} ${department ? 'text-purple-500 font-medium' : 'text-black/50'}`}
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
                        department === option ? 'text-purple-500 font-medium' : 'text-black'
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
                className={`${FIELD_CLASS} ${studentYear ? 'text-purple-500 font-medium' : 'text-black/50'}`}
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
                        studentYear === option ? 'text-purple-500 font-medium' : 'text-black'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSave?.({ nickname, department, studentYear })}
            className="w-full h-[47px] rounded-full bg-[#d9d9d9]/50 text-black/60 text-sm font-medium mt-8"
          >
            완료
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 mt-8">
        <button type="button">
          <BadgeIcon className="w-7 h-9 text-neutral-400" />
        </button>

        <button type="button" onClick={onBack} className="w-14 h-14 transition hover:brightness-125">
          <HomeIcon className="w-full h-full text-neutral-400 hover:text-[#c8a8e9]" />
        </button>

        <button type="button" className="w-11 h-14">
          <ProfileBadge className="w-full h-full" />
        </button>
      </div>
    </div>
  );
}
