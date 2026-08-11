from __future__ import annotations

import hashlib
import hmac
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "app.db"
PBKDF2_ITERATIONS = 310_000
SALT_BYTES = 16


class AuthError(ValueError):
    pass


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_auth_db() -> None:
    """인증/프로필용 테이블을 준비한다.

    개발 중 기존 data/app.db를 삭제하고 서버를 재시작하면 아래 테이블이 새로 만들어진다.
    기존 백엔드 users/user_timetable/favorite_places/stair_uses/alerts 테이블과 이름을 분리해
    기존 기능과 충돌하지 않도록 구성한다.
    """
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_credentials (
                student_id TEXT PRIMARY KEY,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_profiles (
                student_id TEXT PRIMARY KEY,
                nickname TEXT,
                department TEXT,
                student_year TEXT,
                photo_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (student_id)
                    REFERENCES user_credentials(student_id)
                    ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def _hash_password(password: str, salt: bytes) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return digest.hex()


def _validate_password(password: str) -> None:
    if len(password) < 4:
        raise AuthError("비밀번호는 4자 이상이어야 합니다.")
    if len(password) > 128:
        raise AuthError("비밀번호는 128자 이하여야 합니다.")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_legacy_user_row(conn: sqlite3.Connection, student_id: str) -> None:
    """기존 users 테이블이 있으면 가능한 경우 동일 학번 사용자 행도 만든다."""
    table = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).fetchone()
    if not table:
        return

    columns = conn.execute("PRAGMA table_info(users)").fetchall()
    names = {row[1] for row in columns}
    if "student_id" not in names:
        return

    required_without_default = []
    for row in columns:
        # cid, name, type, notnull, dflt_value, pk
        name = row[1]
        notnull = bool(row[3])
        default_value = row[4]
        is_pk = bool(row[5])
        if name == "student_id":
            continue
        if notnull and default_value is None and not is_pk:
            required_without_default.append(name)

    if required_without_default:
        return

    try:
        conn.execute(
            "INSERT OR IGNORE INTO users (student_id) VALUES (?)",
            (student_id,),
        )
    except sqlite3.DatabaseError:
        pass


def signup(student_id: str, password: str) -> dict:
    student_id = student_id.strip()
    if not student_id:
        raise AuthError("학번을 입력해 주세요.")
    _validate_password(password)

    init_auth_db()
    salt = os.urandom(SALT_BYTES)
    password_hash = _hash_password(password, salt)
    now = _now_iso()

    with _connect() as conn:
        existing = conn.execute(
            "SELECT 1 FROM user_credentials WHERE student_id = ?",
            (student_id,),
        ).fetchone()
        if existing:
            raise AuthError("이미 가입된 학번입니다.")

        conn.execute(
            """
            INSERT INTO user_credentials
                (student_id, password_salt, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (student_id, salt.hex(), password_hash, now, now),
        )
        conn.execute(
            """
            INSERT INTO user_profiles
                (student_id, nickname, department, student_year, photo_url, created_at, updated_at)
            VALUES (?, NULL, NULL, NULL, NULL, ?, ?)
            """,
            (student_id, now, now),
        )
        _ensure_legacy_user_row(conn, student_id)
        conn.commit()

    return {
        "student_id": student_id,
        "message": "회원가입이 완료되었습니다.",
    }


def login(student_id: str, password: str) -> dict:
    student_id = student_id.strip()
    if not student_id or not password:
        raise AuthError("학번과 비밀번호를 입력해 주세요.")

    init_auth_db()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT student_id, password_salt, password_hash
            FROM user_credentials
            WHERE student_id = ?
            """,
            (student_id,),
        ).fetchone()

    if row is None:
        raise AuthError("학번 또는 비밀번호가 올바르지 않습니다.")

    salt = bytes.fromhex(row["password_salt"])
    calculated = _hash_password(password, salt)
    if not hmac.compare_digest(calculated, row["password_hash"]):
        raise AuthError("학번 또는 비밀번호가 올바르지 않습니다.")

    return {
        "student_id": row["student_id"],
        "message": "로그인에 성공했습니다.",
    }


def change_password(student_id: str, current_password: str, new_password: str) -> dict:
    student_id = student_id.strip()
    if not student_id:
        raise AuthError("학번을 입력해 주세요.")
    if not current_password:
        raise AuthError("기존 비밀번호를 입력해 주세요.")
    _validate_password(new_password)
    if current_password == new_password:
        raise AuthError("새 비밀번호는 기존 비밀번호와 다르게 설정해 주세요.")

    init_auth_db()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT password_salt, password_hash
            FROM user_credentials
            WHERE student_id = ?
            """,
            (student_id,),
        ).fetchone()

        if row is None:
            raise AuthError("가입된 사용자를 찾을 수 없습니다.")

        current_salt = bytes.fromhex(row["password_salt"])
        calculated = _hash_password(current_password, current_salt)
        if not hmac.compare_digest(calculated, row["password_hash"]):
            raise AuthError("기존 비밀번호가 올바르지 않습니다.")

        new_salt = os.urandom(SALT_BYTES)
        new_hash = _hash_password(new_password, new_salt)
        conn.execute(
            """
            UPDATE user_credentials
            SET password_salt = ?, password_hash = ?, updated_at = ?
            WHERE student_id = ?
            """,
            (new_salt.hex(), new_hash, _now_iso(), student_id),
        )
        conn.commit()

    return {
        "student_id": student_id,
        "message": "비밀번호가 변경되었습니다.",
    }


def get_profile(student_id: str) -> dict:
    student_id = student_id.strip()
    if not student_id:
        raise AuthError("학번을 입력해 주세요.")

    init_auth_db()
    with _connect() as conn:
        credential = conn.execute(
            "SELECT 1 FROM user_credentials WHERE student_id = ?",
            (student_id,),
        ).fetchone()
        if credential is None:
            raise AuthError("가입된 사용자를 찾을 수 없습니다.")

        row = conn.execute(
            """
            SELECT student_id, nickname, department, student_year, photo_url
            FROM user_profiles
            WHERE student_id = ?
            """,
            (student_id,),
        ).fetchone()

        if row is None:
            now = _now_iso()
            conn.execute(
                """
                INSERT INTO user_profiles
                    (student_id, nickname, department, student_year, photo_url, created_at, updated_at)
                VALUES (?, NULL, NULL, NULL, NULL, ?, ?)
                """,
                (student_id, now, now),
            )
            conn.commit()
            row = conn.execute(
                """
                SELECT student_id, nickname, department, student_year, photo_url
                FROM user_profiles
                WHERE student_id = ?
                """,
                (student_id,),
            ).fetchone()

    return dict(row)


def update_profile(
    student_id: str,
    *,
    nickname: str | None,
    department: str | None,
    student_year: str | None,
    photo_url: str | None,
) -> dict:
    student_id = student_id.strip()
    if not student_id:
        raise AuthError("학번을 입력해 주세요.")

    init_auth_db()
    with _connect() as conn:
        credential = conn.execute(
            "SELECT 1 FROM user_credentials WHERE student_id = ?",
            (student_id,),
        ).fetchone()
        if credential is None:
            raise AuthError("가입된 사용자를 찾을 수 없습니다.")

        now = _now_iso()
        conn.execute(
            """
            INSERT INTO user_profiles
                (student_id, nickname, department, student_year, photo_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET
                nickname = excluded.nickname,
                department = excluded.department,
                student_year = excluded.student_year,
                photo_url = excluded.photo_url,
                updated_at = excluded.updated_at
            """,
            (
                student_id,
                nickname.strip() if isinstance(nickname, str) and nickname.strip() else None,
                department.strip() if isinstance(department, str) and department.strip() else None,
                student_year.strip() if isinstance(student_year, str) and student_year.strip() else None,
                photo_url if photo_url else None,
                now,
                now,
            ),
        )
        conn.commit()

    profile = get_profile(student_id)
    profile["message"] = "프로필이 저장되었습니다."
    return profile


def delete_all_auth_users() -> None:
    """개발 중 테스트 데이터 초기화용. API로 노출하지 않는다."""
    init_auth_db()
    with _connect() as conn:
        conn.execute("DELETE FROM user_profiles")
        conn.execute("DELETE FROM user_credentials")
        conn.commit()
