from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)  # React 개발서버(localhost:3000) 허용

DB_PATH = os.environ.get('DB_PATH', 'ssnaai.db')


# ─────────────────────────────────────────
# DB 헬퍼
# ─────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # dict처럼 컬럼명으로 접근 가능
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def calc_congestion_level(person_count: int, queue_length_m: float) -> str:
    """센서 수치 → 혼잡도 레벨 변환"""
    if person_count <= 3 and queue_length_m <= 1.0:
        return 'low'
    elif person_count <= 8 and queue_length_m <= 3.0:
        return 'medium'
    return 'high'


# ─────────────────────────────────────────
# /api/sensors  — 센서 관리
# ─────────────────────────────────────────

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    """전체 센서 목록 반환 (building/floor 쿼리 필터 가능)"""
    building = request.args.get('building')
    floor    = request.args.get('floor', type=int)

    db    = get_db()
    query = 'SELECT * FROM SENSORS WHERE 1=1'
    params = []

    if building:
        query  += ' AND building = ?'
        params.append(building)
    if floor is not None:
        query  += ' AND floor = ?'
        params.append(floor)

    rows = db.execute(query + ' ORDER BY floor', params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/sensors/<int:sensor_id>', methods=['GET'])
def get_sensor(sensor_id):
    """특정 센서 상세 + 최신 혼잡도 포함"""
    db = get_db()
    sensor = db.execute(
        'SELECT * FROM SENSORS WHERE sensor_id = ?', (sensor_id,)
    ).fetchone()

    if sensor is None:
        return jsonify({'error': 'Sensor not found'}), 404

    latest_log = db.execute(
        'SELECT * FROM CONGESTION_LOGS WHERE sensor_id = ? ORDER BY recorded_at DESC LIMIT 1',
        (sensor_id,)
    ).fetchone()

    result = dict(sensor)
    result['latest'] = dict(latest_log) if latest_log else None
    return jsonify(result)


@app.route('/api/sensors/data', methods=['POST'])
def receive_sensor_data():
    """
    아두이노/RPi → Flask 데이터 수신 엔드포인트.

    Body (JSON):
        sensor_id      : int
        person_count   : int
        queue_length_m : float
        weather        : str  (optional)
        temperature    : float (optional)
    """
    data = request.get_json()
    if not data or 'sensor_id' not in data:
        return jsonify({'error': 'sensor_id is required'}), 400

    person_count   = data.get('person_count', 0)
    queue_length_m = data.get('queue_length_m', 0.0)
    level          = calc_congestion_level(person_count, queue_length_m)

    db = get_db()
    db.execute(
        '''INSERT INTO CONGESTION_LOGS
           (sensor_id, recorded_at, person_count, queue_length_m,
            congestion_level, weather, temperature)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            data['sensor_id'],
            datetime.utcnow().isoformat(timespec='seconds'),
            person_count,
            queue_length_m,
            level,
            data.get('weather', 'unknown'),
            data.get('temperature'),
        )
    )
    db.commit()

    # 혼잡 시 자동 알림 트리거 (향후 push notification 연동 지점)
    alert = None
    if level == 'high':
        alert = '지금 계단이 빨라요. 엘리베이터 대기 인원이 많습니다.'

    return jsonify({'status': 'ok', 'congestion_level': level, 'alert': alert}), 201


# ─────────────────────────────────────────
# /api/congestion  — 혼잡도 조회
# ─────────────────────────────────────────

@app.route('/api/congestion/current', methods=['GET'])
def get_current_congestion():
    """센서별 최신 혼잡도 (홈 화면 지도용)"""
    db   = get_db()
    rows = db.execute('''
        SELECT cl.*, s.building, s.floor, s.location_desc
        FROM   CONGESTION_LOGS cl
        JOIN   SENSORS s ON cl.sensor_id = s.sensor_id
        WHERE  cl.log_id IN (
            SELECT MAX(log_id)
            FROM   CONGESTION_LOGS
            GROUP  BY sensor_id
        )
        ORDER  BY s.floor
    ''').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/congestion/floor/<int:floor>', methods=['GET'])
def get_congestion_by_floor(floor):
    """특정 층 최근 혼잡도 10건 (엘리베이터 상세 화면용)"""
    db   = get_db()
    rows = db.execute('''
        SELECT cl.*, s.location_desc
        FROM   CONGESTION_LOGS cl
        JOIN   SENSORS s ON cl.sensor_id = s.sensor_id
        WHERE  s.floor = ?
        ORDER  BY cl.recorded_at DESC
        LIMIT  10
    ''', (floor,)).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/congestion/history', methods=['GET'])
def get_congestion_history():
    """
    혼잡도 히스토리 (AI 학습 데이터 내보내기 / 관리자 대시보드용).

    Query params:
        sensor_id : int (optional)
        limit     : int (default 100)
    """
    sensor_id = request.args.get('sensor_id', type=int)
    limit     = request.args.get('limit', default=100, type=int)

    db    = get_db()
    query = 'SELECT * FROM CONGESTION_LOGS'
    params = []

    if sensor_id:
        query += ' WHERE sensor_id = ?'
        params.append(sensor_id)

    query += ' ORDER BY recorded_at DESC LIMIT ?'
    params.append(limit)

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────
# /api/predictions  — AI 예측
# ─────────────────────────────────────────

@app.route('/api/predictions/current', methods=['GET'])
def get_current_predictions():
    """각 센서의 가장 최신 예측값 (알림 화면용)"""
    db   = get_db()
    rows = db.execute('''
        SELECT p.*, s.building, s.floor, s.location_desc
        FROM   PREDICTIONS p
        JOIN   SENSORS s ON p.sensor_id = s.sensor_id
        WHERE  p.prediction_id IN (
            SELECT MAX(prediction_id)
            FROM   PREDICTIONS
            GROUP  BY sensor_id
        )
        ORDER  BY s.floor
    ''').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/predictions/<int:sensor_id>', methods=['GET'])
def get_predictions_by_sensor(sensor_id):
    """특정 센서의 예측 이력 (정확도 분석용)"""
    db   = get_db()
    rows = db.execute(
        'SELECT * FROM PREDICTIONS WHERE sensor_id = ? ORDER BY predicted_at DESC LIMIT 20',
        (sensor_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/predictions/run', methods=['POST'])
def run_prediction():
    """
    AI 예측 실행 (스케줄러 or 관리자 수동 호출용).
    
    현재: 이동평균 기반 Mock 예측.
    추후: Random Forest / LSTM 모델로 교체.
    """
    db      = get_db()
    sensors = db.execute('SELECT * FROM SENSORS WHERE status = "active"').fetchall()

    target_time = (datetime.utcnow() + timedelta(minutes=30)).isoformat(timespec='seconds')
    results = []

    for sensor in sensors:
        # 최근 6개(30분치) 로그의 평균 인원 수로 예측
        recent = db.execute('''
            SELECT AVG(person_count) AS avg_count
            FROM   CONGESTION_LOGS
            WHERE  sensor_id = ?
            ORDER  BY recorded_at DESC
            LIMIT  6
        ''', (sensor['sensor_id'],)).fetchone()

        avg   = recent['avg_count'] or 0
        level = calc_congestion_level(int(avg), 0.0)

        # 다음 수업 시작 30분 전이면 신뢰도 상향
        upcoming = db.execute('''
            SELECT COUNT(*) AS cnt
            FROM   CLASS_SCHEDULE
            WHERE  floor = ? AND day_of_week = ?
              AND  start_time BETWEEN ? AND ?
        ''', (
            sensor['floor'],
            datetime.now().weekday(),
            datetime.now().strftime('%H:%M'),
            (datetime.now() + timedelta(minutes=30)).strftime('%H:%M'),
        )).fetchone()

        confidence = 0.80 if upcoming['cnt'] > 0 else 0.65

        db.execute('''
            INSERT INTO PREDICTIONS
                (sensor_id, predicted_at, target_time, predicted_level, confidence, model_version)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            sensor['sensor_id'],
            datetime.utcnow().isoformat(timespec='seconds'),
            target_time,
            level,
            confidence,
            'moving_avg_v1',
        ))
        results.append({
            'sensor_id'       : sensor['sensor_id'],
            'predicted_level' : level,
            'confidence'      : confidence,
        })

    db.commit()
    return jsonify({'status': 'ok', 'target_time': target_time, 'results': results}), 201


