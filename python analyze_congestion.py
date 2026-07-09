import pandas as pd
import numpy as np
import re

# ── 데이터 불러오기 ───────────────────────────
df = pd.read_csv(
    'arduino_sensor_data2.csv',
    header=None,
    names=['timestamp', 'raw_data']
)

sensor_df = df[df['raw_data'].str.contains('PIR1:', na=False)].copy()

# ── 파싱 ─────────────────────────────────────
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
        return pd.Series({'pir1': pir1, 'pir2': pir2, 'ultra1_dist': u1, 'ultra2_dist': u2, 'status': status})
    except:
        return pd.Series({'pir1': None, 'pir2': None, 'ultra1_dist': None, 'ultra2_dist': None, 'status': None})

parsed = sensor_df.apply(parse_row, axis=1)
result = pd.concat([sensor_df['timestamp'].reset_index(drop=True), parsed.reset_index(drop=True)], axis=1)

# ── 이상치 제거 ───────────────────────────────
result = result.dropna(subset=['pir1', 'pir2', 'status'])
result = result[result['ultra1_dist'] >= 1]
result = result[result['ultra2_dist'] >= 1]

# ── 시간 특성 추가 ────────────────────────────
result['timestamp']   = pd.to_datetime(result['timestamp'])
result['hour']        = result['timestamp'].dt.hour
result['minute']      = result['timestamp'].dt.minute
result['day_of_week'] = result['timestamp'].dt.dayofweek
result['day_name']    = result['timestamp'].dt.day_name()

# ── 혼잡도 재정의 ─────────────────────────────
def define_congestion(row):
    pir1      = row['pir1']
    pir2      = row['pir2']
    u1_person = row['ultra1_dist'] < 110
    u2_person = row['ultra2_dist'] < 120

    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡'
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통'
    else:
        return '여유'

result['status_kor'] = result.apply(define_congestion, axis=1)

# ── 요일 순서 설정 ────────────────────────────
day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
day_kor   = {
    'Monday': '월요일', 'Tuesday': '화요일', 'Wednesday': '수요일',
    'Thursday': '목요일', 'Friday': '금요일', 'Saturday': '토요일', 'Sunday': '일요일'
}

pd.set_option('display.max_rows', None)

# ── 분석 1: 요일별 혼잡도 분포 ───────────────
print("=" * 55)
print("📊 요일별 혼잡도 분포 (%)")
print("=" * 55)

pivot_day = pd.crosstab(
    result['day_name'],
    result['status_kor'],
    normalize='index'
) * 100

pivot_day = pivot_day.reindex([d for d in day_order if d in pivot_day.index])
pivot_day.index = [day_kor[d] for d in pivot_day.index]

# 컬럼 순서 정리
cols = [c for c in ['여유', '보통', '혼잡'] if c in pivot_day.columns]
pivot_day = pivot_day[cols]

print(pivot_day.round(1))

# ── 분석 2: 요일별 데이터 수 ─────────────────
print("\n" + "=" * 55)
print("📋 요일별 데이터 수")
print("=" * 55)

day_counts = result['day_name'].value_counts()
for day in day_order:
    if day in day_counts.index:
        print(f"{day_kor[day]}: {day_counts[day]}건")

# ── 분석 3: 요일별 혼잡 TOP 시간대 ───────────
print("\n" + "=" * 55)
print("🕐 요일별 혼잡 TOP 3 시간대")
print("=" * 55)

result['time_slot'] = (
    result['hour'].astype(str).str.zfill(2) + ':' +
    (result['minute'] // 10 * 10).astype(str).str.zfill(2)
)

for day in day_order:
    day_data = result[result['day_name'] == day]
    if len(day_data) == 0:
        continue

    pivot = pd.crosstab(
        day_data['time_slot'],
        day_data['status_kor'],
        normalize='index'
    ) * 100

    print(f"\n📅 {day_kor[day]} ({len(day_data)}건)")

    if '혼잡' in pivot.columns:
        top = pivot['혼잡'].sort_values(ascending=False).head(3)
        top = top[top > 0]
        if len(top) > 0:
            for time, pct in top.items():
                print(f"   {time} → 혼잡 {pct:.1f}%")
        else:
            print("   혼잡 없음")
    else:
        print("   혼잡 없음")

# ── 분석 4: 전체 요약 ─────────────────────────
print("\n" + "=" * 55)
print("💡 전체 요약")
print("=" * 55)
print(f"총 데이터 : {len(result)}행")
print(f"\n혼잡도 분포:")
print(result['status_kor'].value_counts())

print("\n가장 혼잡한 요일:")
if '혼잡' in pivot_day.columns:
    most_crowded = pivot_day['혼잡'].idxmax()
    print(f"  → {most_crowded} ({pivot_day['혼잡'].max():.1f}%)")

print("\n가장 한산한 요일:")
if '혼잡' in pivot_day.columns:
    least_crowded = pivot_day['여유'].idxmax()
    print(f"  → {least_crowded} ({pivot_day['여유'].max():.1f}%)")