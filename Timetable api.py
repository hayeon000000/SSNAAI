import os
import json
import pandas as pd
from flask import Flask, request, Response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

app = Flask(__name__)
CORS(app)

schedule1 = pd.read_csv('1학기 시간표.csv', encoding='utf-8-sig')
schedule2 = pd.read_csv('2학기 시간표.csv', encoding='utf-8-sig')
schedule_df = pd.concat([schedule1, schedule2], ignore_index=True)
print(f"✅ 시간표 로드 완료: {len(schedule_df)}개")

def get_schedule_text():
    sample = schedule_df[['subject', 'day', 'start_time', 'end_time', 'room']].head(50)
    return sample.to_string(index=False)

def korean_jsonify(data):
    return Response(
        json.dumps(data, ensure_ascii=False, indent=2),
        content_type='application/json; charset=utf-8'
    )

@app.route('/api/timetable/upload', methods=['POST'])
def upload_timetable():
    try:
        if 'image' not in request.files:
            return korean_jsonify({'error': '이미지가 없어요!'}), 400

        file = request.files['image']
        image_bytes = file.read()
        mime_type = file.content_type or 'image/jpeg'

        prompt = f"""
이 이미지는 에브리타임 앱의 시간표 화면입니다.
시간표에서 모든 과목 정보를 추출해주세요.

아래 우리 학교 시간표 데이터 샘플입니다:
{get_schedule_text()}

다음 JSON 형식으로만 답변해주세요. 다른 설명은 하지 마세요.
{{
  "semester": "2026년 1학기",
  "subjects": [
    {{
      "subject": "과목명",
      "day": "월",
      "start_time": "09:00",
      "end_time": "11:00",
      "room": "강의실"
    }}
  ]
}}

주의사항:
- 요일은 월/화/수/목/금/토 중 하나
- 시간은 HH:MM 형식 (24시간)
- 강의실은 이미지에 보이는 그대로
- 여러 날에 걸친 과목은 각 날짜별로 따로 작성
"""

        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                ),
                prompt
            ]
        )

        raw_text = response.text.strip()
        if '```json' in raw_text:
            raw_text = raw_text.split('```json')[1].split('```')[0].strip()
        elif '```' in raw_text:
            raw_text = raw_text.split('```')[1].split('```')[0].strip()

        result = json.loads(raw_text)
        return korean_jsonify({'success': True, 'timetable': result})

    except json.JSONDecodeError:
        return korean_jsonify({'success': False, 'error': 'JSON 파싱 실패'}), 500
    except Exception as e:
        return korean_jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/timetable/test', methods=['GET'])
def test_timetable():
    try:
        prompt = f"""
다음은 학생의 시간표입니다:
- 디지털논리회로: 화요일 9:00~12:00, 난504
- 자료구조: 수요일 9:00~12:00, 난204
- 고급파이썬프로그래밍: 화요일 12:00~15:00, 성213
- 알고리즘: 수요일 12:00~15:00, 성306
- IoT기본실습: 월요일 15:00~18:00, 국401
- 컴퓨터구조: 금요일 15:00~18:00

아래 우리 학교 시간표 데이터와 매칭해주세요:
{get_schedule_text()}

JSON 형식으로만 답변해주세요:
{{
  "semester": "2026년 1학기",
  "subjects": [
    {{
      "subject": "과목명",
      "day": "월",
      "start_time": "09:00",
      "end_time": "11:00",
      "room": "강의실"
    }}
  ]
}}
"""
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt
        )

        raw_text = response.text.strip()
        if '```json' in raw_text:
            raw_text = raw_text.split('```json')[1].split('```')[0].strip()
        elif '```' in raw_text:
            raw_text = raw_text.split('```')[1].split('```')[0].strip()

        result = json.loads(raw_text)
        return korean_jsonify({'success': True, 'timetable': result})

    except Exception as e:
        return korean_jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("✅ 시간표 API 서버 시작!")
    print("📌 API 목록")
    print("  POST /api/timetable/upload → 이미지 업로드 → 시간표 추출")
    print("  GET  /api/timetable/test   → 텍스트 테스트")
    app.run(debug=True, port=5002)