import random
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pickle


def get_level(hour, minute, class_times, weather, day):
    if day >= 5:
        return 0

    for class_hour in class_times:
        prev = class_hour - 1

        # 수업 시작 전 0~20분 -> 여유
        if hour == prev and 0 <= minute < 20:
            return 0

        # 수업 시작 전 20~40분 -> 보통
        elif hour == prev and 20 <= minute < 40:
            if weather == 2 and random.random() < 0.5:
                return 3
            return 2

        # 수업 시작 전 40분 ~ 정시 -> 혼잡
        elif hour == prev and minute >= 40:
            return 3

        # 수업 시작 직후 -> 여유
        elif hour == class_hour and 1 <= minute <= 59:
            return 0

    return 0


def generate_data(n=10000):
    data = []
    class_times = [9, 12, 15]

    for _ in range(n):
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        day = random.randint(0, 6)       # 0=월 ~ 6=일
        weather = random.randint(0, 2)   # 0=맑음 1=흐림 2=비

        level = get_level(hour, minute, class_times, weather, day)

        # 약간의 노이즈 추가 (현실감)
        if random.random() < 0.05:
            level = random.randint(0, 3)

        data.append({
            "hour": hour,
            "minute": minute,
            "day": day,
            "weather": weather,
            "level": level
        })

    return pd.DataFrame(data)


print("📊 데이터 생성 중...")
df = generate_data(10000)
print(f"✅ 데이터 {len(df)}건 생성 완료!")
print(df["level"].value_counts())

X = df[["hour", "minute", "day", "weather"]]
y = df["level"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("\n🤖 Random Forest 학습 중...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"✅ 학습 완료! 정확도: {acc * 100:.1f}%")

with open("model.pkl", "wb") as f:
    pickle.dump(model, f)
print("✅ 모델 저장 완료! (model.pkl)")

print("\n🔍 예측 테스트")
print("-" * 40)

test_cases = [
    {"hour": 8,  "minute": 10, "day": 0, "weather": 0, "desc": "월요일 8:10 맑음 → 여유 예상"},
    {"hour": 8,  "minute": 30, "day": 1, "weather": 0, "desc": "화요일 8:30 맑음 → 보통 예상"},
    {"hour": 8,  "minute": 45, "day": 2, "weather": 0, "desc": "수요일 8:45 맑음 → 혼잡 예상"},
    {"hour": 8,  "minute": 30, "day": 3, "weather": 2, "desc": "목요일 8:30 비   → 혼잡 예상"},
    {"hour": 11, "minute": 0,  "day": 4, "weather": 0, "desc": "금요일 11:00 맑음 → 여유 예상"},
    {"hour": 8,  "minute": 45, "day": 5, "weather": 0, "desc": "토요일 8:45 맑음 → 여유 예상"},
]

labels = ["🟢 여유", "🟡 줄 서기 시작", "🟠 보통", "🔴 혼잡"]

for tc in test_cases:
    pred = model.predict(pd.DataFrame([{
        "hour": tc["hour"],
        "minute": tc["minute"],
        "day": tc["day"],
        "weather": tc["weather"]
    }]))[0]
    print(f"{tc['desc']} → {labels[pred]}")