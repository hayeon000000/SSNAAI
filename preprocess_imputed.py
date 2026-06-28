import pandas as pd
import numpy as np
import re

print("=" * 50)
print("SSANAI 데이터 전처리 (결측치 보정 버전)")
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

# ── 4단계: 결측치 표시 + 보정 ────────────────
print("\n[4단계] 결측치 표시 및 보정...")

# PIR 결측치 표시
result['pir1_missing'] = result['pir1'].isna()
result['pir2_missing'] = result['pir2'].isna()

# 초음파 이상값 표시 (-1 또는 1cm 이하)
result['ultra1_missing'] = (result['ultra1_dist'].isna()) | (result['ultra1_dist'] < 1)
result['ultra2_missing'] = (result['ultra2_dist'].isna()) | (result['ultra2_dist'] < 1)

# 보정 전 통계
print(f"PIR1 결측: {result['pir1_missing'].sum()}건")
print(f"PIR2 결측: {result['pir2_missing'].sum()}건")
print(f"ultra1 이상값: {result['ultra1_missing'].sum()}건")
print(f"ultra2 이상값: {result['ultra2_missing'].sum()}건")

# ── PIR 보정: 최빈값(0)으로 채우기 ──────────
result['pir1'] = result['pir1'].fillna(0)
result['pir2'] = result['pir2'].fillna(0)

# ── 초음파 보정: 정상값의 중앙값으로 채우기 ──
ultra1_median = result[~result['ultra1_missing']]['ultra1_dist'].median()
ultra2_median = result[~result['ultra2_missing']]['ultra2_dist'].median()

print(f"\nultra1 보정값 (중앙값): {ultra1_median:.2f}cm")
print(f"ultra2 보정값 (중앙값): {ultra2_median:.2f}cm")

result.loc[result['ultra1_missing'], 'ultra1_dist'] = ultra1_median
result.loc[result['ultra2_missing'], 'ultra2_dist'] = ultra2_median

# ── 보정 여부 통합 컬럼 ──────────────────────
result['imputed'] = (
    result['pir1_missing'] |
    result['pir2_missing'] |
    result['ultra1_missing'] |
    result['ultra2_missing']
)

# status 결측치는 제거 (파싱 실패한 완전 깨진 행)
result = result.dropna(subset=['status'])

print(f"\n보정된 행 수: {result['imputed'].sum()}건")
print(f"총 행 수: {len(result)}행")

# ── 5단계: 시간 특성 추가 ────────────────────
print("\n[5단계] 시간 특성 추가...")

result['timestamp'] = pd.to_datetime(result['timestamp'])
result['hour'] = result['timestamp'].dt.hour
result['minute'] = result['timestamp'].dt.minute
result['day_of_week'] = result['timestamp'].dt.dayofweek
result['day_name'] = result['timestamp'].dt.day_name()
result['date'] = result['timestamp'].dt.date

# ── 6단계: 혼잡도 재정의 ─────────────────────
print("\n[6단계] 혼잡도 재정의...")

def define_congestion(row):
    pir1 = row['pir1']
    pir2 = row['pir2']
    u1 = row['ultra1_dist']
    u2 = row['ultra2_dist']

    u1_person = u1 < 110
    u2_person = u2 < 120

    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡'
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통'
    else:
        return '여유'

result['status_kor'] = result.apply(define_congestion, axis=1)
print(result['status_kor'].value_counts())

# ── 7단계: CSV 저장 ───────────────────────────
print("\n[7단계] 저장...")

result.to_csv('sensor_imputed.csv', index=False, encoding='utf-8-sig')
print(f"✅ sensor_imputed.csv 저장 완료!")
print(f"최종 데이터: {len(result)}행")

# ── 요약 통계 ─────────────────────────────────
print("\n" + "=" * 50)
print("📊 데이터 요약")
print("=" * 50)
print(f"수집 기간: {result['date'].min()} ~ {result['date'].max()}")
print(f"총 데이터: {len(result)}행")
print(f"보정된 데이터: {result['imputed'].sum()}건")

print(f"\n혼잡도 분포:")
print(result['status_kor'].value_counts())

print(f"\n시간대별 분포:")
print(result['hour'].value_counts().sort_index())

pd.set_option('display.max_rows', None)

print(f"\n10분 단위 혼잡 비율 (%):")
result['time_slot'] = (
    result['hour'].astype(str).str.zfill(2) + ':' +
    (result['minute'] // 10 * 10).astype(str).str.zfill(2)
)
pivot_10 = pd.crosstab(result['time_slot'], result['status_kor'], normalize='index') * 100
print(pivot_10.round(1))

print(f"\n요일별 혼잡도 분포 (%):")
day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
day_kor = {
    'Monday': '월요일', 'Tuesday': '화요일', 'Wednesday': '수요일',
    'Thursday': '목요일', 'Friday': '금요일', 'Saturday': '토요일', 'Sunday': '일요일'
}
pivot_day = pd.crosstab(result['day_name'], result['status_kor'], normalize='index') * 100
pivot_day = pivot_day.reindex([d for d in day_order if d in pivot_day.index])
pivot_day.index = [day_kor[d] for d in pivot_day.index]
print(pivot_day.round(1))