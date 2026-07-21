import sqlite3
from contextlib import contextmanager
from pathlib import Path
from threading import Lock
from typing import Iterator

from app.config import settings


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            connection = sqlite3.connect(self.path)
            connection.row_factory = sqlite3.Row
            try:
                connection.execute("PRAGMA foreign_keys = ON")
                yield connection
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                connection.close()

    def initialize(self) -> None:
        with sqlite3.connect(self.path) as connection:
            connection.execute("PRAGMA foreign_keys = ON")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    student_id TEXT PRIMARY KEY,
                    stair_use_floors INTEGER NOT NULL DEFAULT 0,
                    reward_points INTEGER NOT NULL DEFAULT 0,
                    suyong_health INTEGER NOT NULL DEFAULT 50,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_timetable (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    day_of_week INTEGER NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    building_id TEXT NOT NULL,
                    room TEXT NOT NULL,
                    floor INTEGER,
                    preferred_route_mode TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS favorite_places (
                    student_id TEXT NOT NULL,
                    place_id TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (student_id, place_id),
                    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS stair_uses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    floors INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    building_id TEXT NOT NULL,
                    floor INTEGER,
                    starts_at TEXT,
                    ends_at TEXT,
                    threshold_score INTEGER NOT NULL,
                    enabled INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES users(student_id) ON DELETE CASCADE
                );
                """
            )


database = Database(settings.sqlite_db)
