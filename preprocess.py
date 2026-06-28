import pandas as pd
import numpy as np
import re

print("=" * 50)
print("SSANAI 데이터 전처리 시작!")
print("=" * 50)

# ── 1단계: 데이터 불러오기 ────────────────────
print("\n[1단계] 데이터 불러오기...")

df = pd.read_csv(
    'arduino_sensor_data2.csv',
    header=None,
    names=['timestamp', 'raw_data']
)

print(f"전체 행 수: {len(df)}")

# ── 2단계: 센서 데이터만 필터링 ───────────────
print("\n[2단계] 센서 데이터 필터링...")

sensor_df = df[df['raw_data'].str.contains('PIR1:', na=False)].copy()
print(f"센서 데이터 행 수: {len(sensor_df)}")

# ── 3단계: 데이터 파싱 ────────────────────────
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

        u1_detect = re.search(r'ultra1: (\w+)', raw)
        u1_detect = u1_detect.group(1) if u1_detect else None

        u2_detect = re.search(r'ultra2: (\w+)', raw)
        u2_detect = u2_detect.group(1) if u2_detect else None

        status = re.search(r'status: (.+?)(?:\r|$)', raw)
        status = status.group(1).strip() if status else None

        return pd.Series({
            'pir1': pir1,
            'pir2': pir2,
            'ultra1_dist': u1,
            'ultra2_dist': u2,
            'ultra1_detect': u1_detect,
            'ultra2_detect': u2_detect,
            'status': status
        })
    except:
        return pd.Series({
            'pir1': None, 'pir2': None,
            'ultra1_dist': None, 'ultra2_dist': None,
            'ultra1_detect': None, 'ultra2_detect': None,
            'status': None
        })

parsed = sensor_df.apply(parse_row, axis=1)
result = pd.concat([sensor_df['timestamp'].reset_index(drop=True),
                    parsed.reset_index(drop=True)], axis=1)

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
result['hour'] = result['timestamp'].dt.hour
result['minute'] = result['timestamp'].dt.minute
result['day_of_week'] = result['timestamp'].dt.dayofweek
result['day_name'] = result['timestamp'].dt.day_name()
result['date'] = result['timestamp'].dt.date

# ── 6단계: 센서값 기반 혼잡도 재정의 ─────────
print("\n[6단계] 혼잡도 재정의...")

def define_congestion(row):
    pir1 = row['pir1']
    pir2 = row['pir2']
    u1 = row['ultra1_dist']
    u2 = row['ultra2_dist']

    # 평균값(141cm, 153cm)보다 30cm 이상 가까우면 사람 있음
    u1_person = u1 < 110  # ultra1 110cm 이하
    u2_person = u2 < 120  # ultra2 120cm 이하

    # 혼잡 → PIR1+PIR2 둘 다 감지 또는 초음파 둘 다 가까움
    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡'
    # 보통 → PIR1 감지 또는 초음파 하나 가까움
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통'
    # 여유 → 아무것도 없음
    else:
        return '여유'

result['status_kor'] = result.apply(define_congestion, axis=1)
print(result['status_kor'].value_counts())

# ── 7단계: CSV 저장 ───────────────────────────
print("\n[7단계] 저장...")

result.to_csv('sensor_clean.csv', index=False, encoding='utf-8-sig')
print(f"✅ sensor_clean.csv 저장 완료!")
print(f"최종 데이터: {len(result)}행")

# ── 요약 통계 ─────────────────────────────────
print("\n" + "=" * 50)
print("📊 데이터 요약")
print("=" * 50)
print(f"수집 기간: {result['date'].min()} ~ {result['date'].max()}")
print(f"총 데이터: {len(result)}행")

print(f"\n혼잡도 분포:")
print(result['status_kor'].value_counts())

print(f"\nPIR1 분포:")
print(result['pir1'].value_counts())

print(f"\nPIR2 분포:")
print(result['pir2'].value_counts())

print(f"\nultra1 거리 통계:")
print(result['ultra1_dist'].describe())

print(f"\nultra2 거리 통계:")
print(result['ultra2_dist'].describe())

# ── 시간대별 분석 ─────────────────────────────
print("\n" + "=" * 50)
print("📊 시간대별 혼잡도 분석")
print("=" * 50)

pd.set_option('display.max_rows', None)

print("\n시간대별 혼잡도 분포:")
pivot = pd.crosstab(result['hour'], result['status_kor'])
print(pivot)

print("\n시간대별 혼잡 비율 (%):")
pivot_pct = pd.crosstab(result['hour'], result['status_kor'], normalize='index') * 100
print(pivot_pct.round(1))

print("\n10분 단위 혼잡 비율 (%):")
result['time_slot'] = (
    result['hour'].astype(str).str.zfill(2) + ':' +
    (result['minute'] // 10 * 10).astype(str).str.zfill(2)
)
pivot_10 = pd.crosstab(result['time_slot'], result['status_kor'], normalize='index') * 100
print(pivot_10.round(1))

print("\n요일별 혼잡도 분포 (%):")
day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
day_kor = {
    'Monday': '월요일', 'Tuesday': '화요일', 'Wednesday': '수요일',
    'Thursday': '목요일', 'Friday': '금요일', 'Saturday': '토요일', 'Sunday': '일요일'
}
pivot_day = pd.crosstab(result['day_name'], result['status_kor'], normalize='index') * 100
pivot_day = pivot_day.reindex([d for d in day_order if d in pivot_day.index])
pivot_day.index = [day_kor[d] for d in pivot_day.index]
print(pivot_day.round(1))