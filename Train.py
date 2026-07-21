import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

print("=" * 55)
print("SSANAI AI 모델 학습 — 시간표 기반 예측 모델")
print("=" * 55)
print()
print("📌 역할 분리")
print("  실시간 감지 → 센서값으로 현재 혼잡도 판단")
print("  AI 예측    → 시간표로 미래 혼잡도 예측")
print()

# ── 1단계: AI 학습용 데이터 불러오기 ─────────
print("[1단계] AI 학습용 데이터 불러오기...")

df = pd.read_csv('model_df.csv', encoding='utf-8-sig')
print(f"데이터: {len(df)}행")
print(df['status_kor'].value_counts())

# ── 2단계: 10분 후 시간 파생변수 생성 ─────────
print("\n[2단계] 10분 후 파생변수 생성...")

def shift_time(hour, minute, delta=10):
    total = hour * 60 + minute + delta
    return total // 60, total % 60

# 단순히 hour, minute을 10분 뒤로 이동
df['hour_10'] = df.apply(lambda r: shift_time(int(r['hour']), int(r['minute']))[0], axis=1)
df['min_10']  = df.apply(lambda r: shift_time(int(r['hour']), int(r['minute']))[1], axis=1)

# 10분 후 시간표 파생변수는 시간표 파일 없이 현재 값으로 근사
# (preprocess에서 이미 계산된 값을 10분 후 기준으로 shift)
df['class_count_nearby_10'] = df['class_count_nearby']  # 근사값
df['min_to_class_10']       = (df['min_to_class'] - 10).clip(lower=0)
df['class_ongoing_10']      = df['class_ongoing']

print("완료!")

# ── 3단계: 레이블 인코딩 ─────────────────────
label_map = {'여유': 0, '보통': 1, '혼잡': 2}
df['label'] = df['status_kor'].map(label_map)

# ── 4단계: 현재 혼잡도 예측 모델 학습 ─────────
print("\n[4단계] 현재 혼잡도 예측 모델 학습...")
print("  ⭐ 입력: 시간, 요일, 시간표 파생변수만 사용")

features = [
    'hour', 'minute', 'day_of_week',
    'class_count_nearby', 'min_to_class', 'class_ongoing'
]

X = df[features].fillna(0)
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    class_weight='balanced',
    random_state=42
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"✅ 현재 혼잡도 정확도: {acc * 100:.1f}%")
print("\n분류 리포트:")
print(classification_report(y_test, y_pred, target_names=['여유', '보통', '혼잡']))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("✅ model.pkl 저장 완료!")

# ── 5단계: 10분 후 혼잡도 예측 모델 학습 ──────
print("\n[5단계] 10분 후 혼잡도 예측 모델 학습...")

features_10 = [
    'hour_10', 'min_10', 'day_of_week',
    'class_count_nearby_10', 'min_to_class_10', 'class_ongoing_10'
]

X_10 = df[features_10].fillna(0)
y_10 = df['label']

X_train_10, X_test_10, y_train_10, y_test_10 = train_test_split(
    X_10, y_10, test_size=0.2, random_state=42, stratify=y_10
)

model_10 = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    class_weight='balanced',
    random_state=42
)
model_10.fit(X_train_10, y_train_10)

y_pred_10 = model_10.predict(X_test_10)
acc_10 = accuracy_score(y_test_10, y_pred_10)
print(f"✅ 10분 후 혼잡도 정확도: {acc_10 * 100:.1f}%")
print("\n분류 리포트 (10분 후):")
print(classification_report(y_test_10, y_pred_10, target_names=['여유', '보통', '혼잡']))

with open('model_10min.pkl', 'wb') as f:
    pickle.dump(model_10, f)
print("✅ model_10min.pkl 저장 완료!")

# ── 6단계: 변수 중요도 ────────────────────────
print("\n[6단계] 변수 중요도 (현재 혼잡도 모델)")
importance = pd.Series(model.feature_importances_, index=features)
print(importance.sort_values(ascending=False).round(3))

# ── 7단계: 예측 테스트 ────────────────────────
print("\n[7단계] 예측 테스트")
print("-" * 55)

label_name = {0: '🟢 여유', 1: '🟡 보통', 2: '🔴 혼잡'}

test_cases = [
    {'hour': 8,  'minute': 50, 'day_of_week': 0, 'desc': '월요일 8:50 (수업 10분 전)'},
    {'hour': 9,  'minute': 10, 'day_of_week': 1, 'desc': '화요일 9:10 (수업 중)'},
    {'hour': 14, 'minute': 30, 'day_of_week': 2, 'desc': '수요일 14:30 (오후)'},
    {'hour': 19, 'minute': 30, 'day_of_week': 4, 'desc': '금요일 19:30 (야간)'},
]

# 테스트용 시간표 파생변수 직접 계산
def get_features_for_test(day, hour, minute, df_ref):
    # 같은 요일/시간대 데이터에서 평균값으로 근사
    mask = (df_ref['day_of_week'] == day) & (df_ref['hour'] == hour)
    subset = df_ref[mask]
    if len(subset) == 0:
        return 0, 999, 0
    return (
        int(subset['class_count_nearby'].mean()),
        int(subset['min_to_class'].mean()),
        int(subset['class_ongoing'].mean())
    )

for tc in test_cases:
    h, m, d = tc['hour'], tc['minute'], tc['day_of_week']
    nearby, to_class, ongoing = get_features_for_test(d, h, m, df)
    h10, m10 = shift_time(h, m)

    row = pd.DataFrame([{
        'hour': h, 'minute': m, 'day_of_week': d,
        'class_count_nearby': nearby,
        'min_to_class': to_class,
        'class_ongoing': ongoing
    }])

    row10 = pd.DataFrame([{
        'hour_10': h10, 'min_10': m10, 'day_of_week': d,
        'class_count_nearby_10': nearby,
        'min_to_class_10': max(0, to_class - 10),
        'class_ongoing_10': ongoing
    }])

    now_pred   = label_name[model.predict(row)[0]]
    later_pred = label_name[model_10.predict(row10)[0]]

    print(f"{tc['desc']}")
    print(f"  현재 예측: {now_pred}  |  10분 후 예측: {later_pred}")
    print(f"  수업밀집도: {nearby}개 | 수업까지: {to_class}분 | 진행중: {ongoing}개")
    print()

print("=" * 55)
print("✅ 학습 완료!")
print(f"  현재 혼잡도 정확도: {acc * 100:.1f}%")
print(f"  10분 후 정확도:     {acc_10 * 100:.1f}%")
print()
print("📌 최종 역할 정리")
print("  model.pkl       → 시간표 기반 현재 혼잡도 예측")
print("  model_10min.pkl → 시간표 기반 10분 후 혼잡도 예측")
print("  센서 실시간 판별 → define_congestion() 함수 사용")
print("=" * 55)