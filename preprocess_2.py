import pandas as pd
import numpy as np
import re

print("=" * 55)
print("SSANAI 데이터 전처리 + 시간표 결합")
print("=" * 55)

# ── 1단계: 센서 데이터 불러오기 ──────────────
print("\n[1단계] 원본 센서 데이터 불러오기...")

df = pd.read_csv(
    'arduino_sensor_data2.csv',
    header=None,
    names=['timestamp', 'raw_data']
)
print(f"전체 행 수: {len(df)}")

# ── 2단계: 센서 데이터 필터링 ────────────────
print("\n[2단계] 센서 데이터 필터링...")

sensor_df = df[df['raw_data'].str.contains('PIR1:', na=False)].copy()
print(f"센서 데이터 행 수: {len(sensor_df)}")

# ── 3단계: 정규식 파싱 ───────────────────────
print("\n[3단계] 데이터 파싱...")

def parse_row(row):
    try:
        raw = str(row['raw_data'])
        pir1 = re.search(r'PIR1: (\d)', raw)
        pir1 = int(pir1.group(1)) if pir1 else None
        pir2 = re.search(r'PIR2: (\d)', raw)
        pir2 = int(pir2.group(1)) if pir2 else None
        u1 = re.search(r'ultra1 distance: ([-\d.]+)cm', raw)
        u1 = float(u1.group(1)) if u1 else None
        u2 = re.search(r'ultra2 distance: ([-\d.]+)cm', raw)
        u2 = float(u2.group(1)) if u2 else None
        status = re.search(r'status: (.+?)(?:\r|$)', raw)
        status = status.group(1).strip() if status else None
        return pd.Series({
            'pir1': pir1, 'pir2': pir2,
            'ultra1_dist': u1, 'ultra2_dist': u2,
            'status': status
        })
    except:
        return pd.Series({
            'pir1': None, 'pir2': None,
            'ultra1_dist': None, 'ultra2_dist': None,
            'status': None
        })

parsed = sensor_df.apply(parse_row, axis=1)
result = pd.concat([
    sensor_df['timestamp'].reset_index(drop=True),
    parsed.reset_index(drop=True)
], axis=1)
print(f"파싱 완료: {len(result)}행")

# ── 4단계: 결측치 및 이상치 제거 ─────────────
print("\n[4단계] 결측치 및 이상치 제거...")

before = len(result)
result = result.dropna(subset=['pir1', 'pir2', 'status'])
result = result[result['ultra1_dist'] >= 1]
result = result[result['ultra2_dist'] >= 1]
after = len(result)
print(f"제거된 행 수: {before - after}")
print(f"남은 행 수: {after}")

# ── 5단계: 시간 특성 추가 ────────────────────
print("\n[5단계] 시간 특성 추가...")

result['timestamp'] = pd.to_datetime(result['timestamp'])
result['hour']        = result['timestamp'].dt.hour
result['minute']      = result['timestamp'].dt.minute
result['day_of_week'] = result['timestamp'].dt.dayofweek
result['day_name']    = result['timestamp'].dt.day_name()
result['date']        = result['timestamp'].dt.date

# ── 6단계: 센서값으로 정답 라벨 생성 ─────────
print("\n[6단계] 센서값 기반 정답 라벨(status_kor) 생성...")

def define_congestion(row):
    pir1 = row['pir1']
    pir2 = row['pir2']
    u1_person = row['ultra1_dist'] < 110
    u2_person = row['ultra2_dist'] < 120

    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡'
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통'
    else:
        return '여유'

result['status_kor'] = result.apply(define_congestion, axis=1)
print(result['status_kor'].value_counts())

# ── 7단계: 시간표 불러오기 (1학기 + 2학기) ───
print("\n[7단계] 시간표 불러오기...")

schedule1 = pd.read_csv('1학기 시간표.csv', encoding='utf-8-sig')
schedule2 = pd.read_csv('2학기 시간표.csv', encoding='utf-8-sig')
schedule = pd.concat([schedule1, schedule2], ignore_index=True)
print(f"1학기: {len(schedule1)}개, 2학기: {len(schedule2)}개, 합계: {len(schedule)}개")

