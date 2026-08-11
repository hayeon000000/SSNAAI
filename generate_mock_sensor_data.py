# 발표 직전에 이 스크립트를 한 번 실행하면, "지금" 기준으로 최근 5일치(평일 위주)
# 센서 데이터를 새로 만들어서 data/sensor_imputed.csv를 덮어쓴다.
#
# 왜 필요한가:
#   - 백엔드(congestion_service.resolve_base_time)는 요청에 시간을 안 주면
#     "센서 CSV의 마지막 줄 시각"을 지금 시각으로 취급한다. 즉 이 파일의
#     마지막 줄이 언제냐에 따라 발표 때 보여줄 혼잡도가 결정된다.
#   - 기존 파일은 결측치가 73%나 됐고, "혼잡" 라벨이 전체의 0.7%뿐이라
#     "사람 몰리는 시간대 = 혼잡"이라는 패턴이 거의 안 보였음.
#
# 사용법:
#   python generate_mock_sensor_data.py
#   (백엔드 재시작 없이도 반영됨 — data_store가 60초 간격으로 자동 재로드함,
#    app/config.py의 reload_seconds 참고)

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent / "data" / "sensor_imputed.csv"
INTERVAL_MINUTES = 5
DAYS_BACK = 5  # 최근 5일(주말 포함, 주말은 항상 여유로 처리)

FIELDNAMES = [
    "timestamp", "pir1", "pir2", "ultra1_dist", "ultra2_dist",
    "ultra1_detect", "ultra2_detect", "status",
    "pir1_missing", "pir2_missing", "ultra1_missing", "ultra2_missing",
    "imputed", "hour", "minute", "day_of_week", "day_name", "date", "status_kor",
]

# 등교/점심/오후수업 이동 시간대(8:40~9시, 11:40~12시, 14:40~15시)를 "혼잡"으로,
# 그 앞뒤 5~10분을 "보통"으로, 나머지는 "여유"로 잡는다.
PEAK_WINDOWS = [
    (8 * 60 + 40, 9 * 60 + 0),
    (11 * 60 + 40, 12 * 60 + 0),
    (14 * 60 + 40, 15 * 60 + 0),
]
MODERATE_WINDOWS = [
    (8 * 60 + 30, 8 * 60 + 40),   # 혼잡 시작 전 10분
    (9 * 60 + 0, 9 * 60 + 10),    # 혼잡 끝난 후 10분
    (11 * 60 + 30, 11 * 60 + 40),
    (12 * 60 + 0, 12 * 60 + 10),
    (14 * 60 + 30, 14 * 60 + 40),
    (15 * 60 + 0, 15 * 60 + 10),
    (17 * 60 + 40, 18 * 60 + 10),  # 하교시간대
]


def classify(minute_of_day: int, is_weekend: bool) -> str:
    if is_weekend:
        return "여유"
    for start, end in PEAK_WINDOWS:
        if start <= minute_of_day < end:
            return "혼잡"
    for start, end in MODERATE_WINDOWS:
        if start <= minute_of_day < end:
            return "보통"
    # 캠퍼스 운영시간(08:00~20:00) 밖은 항상 여유
    if minute_of_day < 8 * 60 or minute_of_day >= 20 * 60:
        return "여유"
    return "여유"


def make_row(ts: datetime, label: str) -> dict:
    if label == "혼잡":
        pir1, pir2 = 1.0, 1.0
        ultra1, ultra2 = round(random.uniform(5, 18), 2), round(random.uniform(5, 18), 2)
        status = "Crowded"
    elif label == "보통":
        pir1, pir2 = 1.0, float(random.choice([0, 1]))
        ultra1, ultra2 = round(random.uniform(40, 85), 2), round(random.uniform(40, 85), 2)
        status = "Normal"
    else:
        pir1, pir2 = 0.0, 0.0
        ultra1, ultra2 = round(random.uniform(130, 160), 2), round(random.uniform(130, 160), 2)
        status = "Not crowded"

    return {
        "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
        "pir1": pir1,
        "pir2": pir2,
        "ultra1_dist": ultra1,
        "ultra2_dist": ultra2,
        "ultra1_detect": "detect" if label != "여유" else "none",
        "ultra2_detect": "detect" if label != "여유" else "none",
        "status": status,
        "pir1_missing": False,
        "pir2_missing": False,
        "ultra1_missing": False,
        "ultra2_missing": False,
        "imputed": False,  # 목업이라 결측 없이 깨끗하게 채움
        "hour": ts.hour,
        "minute": ts.minute,
        "day_of_week": ts.weekday(),
        "day_name": ts.strftime("%A"),
        "date": ts.strftime("%Y-%m-%d"),
        "status_kor": label,
    }


def main():
    now = datetime.now().replace(second=0, microsecond=0)
    # 5분 단위로 딱 떨어지게 내림 (예: 14:37 -> 14:35)
    now -= timedelta(minutes=now.minute % INTERVAL_MINUTES)

    start = now - timedelta(days=DAYS_BACK)
    rows = []
    ts = start
    while ts <= now:
        minute_of_day = ts.hour * 60 + ts.minute
        is_weekend = ts.weekday() >= 5  # 5=토, 6=일
        label = classify(minute_of_day, is_weekend)
        rows.append(make_row(ts, label))
        ts += timedelta(minutes=INTERVAL_MINUTES)

    # 마지막 줄(=백엔드가 "지금"으로 취급할 시각)이 뭘로 잡혔는지 알려준다.
    last = rows[-1]
    print(f"마지막 줄 시각: {last['timestamp']} ({last['day_name']}) -> {last['status_kor']}")
    print(f"총 {len(rows)}개 행 생성")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"저장 완료: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
