from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    data_dir: Path = BASE_DIR / "data"
    sensor_imputed_csv: Path = BASE_DIR / "data" / "sensor_imputed.csv"
    sensor_clean_csv: Path = BASE_DIR / "data" / "sensor_clean.csv"
    semester1_schedule_csv: Path = BASE_DIR / "data" / "schedule_semester_1.csv"
    semester2_schedule_csv: Path = BASE_DIR / "data" / "schedule_semester_2.csv"
    reload_seconds: int = 30
    default_building_id: str = "SOOJUNG"
    default_elevator_id: str = "SOOJUNG-MAIN"
    default_floor: int = 1


settings = Settings()