# ── 8단계: 시간표 파싱 ───────────────────────
print("\n[8단계] 시간표 파싱...")

period_to_min = {
    1: 9*60,  2: 10*60, 3: 11*60,
    4: 12*60, 5: 13*60, 6: 14*60,
    7: 15*60, 8: 16*60, 9: 17*60,
    10: 18*60, 11: 19*60, 12: 20*60
}
day_to_num = {'월': 0, '화': 1, '수': 2, '목': 3, '금': 4, '토': 5, '일': 6}

class_list = []
for _, row in schedule.iterrows():
    try:
        day_num   = day_to_num.get(str(row['day']).strip(), -1)
        if day_num == -1:
            continue
        start_min = period_to_min.get(int(row['start_period']), None)
        end_min   = period_to_min.get(int(row['end_period']), None)
        if end_min:
            end_min += 50
        if start_min and end_min:
            class_list.append((day_num, start_min, end_min))
    except:
        continue

print(f"파싱된 수업: {len(class_list)}개")

# ── 9단계: 시간표 기반 파생변수 생성 ─────────
print("\n[9단계] 시간표 기반 파생변수 생성...")
print("(잠깐 걸려요...)")

def get_class_features(day_of_week, hour, minute):
    current_min = hour * 60 + minute
    count_nearby  = 0
    min_to_class  = 999
    count_ongoing = 0
    for day_num, start_min, end_min in class_list:
        if day_num != day_of_week:
            continue
        diff = start_min - current_min
        if 0 <= diff <= 30:
            count_nearby += 1
        if 0 <= diff < min_to_class:
            min_to_class = diff
        if start_min <= current_min <= end_min:
            count_ongoing += 1
    return count_nearby, min_to_class, count_ongoing

result['class_count_nearby'] = result.apply(
    lambda r: get_class_features(int(r['day_of_week']), int(r['hour']), int(r['minute']))[0], axis=1
)
result['min_to_class'] = result.apply(
    lambda r: get_class_features(int(r['day_of_week']), int(r['hour']), int(r['minute']))[1], axis=1
)
result['class_ongoing'] = result.apply(
    lambda r: get_class_features(int(r['day_of_week']), int(r['hour']), int(r['minute']))[2], axis=1
)

print("파생변수 생성 완료!")
print(result[['hour', 'class_count_nearby', 'min_to_class', 'class_ongoing']].describe())

# ── 10단계: 전체 데이터 저장 (sensor_clean.csv) ──
print("\n[10단계] 전체 데이터 저장...")

result.to_csv('sensor_clean.csv', index=False, encoding='utf-8-sig')
print(f"✅ sensor_clean.csv 저장 완료! ({len(result)}행)")

# ── 11단계: AI 학습용 데이터 저장 (model_df.csv) ─
print("\n[11단계] AI 학습용 데이터 저장...")

model_df = result[[
    'hour', 'minute', 'day_of_week',
    'class_count_nearby', 'min_to_class', 'class_ongoing',
    'status_kor'
]]

model_df.to_csv('model_df.csv', index=False, encoding='utf-8-sig')
print(f"✅ model_df.csv 저장 완료! ({len(model_df)}행)")
print()
print("📌 역할 정리")
print("  sensor_clean.csv → 전체 데이터 (센서값 + 시간표 + 라벨)")
print("  model_df.csv     → AI 학습 전용 (시간표 변수 + 라벨만)")

# ── 요약 통계 ─────────────────────────────────
print("\n" + "=" * 55)
print("📊 데이터 요약")
print("=" * 55)
print(f"수집 기간: {result['date'].min()} ~ {result['date'].max()}")
print(f"총 데이터: {len(result)}행")
print(f"\n혼잡도 분포:")
print(result['status_kor'].value_counts())
print(f"\n시간대별 분포:")
print(result['hour'].value_counts().sort_index())