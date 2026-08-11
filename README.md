# Elevator Congestion Backend

성신여대 엘리베이터 혼잡도 안내 서비스용 Python FastAPI 백엔드입니다.

## 역할

- `sensor_imputed.csv`의 `status_kor` 값을 현재 혼잡도로 사용합니다.
- 센서 CSV에 결측치 보정 여부(`imputed`)가 있으면 API 응답에 함께 제공합니다.
- 수업 시간표 CSV를 읽어 건물별 이동 수요를 계산합니다.
- 현재 혼잡도, 10분 후 예측 혼잡도, 예상 대기 시간, 계단 추천 여부를 제공합니다.
- 로그인은 학번 기반입니다.
- 학번별 시간표, 즐겨찾기, 계단 이용 보상, 뱃지, 수룡이 건강 점수를 관리합니다.
- 원하는 장소와 시간대의 혼잡도 알림을 설정하고 조회할 수 있습니다.
- 학번 사용자 데이터는 SQLite DB에 저장합니다.

## 데이터 위치

```text
data/sensor_imputed.csv
data/sensor_clean.csv
data/schedule_semester_1.csv
data/schedule_semester_2.csv
```

## DB

사용자 기능은 SQLite DB에 저장합니다.

DB 파일 위치:

```text
data/app.db
```

서버가 처음 실행될 때 자동으로 생성되는 테이블:

```text
users
user_timetable
favorite_places
stair_uses
alerts
```

DB에 저장되는 정보:

- 학번 로그인 사용자
- 사용자가 직접 등록한 시간표
- 장소 즐겨찾기
- 계단 이용 기록
- 보상 점수
- 뱃지 계산에 필요한 누적 계단 이용 층 수
- 수룡이 건강 점수
- 혼잡도 알림 설정

`data/app.db`는 실행 중 생성되는 로컬 DB 파일이므로 Git에는 올리지 않습니다. 배포할 때는 `data/` 폴더를 볼륨으로 유지해야 서버 재시작 후에도 사용자 데이터가 남습니다.

## 실행

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload
```

서버 주소:

```text
http://localhost:8000
```

Docker로 실행:

```bash
docker compose up --build
```

## 주요 API

```text
GET  /api/home/map
GET  /api/buildings/{building_id}
GET  /api/routes/recommend

POST /api/users/login
GET  /api/users/{student_id}
POST /api/users/{student_id}/timetable
POST /api/users/{student_id}/favorites
POST /api/users/{student_id}/stair-uses
GET  /api/users/{student_id}/rewards
GET  /api/users/{student_id}/next-route

POST /api/alerts
GET  /api/alerts/user/{student_id}
GET  /api/alerts/user/{student_id}/active

GET  /api/schedules/search
GET  /api/data/summary
```

`/api/routes/recommend`는 건물 간 실제 이동 순서를 함께 제공합니다.

```text
학생회관 -> 난향관
학생회관 -> 난향관 -> 성신관
학생회관 -> 난향관 -> 수정관
학생회관 -> 난향관 -> 성신관 -> 수정관
```

응답의 `route_buildings`는 선택된 이동 경로이고, `route_options`는 가능한 후보 경로 목록입니다.

## 건물 코드

```text
SOOJUNG   수정관
SUNGSHIN  성신관
NANHYANG  난향관
UNJEONG   운정그린캠퍼스
PRIME     프라임관
STUDENT_HALL 학생회관
```

현재 센서 CSV에는 건물/층 정보가 없으므로 기본 센서 위치는 `SOOJUNG` 1층 메인 엘리베이터로 매핑합니다. 다른 건물의 혼잡도는 센서 흐름과 시간표 기반 이동 수요를 함께 사용해 추정합니다.
