from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import alerts, auth, buildings, data, home, routes, timetable, users
from app.services.auth_service import init_auth_db


app = FastAPI(title="Elevator Congestion Backend", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# auth를 기존 users보다 먼저 등록해 /api/users/login 충돌 시 새 인증 API가 우선 매칭되도록 한다.
app.include_router(auth.router)
app.include_router(home.router)
app.include_router(buildings.router)
app.include_router(routes.router)
app.include_router(users.router)
app.include_router(alerts.router)
app.include_router(data.router)
app.include_router(timetable.router)


@app.on_event("startup")
def startup() -> None:
    init_auth_db()


@app.exception_handler(ValueError)
def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/")
def root():
    return {
        "service": "Elevator Congestion Backend",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
