"""
SSNAAI — RPi 브리지 스크립트 (bridge.py)

역할: Arduino Serial JSON → Flask HTTP POST 변환 중계

설치:
    pip install pyserial requests

실행:
    python bridge.py

백그라운드 자동 실행 (재부팅 후에도 유지):
    sudo nano /etc/systemd/system/ssnaai-bridge.service
    → 하단 systemd 설정 참고
"""

import json
import logging
import time

import requests
import serial

# ── 설정 ──────────────────────────────────────────────────
FLASK_URL   = "http://localhost:5000/api/sensors/data"  # 배포 후 실제 URL로 변경
SERIAL_PORT = "/dev/ttyACM0"   # ls /dev/tty* 로 확인 (USB면 ttyACM0, GPIO면 ttyS0)
BAUD_RATE   = 9600
RETRY_DELAY = 10               # 시리얼 연결 실패 시 재시도 대기(초)
HTTP_TIMEOUT = 5               # HTTP 요청 타임아웃(초)
HTTP_RETRIES = 3               # HTTP 전송 재시도 횟수

# ── 로깅 ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── 날씨 정보 (선택) ──────────────────────────────────────
def get_weather() -> str:
    """
    날씨 정보 반환.
    OpenWeatherMap API 연동 가능. 현재는 'unknown' 반환.

    연동 예:
        import requests
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": "Seoul", "appid": "YOUR_API_KEY"}
        )
        return r.json()["weather"][0]["main"].lower()  # "rain", "clear" 등
    """
    return "unknown"


# ── HTTP 전송 ─────────────────────────────────────────────
def post_to_flask(payload: dict) -> bool:
    """Flask POST /api/sensors/data 호출. 실패 시 최대 3회 재시도."""
    for attempt in range(1, HTTP_RETRIES + 1):
        try:
            resp = requests.post(FLASK_URL, json=payload, timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                f"전송 성공 | 혼잡도={result.get('congestion_level')} "
                f"| 알림={result.get('alert')}"
            )
            return True

        except requests.exceptions.ConnectionError:
            logger.warning(f"Flask 연결 실패 (시도 {attempt}/{HTTP_RETRIES}) — "
                           f"Flask 서버가 실행 중인지 확인하세요.")
        except requests.exceptions.Timeout:
            logger.warning(f"Flask 응답 타임아웃 (시도 {attempt}/{HTTP_RETRIES})")
        except requests.exceptions.HTTPError as e:
            logger.error(f"Flask HTTP 오류: {e}")
            return False  # 4xx/5xx는 재시도 의미 없음

        if attempt < HTTP_RETRIES:
            time.sleep(2)

    logger.error("Flask 전송 최종 실패 — 데이터 버려짐")
    return False


# ── 데이터 검증 ───────────────────────────────────────────
def validate_payload(data: dict) -> bool:
    """Arduino에서 온 JSON이 최소 필드를 갖추었는지 확인."""
    required = {"sensor_id", "person_count", "queue_length_m"}
    if not required.issubset(data.keys()):
        logger.warning(f"필수 필드 누락: {required - data.keys()}")
        return False
    if not isinstance(data["person_count"], (int, float)):
        return False
    return True


# ── 메인 루프 ─────────────────────────────────────────────
def main():
    logger.info(f"브리지 시작 | 포트={SERIAL_PORT} | Flask={FLASK_URL}")

    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=10) as ser:
                logger.info("시리얼 연결 성공. 데이터 대기 중...")

                while True:
                    raw = ser.readline()

                    # 빈 라인 (타임아웃) 스킵
                    if not raw:
                        continue

                    line = raw.decode("utf-8", errors="ignore").strip()

                    # 상태 메시지 로깅 (warming_up, ready 등)
                    if '"status"' in line:
                        logger.info(f"Arduino 상태: {line}")
                        continue

                    # JSON 파싱
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning(f"JSON 파싱 실패: {repr(line)}")
                        continue

                    # 검증
                    if not validate_payload(data):
                        continue

                    # 날씨 정보 추가
                    data["weather"] = get_weather()

                    logger.info(
                        f"수신 | 인원={data['person_count']}명 "
                        f"| 줄길이={data['queue_length_m']}m"
                    )

                    # Flask로 전송
                    post_to_flask(data)

        except serial.SerialException as e:
            logger.error(f"시리얼 오류: {e}. {RETRY_DELAY}초 후 재시도...")
            time.sleep(RETRY_DELAY)

        except KeyboardInterrupt:
            logger.info("브리지 종료")
            break


if __name__ == "__main__":
    main()

"""
SSNAAI — RPi 브리지 스크립트 (bridge.py)

역할: Arduino Serial JSON → Flask HTTP POST 변환 중계

설치:
    pip install pyserial requests

실행:
    python bridge.py

백그라운드 자동 실행 (재부팅 후에도 유지):
    sudo nano /etc/systemd/system/ssnaai-bridge.service
    → 하단 systemd 설정 참고
"""

import json
import logging
import time

import requests
import serial

# ── 설정 ──────────────────────────────────────────────────
FLASK_URL   = "http://localhost:5000/api/sensors/data"  # 배포 후 실제 URL로 변경
SERIAL_PORT = "/dev/ttyACM0"   # ls /dev/tty* 로 확인 (USB면 ttyACM0, GPIO면 ttyS0)
BAUD_RATE   = 9600
RETRY_DELAY = 10               # 시리얼 연결 실패 시 재시도 대기(초)
HTTP_TIMEOUT = 5               # HTTP 요청 타임아웃(초)
HTTP_RETRIES = 3               # HTTP 전송 재시도 횟수

