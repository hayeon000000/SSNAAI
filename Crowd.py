import pygame
import random

# 기본 설정
WIDTH, HEIGHT = 800, 600
FPS = 60

# 색상
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
DARK = (30, 30, 50)
GREEN = (0, 200, 100)
YELLOW = (255, 210, 0)
ORANGE = (255, 140, 0)
RED = (220, 50, 50)
BLUE = (100, 150, 255)

# 엘베 위치
ELEV_A = (250, 50)
ELEV_B = (450, 50)
ELEV_WIDTH = 80
ELEV_HEIGHT = 60

# 두 줄의 x좌표를 엘베 중앙으로 고정 -> 학생이 항상 이 x에서만 움직여서 일자로 줄서짐
LANE_X = [ELEV_A[0] + ELEV_WIDTH // 2, ELEV_B[0] + ELEV_WIDTH // 2]

# PIR 구역 (문에서 거리)
PIR_ZONES = [150, 250, 350]  # 1m, 2m, 3m

# 5초마다 여유 -> 보통 -> 혼잡 순으로 강제 순환.
# 실제 라벨/색은 여전히 PIR 센서 계산 결과를 쓰지만, 단계별 "목표 인원수"를
# 다르게 줘서 실제로 그 혼잡도가 되도록 사람 수를 서서히 맞춰간다.
PHASES = ["여유", "보통", "혼잡"]
PHASE_SECONDS = 5
TARGET_COUNT = {"여유": 3, "보통": 10, "혼잡": 20}


class Student:
    def __init__(self, lane_x):
        self.x = lane_x       # 줄(레인) x좌표에 딱 맞춰서 스폰 -> 좌우로 안 흩어짐
        self.y = HEIGHT - random.randint(20, 80)
        self.speed = random.uniform(1.5, 3.0)

    def move(self, students):
        # 나와 같은 줄(x가 똑같은)이고, 나보다 위(앞)에 있는 사람들
        others_ahead = [s for s in students if s is not self
                        and s.x == self.x
                        and s.y < self.y]

        if others_ahead:
            closest = max(others_ahead, key=lambda s: s.y)
            if self.y - closest.y > 30:
                self.y -= self.speed
            else:
                self.y = closest.y + 30
        else:
            if self.y > 80:
                self.y -= self.speed

    def draw(self, screen):
        pygame.draw.circle(screen, BLUE, (int(self.x), int(self.y)), 10)


def get_sensor_data(students):
    pir1 = any(PIR_ZONES[0] < s.y < PIR_ZONES[0] + 100 for s in students)
    pir2 = any(PIR_ZONES[1] < s.y < PIR_ZONES[1] + 100 for s in students)
    pir3 = any(PIR_ZONES[2] < s.y < PIR_ZONES[2] + 100 for s in students)

    close = [s for s in students if s.y < PIR_ZONES[0] + 100]
    distance = min((s.y for s in close), default=400) / 100

    return int(pir1), int(pir2), int(pir3), round(distance, 1)


def get_congestion(pir1, pir2, pir3):
    if not pir1:
        return 0, "여유", GREEN
    elif pir1 and not pir2:
        return 1, "줄 서기 시작", YELLOW
    elif pir1 and pir2 and not pir3:
        return 2, "보통", ORANGE
    else:
        return 3, "혼잡", RED


def adjust_population(students, target):
    """현재 인원수를 목표치로 서서히(한 프레임에 한 명씩) 맞춘다."""
    if len(students) < target:
        students.append(Student(random.choice(LANE_X)))
    elif len(students) > target:
        # 줄 제일 뒤(가장 아래, y가 큰) 사람부터 뺀다
        back = max(students, key=lambda s: s.y)
        students.remove(back)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("SSANAI - 군중 시뮬레이션 (5초 단계 순환)")
    clock = pygame.time.Clock()

    font = pygame.font.SysFont("malgun gothic", 20)
    font_big = pygame.font.SysFont("malgun gothic", 28)

    students = []
    phase_index = 0
    phase_timer_ms = 0
    population_timer_ms = 0

    running = True
    while running:
        dt = clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                students.append(Student(random.choice(LANE_X)))

        # ── 5초마다 단계 전환 ──────────────────────────
        phase_timer_ms += dt
        if phase_timer_ms >= PHASE_SECONDS * 1000:
            phase_timer_ms = 0
            phase_index = (phase_index + 1) % len(PHASES)

        current_phase = PHASES[phase_index]
        target = TARGET_COUNT[current_phase]

        # ── 목표 인원수로 서서히(150ms마다 한 명씩) 맞추기 ──
        population_timer_ms += dt
        if population_timer_ms >= 150:
            population_timer_ms = 0
            adjust_population(students, target)

        for s in students:
            s.move(students)

        pir1, pir2, pir3, distance = get_sensor_data(students)
        level, label, color = get_congestion(pir1, pir2, pir3)

        # ── 그리기 ─────────────────────────────────────
        screen.fill(DARK)

        pygame.draw.rect(screen, GRAY, (*ELEV_A, ELEV_WIDTH, ELEV_HEIGHT))
        pygame.draw.rect(screen, GRAY, (*ELEV_B, ELEV_WIDTH, ELEV_HEIGHT))
        screen.blit(font.render("엘베A", True, BLACK), (ELEV_A[0] + 8, ELEV_A[1] + 20))
        screen.blit(font.render("엘베B", True, BLACK), (ELEV_B[0] + 8, ELEV_B[1] + 20))

        for zone_y in PIR_ZONES:
            pygame.draw.line(screen, (90, 90, 110), (0, zone_y), (WIDTH, zone_y), 1)

        for s in students:
            s.draw(screen)

        # 상태 패널
        pygame.draw.rect(screen, WHITE, (WIDTH - 260, 10, 250, 175), border_radius=8)
        screen.blit(font_big.render(label, True, color), (WIDTH - 245, 18))
        info_lines = [
            f"PIR1(1m): {'O' if pir1 else 'X'}",
            f"PIR2(2m): {'O' if pir2 else 'X'}",
            f"PIR3(3m): {'O' if pir3 else 'X'}",
            f"초음파 거리: {distance}m",
            f"대기 인원: {len(students)}명",
            "",
            f"[순환] {current_phase} 단계 진행 중",
            f"다음 전환까지: {(PHASE_SECONDS * 1000 - phase_timer_ms) // 1000 + 1}초",
        ]
        for i, line in enumerate(info_lines):
            screen.blit(font.render(line, True, BLACK), (WIDTH - 245, 55 + i * 18))

        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()