# ─────────────────────────────────────────
# /api/schedule  — 수업 시간표
# ─────────────────────────────────────────

@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    """
    전체 시간표 조회.
    
    Query params:
        day : int  0=월 ~ 4=금 (optional)
    """
    day = request.args.get('day', type=int)
    db  = get_db()

    if day is not None:
        rows = db.execute(
            'SELECT * FROM CLASS_SCHEDULE WHERE day_of_week = ? ORDER BY start_time',
            (day,)
        ).fetchall()
    else:
        rows = db.execute(
            'SELECT * FROM CLASS_SCHEDULE ORDER BY day_of_week, start_time'
        ).fetchall()

    return jsonify([dict(r) for r in rows])


@app.route('/api/schedule/upcoming', methods=['GET'])
def get_upcoming_classes():
    """
    지금부터 60분 내 시작하는 수업 (혼잡도 예측 보조 데이터).
    수업 종료 시점 엘리베이터 혼잡 예측에 사용됨.
    """
    now          = datetime.now()
    day_of_week  = now.weekday()                              # 0=월 ~ 4=금
    current_time = now.strftime('%H:%M')
    upcoming_time = (now + timedelta(hours=1)).strftime('%H:%M')

    db   = get_db()
    rows = db.execute('''
        SELECT * FROM CLASS_SCHEDULE
        WHERE  day_of_week = ?
          AND  start_time BETWEEN ? AND ?
        ORDER  BY start_time, enrollment_count DESC
    ''', (day_of_week, current_time, upcoming_time)).fetchall()

    return jsonify([dict(r) for r in rows])


@app.route('/api/schedule/floor/<int:floor>', methods=['GET'])
def get_schedule_by_floor(floor):
    """특정 층 수업 시간표 (층별 혼잡 패턴 파악용)"""
    db   = get_db()
    rows = db.execute(
        'SELECT * FROM CLASS_SCHEDULE WHERE floor = ? ORDER BY day_of_week, start_time',
        (floor,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────
# 에러 핸들러
# ─────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)