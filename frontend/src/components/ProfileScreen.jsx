import { useState } from 'react';
import { User, Plus } from 'lucide-react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

const DEPARTMENTS = [
  '국어국문학과',
  '영어영문학과',
  '독일어문·문화학과',
  '프랑스어문·문화학과',
  '일본어문·문화학과',
  '중어중문·문화학과',
  '사학과',
  '정치외교학과',
  '심리학과',
  '지리학과',
  '경제학과',
  '경영학과',
  '미디어커뮤니케이션학과',
  '법학과',
  '지식산업법학과',
  '수학과',
  '통계학과',
  '융합보안공학과',
  '컴퓨터공학과',
  '정보시스템공학과',
  '서비스디자인공학과',
  'AI융합학부',
  'AI',
  '지능형IoT',
  '청정신소재공학과',
  '교육학과',
  '사회교육과',
  '윤리교육과',
  '한문교육과',
  '유아교육과',
  '의류산업학과',
  '소비자산업학과',
  '뷰티산업학과',
  '스포츠과학부',
  '스포츠레저전공',
  '운동재활전공',
  '간호학과',
];
// 올해 입학년도부터 20년 전까지, 실제 존재할 수 있는 학번을 최신순으로 생성.
const CURRENT_ADMISSION_YEAR = new Date().getFullYear();
const STUDENT_YEARS = Array.from(
  { length: 20 },
  (_, i) => `${String((CURRENT_ADMISSION_YEAR - i) % 100).padStart(2, '0')}학번`
);

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px]';

export default function ProfileScreen({ profile, onSave, onBack, onHome, onOpenPet }) {
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [password, setPassword] = useState('');
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

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요."
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
                <div className="absolute z-10 top-full mt-1 w-full max-h-64 overflow-x-hidden overflow-y-auto bg-white rounded-2xl shadow-lg">
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
                <div className="absolute z-10 top-full mt-1 w-full max-h-64 overflow-x-hidden overflow-y-auto bg-white rounded-2xl shadow-lg">
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
            onClick={() => onSave?.({ nickname, department, studentYear, password })}
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

      <BottomNav onPet={onOpenPet} onHome={onHome} profileActive />
    </div>
  );
}
