# 🔧 SSANAI 전처리 코드 설명

> `preprocess.py` — 센서 원본 데이터를 AI 학습용 데이터로 변환하는 전처리 파이프라인

---

## 📋 개요

| 항목 | 내용 |
|------|------|
| **입력** | `arduino_sensor_data2.csv` (원본 16,575행) |
| **출력** | `sensor_clean.csv` (전처리 완료 4,391행) |
| **제거된 행** | 12,184행 (측정 실패값, 노이즈 등) |

---

## 🔄 전처리 파이프라인

```
원본 데이터 (16,575행)
        ↓
[1단계] 데이터 불러오기
        ↓
[2단계] 센서 데이터 필터링
        ↓ 16,559행
[3단계] 정규식 파싱
        ↓
[4단계] 결측치 및 이상치 제거
        ↓ 4,391행
[5단계] 시간 특성 추가
        ↓
[6단계] 혼잡도 재정의
        ↓
[7단계] CSV 저장
        ↓
sensor_clean.csv (4,391행)
```

---

## 📝 단계별 코드 설명

### 1단계 — 데이터 불러오기

```python
df = pd.read_csv(
    'arduino_sensor_data2.csv',
    header=None,
    names=['timestamp', 'raw_data']
)
```

- `header=None`: 원본 파일에 헤더가 없으므로 직접 컬럼명 지정
- `timestamp`: 측정 시각
- `raw_data`: 아두이노 시리얼 출력 원문

---

### 2단계 — 센서 데이터 필터링

```python
sensor_df = df[df['raw_data'].str.contains('PIR1:', na=False)].copy()
```

- `PIR1:` 패턴이 있는 행만 추출
- 헤더, 오류 로그, 깨진 행, 시작 메시지 등 제거
- **16,575행 → 16,559행**

---

### 3단계 — 정규식 파싱

```python
def parse_row(row):
    raw = str(row['raw_data'])

    pir1 = re.search(r'PIR1: (\d)', raw)       # PIR1 감지값 추출
    pir2 = re.search(r'PIR2: (\d)', raw)       # PIR2 감지값 추출
    u1   = re.search(r'ultra1 distance: ([-\d.]+)cm', raw)  # 초음파1 거리
    u2   = re.search(r'ultra2 distance: ([-\d.]+)cm', raw)  # 초음파2 거리
    status = re.search(r'status: (.+?)(?:\r|$)', raw)       # 혼잡도 원문
```

- 정규식(`re.search`)으로 각 센서값을 개별 컬럼으로 분리
- 파싱 실패 시 `None` 반환 → 다음 단계에서 제거

**파싱 전 (raw_data 원문)**
```
PIR1: 1 | PIR2: 0 | ultra1 distance: 98.50cm | ultra1: detect | ultra2 distance: 141.30cm | ultra2: none | status: Normal
```

**파싱 후 (분리된 컬럼)**
```
pir1=1, pir2=0, ultra1_dist=98.50, ultra2_dist=141.30, status='Normal'
```

---

### 4단계 — 결측치 및 이상치 제거

```python
# 결측치 제거
result = result.dropna(subset=['pir1', 'pir2', 'status'])

# 초음파 측정 실패값 제거 (-1: pulseIn 타임아웃)
result = result[result['ultra1_dist'] >= 0]
result = result[result['ultra2_dist'] >= 0]

# 노이즈 제거 (1cm 이하는 센서 오류)
result = result[result['ultra1_dist'] >= 1]
result = result[result['ultra2_dist'] >= 1]
```

| 제거 항목 | 이유 |
|-----------|------|
| `None` 값 | 파싱 실패한 행 |
| `-1.00cm` | 초음파 측정 타임아웃 (pulseIn 반환값 0) |
| `1cm 이하` | 센서 노이즈 (실제 측정 불가 거리) |

---

### 5단계 — 시간 특성 추가

```python
result['timestamp']   = pd.to_datetime(result['timestamp'])
result['hour']        = result['timestamp'].dt.hour       # 시 (0~23)
result['minute']      = result['timestamp'].dt.minute     # 분 (0~59)
result['day_of_week'] = result['timestamp'].dt.dayofweek  # 요일 (0=월~6=일)
result['day_name']    = result['timestamp'].dt.day_name() # 요일 영문
result['date']        = result['timestamp'].dt.date       # 날짜
```

- AI 학습에 필요한 시간 관련 피처 생성
- `day_of_week`: 0=월요일 ~ 6=일요일

---

### 6단계 — 혼잡도 재정의

```python
def define_congestion(row):
    pir1 = row['pir1']
    pir2 = row['pir2']
    u1_person = row['ultra1_dist'] < 110  # 평균 141cm 대비 30cm 이상 가까움
    u2_person = row['ultra2_dist'] < 120  # 평균 153cm 대비 30cm 이상 가까움

    # 혼잡: PIR 둘 다 감지 OR 초음파 둘 다 가까움
    if (pir1 == 1 and pir2 == 1) or (u1_person and u2_person):
        return '혼잡'

    # 보통: PIR1 감지 OR 초음파 하나 가까움
    elif (pir1 == 1) or u1_person or u2_person:
        return '보통'

    # 여유: 아무것도 감지 안 됨
    else:
        return '여유'
```

**왜 재정의했나?**
- 아두이노 원본 `status`는 PIR 센서 오작동으로 신뢰도 낮음
- 초음파 거리값의 평균(141cm, 153cm)을 기준으로 재계산
- 실제 측정 환경에 맞게 임계값 조정

---

### 7단계 — CSV 저장

```python
result.to_csv('sensor_clean.csv', index=False, encoding='utf-8-sig')
```

- `encoding='utf-8-sig'`: 한글 깨짐 방지 (Excel 호환)
- `index=False`: 인덱스 컬럼 제외

---

## 📦 의존 라이브러리

```bash
pip install pandas numpy
```

| 라이브러리 | 용도 |
|-----------|------|
| `pandas` | 데이터프레임 처리 |
| `numpy` | 수치 연산 |
| `re` | 정규식 파싱 (내장 모듈) |

---

## 🚀 실행 방법

```bash
# 실행 전 arduino_sensor_data2.csv가 같은 폴더에 있어야 합니다
python preprocess.py
```

---

## ⚠️ 알려진 한계

| 항목 | 내용 |
|------|------|
| 데이터 삭제 비율 | 원본의 73.5% 제거 (주로 측정 실패값) |
| 혼잡 데이터 부족 | 혼잡 2.6%로 불균형 (센서 미작동 구간 존재) |
| 재정의 기준 | 초음파 임계값(110cm, 120cm)은 경험적으로 설정됨 |

---

*SSANAI Team — 성신여대 AI융합학부 IoT+AI 경진대회 2026*
