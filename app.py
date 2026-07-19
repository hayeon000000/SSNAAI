import pickle
import pandas as pd
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
import os
import json
from datetime import datetime

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

app = Flask(__name__)
CORS(app)

with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('model_10min.pkl', 'rb') as f:
    model_10min = pickle.load(f)

def load_schedule():
    schedule1 = pd.read_csv('1학기 시간표.csv', encoding='utf-8-sig')
    schedule2 = pd.read_csv('2학기 시간표.csv', encoding='utf-8-sig')
    schedule  = pd.concat([schedule1, schedule2], ignore_index=True)

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
    return class_list

class_list = load_schedule()
print(f"✅ 시간표 로드 완료: {len(class_list)}개")

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

def shift_time(hour, minute, delta=10):
    total = hour * 60 + minute + delta
    return total // 60, total % 60

def define_congestion_from_sensor(pir1, pir2, ultra1, ultra2):
    u1_person = ultra1 < 110
    u2_person = ultra2 < 120
    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡', 2
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통', 1
    else:
        return '여유', 0

label_name  = {0: '여유', 1: '보통', 2: '혼잡'}
label_emoji = {0: '🟢', 1: '🟡', 2: '🔴'}

def get_gemini_message(current_kor, predicted_kor, class_count, min_to_class):
    try:
        prompt = f"""
당신은 성신여대 엘리베이터 혼잡도 안내 시스템입니다.
다음 정보를 바탕으로 학생들에게 친절하고 간결한 안내 멘트를 한국어로 작성해주세요.
이모지를 적절히 사용하고 2~3문장으로 작성해주세요.

현재 혼잡도: {current_kor}
10분 후 예측 혼잡도: {predicted_kor}
30분 내 시작하는 수업 수: {class_count}개
가장 가까운 수업 시작까지: {min_to_class if min_to_class < 999 else '없음'}분
"""
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        return f"현재 엘리베이터 혼잡도는 {current_kor}입니다."

def korean_jsonify(data):
    return Response(
        json.dumps(data, ensure_ascii=False),
        content_type='application/json; charset=utf-8'
    )

@app.route('/api/predict', methods=['GET'])
def predict():
    now = datetime.now()
    h, m, d = now.hour, now.minute, now.weekday()

    nearby, to_class, ongoing = get_class_features(d, h, m)
    h10, m10 = shift_time(h, m)
    nearby10, to_class10, ongoing10 = get_class_features(d, h10, m10)

    row = pd.DataFrame([{
        'hour': h, 'minute': m, 'day_of_week': d,
        'class_count_nearby': nearby,
        'min_to_class': to_class,
        'class_ongoing': ongoing
    }])

    row10 = pd.DataFrame([{
        'hour_10': h10, 'min_10': m10, 'day_of_week': d,
        'class_count_nearby_10': nearby10,
        'min_to_class_10': to_class10,
        'class_ongoing_10': ongoing10
    }])

    now_pred    = int(model.predict(row)[0])
    future_pred = int(model_10min.predict(row10)[0])
    now_kor     = label_name[now_pred]
    future_kor  = label_name[future_pred]
    message     = get_gemini_message(now_kor, future_kor, nearby, to_class)

    return korean_jsonify({
        'current': {
            'level': now_pred,
            'label': now_kor,
            'emoji': label_emoji[now_pred]
        },
        'predicted_10min': {
            'level': future_pred,
            'label': future_kor,
            'emoji': label_emoji[future_pred]
        },
        'class_info': {
            'count_nearby': nearby,
            'min_to_class': to_class if to_class < 999 else None,
            'ongoing': ongoing
        },
        'message': message,
        'timestamp': now.strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/sensor', methods=['POST'])
def sensor():
    data   = request.get_json()
    pir1   = data.get('pir1', 0)
    pir2   = data.get('pir2', 0)
    ultra1 = data.get('ultra1_dist', 141)
    ultra2 = data.get('ultra2_dist', 153)

    status_kor, level = define_congestion_from_sensor(pir1, pir2, ultra1, ultra2)

    return korean_jsonify({
        'level': level,
        'label': status_kor,
        'emoji': label_emoji[level],
        'sensor': {
            'pir1': pir1, 'pir2': pir2,
            'ultra1_dist': ultra1, 'ultra2_dist': ultra2
        },
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/congestion', methods=['POST'])
def congestion():
    data   = request.get_json() or {}
    pir1   = data.get('pir1', 0)
    pir2   = data.get('pir2', 0)
    ultra1 = data.get('ultra1_dist', 141)
    ultra2 = data.get('ultra2_dist', 153)

    now = datetime.now()
    h, m, d = now.hour, now.minute, now.weekday()
    nearby, to_class, ongoing = get_class_features(d, h, m)
    h10, m10 = shift_time(h, m)
    nearby10, to_class10, ongoing10 = get_class_features(d, h10, m10)

    row = pd.DataFrame([{
        'hour': h, 'minute': m, 'day_of_week': d,
        'class_count_nearby': nearby,
        'min_to_class': to_class,
        'class_ongoing': ongoing
    }])

    row10 = pd.DataFrame([{
        'hour_10': h10, 'min_10': m10, 'day_of_week': d,
        'class_count_nearby_10': nearby10,
        'min_to_class_10': to_class10,
        'class_ongoing_10': ongoing10
    }])

    sensor_kor, sensor_level = define_congestion_from_sensor(pir1, pir2, ultra1, ultra2)
    ai_pred     = int(model.predict(row)[0])
    future_pred = int(model_10min.predict(row10)[0])
    message     = get_gemini_message(sensor_kor, label_name[future_pred], nearby, to_class)

    return korean_jsonify({
        'realtime': {
            'level': sensor_level,
            'label': sensor_kor,
            'emoji': label_emoji[sensor_level]
        },
        'ai_current': {
            'level': ai_pred,
            'label': label_name[ai_pred],
            'emoji': label_emoji[ai_pred]
        },
        'predicted_10min': {
            'level': future_pred,
            'label': label_name[future_pred],
            'emoji': label_emoji[future_pred]
        },
        'class_info': {
            'count_nearby': nearby,
            'min_to_class': to_class if to_class < 999 else None,
            'ongoing': ongoing
        },
        'message': message,
        'timestamp': now.strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/health', methods=['GET'])
def health():
    return korean_jsonify({'status': 'ok', 'message': 'SSANAI API 정상 작동 중'})

if __name__ == '__main__':
    print("✅ SSANAI Flask 서버 시작!")
    print("📌 API 목록")
    print("  GET  /api/predict    → AI 예측 (시간표 기반)")
    print("  POST /api/sensor     → 실시간 센서 판별")
    print("  POST /api/congestion → 통합 API")
    print("  GET  /api/health     → 헬스체크")
    app.run(debug=True, port=5001)