import pandas as pd
import re

files = {
    '전공': '2학기 전공.csv',
    '교양': '2학기 교양.csv',
    '교직': '2학기 교직.csv',
    '사이버': '2학기 사이버.csv'
}

period_to_time = {
    1: '09:00', 2: '10:00', 3: '11:00',
    4: '12:00', 5: '13:00', 6: '14:00',
    7: '15:00', 8: '16:00', 9: '17:00',
    10: '18:00', 11: '19:00', 12: '20:00',
}

all_data = []

for category, filename in files.items():
    print(f"{category} 파싱 중...")
    try:
        df = pd.read_csv(filename, encoding='utf-8-sig')

        for _, row in df.iterrows():
            try:
                subject = str(row.get('교과목명', '')).strip()
                if not subject or subject == 'nan':
                    continue

                time_str = str(row.get('시간표', '')).strip()
                if not time_str or time_str == 'nan':
                    continue

                room = str(row.get('강의실', '')).strip()

                matches = re.findall(r'([월화수목금토])/(\d+)-(\d+)', time_str)

                for match in matches:
                    day = match[0]
                    start_period = int(match[1])
                    end_period = int(match[2])

                    start_time = period_to_time.get(start_period, '')
                    end_time = period_to_time.get(end_period + 1, '')

                    all_data.append({
                        'category': category,
                        'subject': subject,
                        'day': day,
                        'start_period': start_period,
                        'end_period': end_period,
                        'start_time': start_time,
                        'end_time': end_time,
                        'room': room
                    })

            except Exception as e:
                continue

        print(f"{category} 완료!")

    except Exception as e:
        print(f"{category} 오류: {e}")

df_result = pd.DataFrame(all_data)
df_result.to_csv('schedule_clean.csv', index=False, encoding='utf-8-sig')
print(f"\n✅ 저장 완료! 총 {len(df_result)}개")
print(df_result.head(10))