# ── 로깅 ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── 날씨 정보 (선택) ──────────────────────────────────────
def get_weather() -> str:
    """
    날씨 정보 반환.
    OpenWeatherMap API 연동 가능. 현재는 'unknown' 반환.

    연동 예:
        import requests
        r = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": "Seoul", "appid": "YOUR_API_KEY"}
        )
        return r.json()["weather"][0]["main"].lower()  # "rain", "clear" 등
    """
    return "unknown"


# ── HTTP 전송 ─────────────────────────────────────────────
def post_to_flask(payload: dict) -> bool:
    """Flask POST /api/sensors/data 호출. 실패 시 최대 3회 재시도."""
    for attempt in range(1, HTTP_RETRIES + 1):
        try:
            resp = requests.post(FLASK_URL, json=payload, timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                f"전송 성공 | 혼잡도={result.get('congestion_level')} "
                f"| 알림={result.get('alert')}"
            )
            return True

        except requests.exceptions.ConnectionError:
            logger.warning(f"Flask 연결 실패 (시도 {attempt}/{HTTP_RETRIES}) — "
                           f"Flask 서버가 실행 중인지 확인하세요.")
        except requests.exceptions.Timeout:
            logger.warning(f"Flask 응답 타임아웃 (시도 {attempt}/{HTTP_RETRIES})")
        except requests.exceptions.HTTPError as e:
            logger.error(f"Flask HTTP 오류: {e}")
            return False  # 4xx/5xx는 재시도 의미 없음

        if attempt < HTTP_RETRIES:
            time.sleep(2)

    logger.error("Flask 전송 최종 실패 — 데이터 버려짐")
    return False


# ── 데이터 검증 ───────────────────────────────────────────
def validate_payload(data: dict) -> bool:
    """Arduino에서 온 JSON이 최소 필드를 갖추었는지 확인."""
    required = {"sensor_id", "person_count", "queue_length_m"}
    if not required.issubset(data.keys()):
        logger.warning(f"필수 필드 누락: {required - data.keys()}")
        return False
    if not isinstance(data["person_count"], (int, float)):
        return False
    return True


# ── 메인 루프 ─────────────────────────────────────────────
def main():
    logger.info(f"브리지 시작 | 포트={SERIAL_PORT} | Flask={FLASK_URL}")

    while True:
        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=10) as ser:
                logger.info("시리얼 연결 성공. 데이터 대기 중...")

                while True:
                    raw = ser.readline()

                    # 빈 라인 (타임아웃) 스킵
                    if not raw:
                        continue

                    line = raw.decode("utf-8", errors="ignore").strip()

                    # 상태 메시지 로깅 (warming_up, ready 등)
                    if '"status"' in line:
                        logger.info(f"Arduino 상태: {line}")
                        continue

                    # JSON 파싱
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning(f"JSON 파싱 실패: {repr(line)}")
                        continue

                    # 검증
                    if not validate_payload(data):
                        continue

                    # 날씨 정보 추가
                    data["weather"] = get_weather()

                    logger.info(
                        f"수신 | 인원={data['person_count']}명 "
                        f"| 줄길이={data['queue_length_m']}m"
                    )

                    # Flask로 전송
                    post_to_flask(data)

        except serial.SerialException as e:
            logger.error(f"시리얼 오류: {e}. {RETRY_DELAY}초 후 재시도...")
            time.sleep(RETRY_DELAY)

        except KeyboardInterrupt:
            logger.info("브리지 종료")
            break


if __name__ == "__main__":
    main()


# ================================================================
# [systemd 자동 실행 설정] — RPi 재부팅 후에도 bridge.py 자동 시작
#
# 1. 서비스 파일 생성:
#    sudo nano /etc/systemd/system/ssnaai-bridge.service
#
# 2. 아래 내용 붙여넣기:
#
# [Unit]
# Description=SSNAAI Arduino Bridge
# After=network.target
#
# [Service]
# ExecStart=/usr/bin/python3 /home/pi/ssnaai/bridge.py
# Restart=always
# RestartSec=10
# User=pi
# WorkingDirectory=/home/pi/ssnaai
#
# [Install]
# WantedBy=multi-user.target
#
# 3. 활성화:
#    sudo systemctl enable ssnaai-bridge
#    sudo systemctl start ssnaai-bridge
#    sudo systemctl status ssnaai-bridge  ← 상태 확인
# ================================================================
# ================================================================
# [systemd 자동 실행 설정] — RPi 재부팅 후에도 bridge.py 자동 시작
#
# 1. 서비스 파일 생성:
#    sudo nano /etc/systemd/system/ssnaai-bridge.service
#
# 2. 아래 내용 붙여넣기:
#
# [Unit]
# Description=SSNAAI Arduino Bridge
# After=network.target
#
# [Service]
# ExecStart=/usr/bin/python3 /home/pi/ssnaai/bridge.py
# Restart=always
# RestartSec=10
# User=pi
# WorkingDirectory=/home/pi/ssnaai
#
# [Install]
# WantedBy=multi-user.target
#
# 3. 활성화:
#    sudo systemctl enable ssnaai-bridge
#    sudo systemctl start ssnaai-bridge
#    sudo systemctl status ssnaai-bridge  ← 상태 확인
# ================================================================