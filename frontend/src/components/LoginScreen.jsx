import { useState } from 'react';
import { login } from '../lib/api';
import { setStudentId } from '../lib/apiConfig';

// ⚠️ 실제 백엔드(main 브랜치) 확인 결과: 로그인은 학번(student_id)만 필요함.
// 이름/비밀번호 없음 — 없는 학번이면 그냥 새로 만들어짐.

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px]';

export default function LoginScreen({ onLoginSuccess }) {
  const [studentId, setStudentIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!studentId.trim()) {
      setError('학번을 입력해줘.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await login(studentId.trim());
      setStudentId(result?.student_id ?? studentId.trim());
      onLoginSuccess?.(result);
    } catch (err) {
      console.error('[LoginScreen] 로그인 실패:', err);
      setError('로그인에 실패했어. 다시 시도해줘.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex flex-col flex-1 justify-center">
        <h1 className="text-3xl font-semibold text-center mb-10">SSNAAI</h1>

        <div className="rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-6">
          <h2 className="text-center font-semibold text-xl text-[#4a3b57] mb-6">로그인</h2>

          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentIdInput(e.target.value)}
              placeholder="학번을 입력해 주세요."
              className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center mt-3">{error}</p>}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full mt-5 py-3 rounded-full bg-[#a78bba] text-white text-[15px] font-medium transition hover:brightness-95 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
