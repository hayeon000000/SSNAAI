// 백엔드 주소를 여기 한 곳에서만 관리한다.
// 정민이한테 최종 주소(ngrok 또는 배포 주소) 받으면
// 프로젝트 루트에 .env 파일 만들고 아래 한 줄만 채우면 됨:
//   VITE_API_BASE_URL=https://xxxx.ngrok-free.app
// .env가 없으면 로컬 백엔드(localhost:8000, README 기준 FastAPI 기본 포트)를 기본값으로 쓴다.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ' https://0275-203-250-154-87.ngrok-free.app';

// 시간표 이미지 업로드(Timetable api.py, 예린이가 만든 별도 서버)용 주소.
// 정민이 메인 서버(5000번)랑 별개로 5002번에서 돈다.
// 나중에 하나로 합쳐지면 이 값도 API_BASE_URL이랑 같은 곳을 보게 바꾸면 됨.
export const TIMETABLE_UPLOAD_BASE_URL =
  import.meta.env.VITE_TIMETABLE_UPLOAD_BASE_URL ??  'https://0275-203-250-154-87.ngrok-free.app';

// device_id / student_id 로그인 세션을 아주 단순하게 localStorage에 저장.
// 나중에 실제 로그인 화면이 생기면 로그인 성공 시 setStudentId를 호출하면 된다.
const STUDENT_ID_KEY = 'ssnaai_student_id';
const PASSWORD_KEY = 'ssnaai_password';

export function getStudentId() {
  return localStorage.getItem(STUDENT_ID_KEY);
}

export function getPassword() {
  return localStorage.getItem(PASSWORD_KEY);
}

export function setStudentId(id) {
  if (id == null) {
    localStorage.removeItem(STUDENT_ID_KEY);
  } else {
    localStorage.setItem(STUDENT_ID_KEY, id);
  }
}

export function setPassword(password) {
  if (password == null) {
    localStorage.removeItem(PASSWORD_KEY);
  } else {
    localStorage.setItem(PASSWORD_KEY, password);
  }
}
