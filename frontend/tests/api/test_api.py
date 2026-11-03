import json
import time
import uuid
from decimal import Decimal
from pathlib import Path

import jwt
import psycopg.errors
import pytest
from fastapi.testclient import TestClient

from api.index import app, category

SECRET = "test-secret-at-least-32-bytes-long-0123456789"
CASES = json.loads((Path(__file__).parents[3] / "docs/contract/ratio-cases.json").read_text())
USER_ID = uuid.uuid4()


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    async def fetchone(self):
        return self.rows[0] if self.rows else None

    async def fetchall(self):
        return self.rows


class FakeConn:
    def __init__(self, handler, calls):
        self.handler, self.calls = handler, calls

    async def execute(self, sql, params=None):
        self.calls.append((sql, params))
        return FakeCursor(self.handler(sql, params))


class FakePool:
    def __init__(self, handler):
        self.handler, self.calls = handler, []

    def connection(self):
        pool = self

        class Ctx:
            async def __aenter__(self):
                return FakeConn(pool.handler, pool.calls)

            async def __aexit__(self, *exc):
                return False

        return Ctx()


def token(sub="user_clerk_1", aud="dialin-api", exp_in=60, secret=SECRET):
    return jwt.encode({"sub": sub, "aud": aud, "exp": int(time.time()) + exp_in}, secret, algorithm="HS256")


def auth(**kw):
    return {"Authorization": f"Bearer {token(**kw)}"}


BODY = {
    "client_id": str(uuid.uuid4()),
    "portafilter_empty_g": "200.00",
    "portafilter_dry_g": "218.00",
    "cup_empty_g": "100.00",
    "cup_full_g": "136.00",
}

LOG_ROW = {
    "id": uuid.uuid4(),
    "client_id": uuid.uuid4(),
    "dose_g": Decimal("18.00"),
    "yield_g": Decimal("36.00"),
    "ratio": Decimal("2.000"),
    "retained_water_g": None,
}


def handler_ok(sql, params):
    if "insert into users" in sql:
        return [{"id": USER_ID}]
    if "insert into logs" in sql:
        return [LOG_ROW]
    if "from logs" in sql:
        return [LOG_ROW, {**LOG_ROW, "ratio": Decimal("1.333")}]
    raise AssertionError(sql)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_JWT_SECRET", SECRET)
    app.state.pool = FakePool(handler_ok)
    return TestClient(app)


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_missing_authorization_is_rejected(client):
    assert client.get("/api/logs").status_code == 422


@pytest.mark.parametrize(
    "kw",
    [{"aud": "someone-else"}, {"exp_in": -5}, {"secret": "wrong-secret-also-32-bytes-long-0123456789"}],
    ids=["wrong-audience", "expired", "bad-signature"],
)
def test_bad_tokens_are_401(client, kw):
    assert client.get("/api/logs", headers=auth(**kw)).status_code == 401


def test_create_log_returns_category_and_scopes_to_user(client):
    r = client.post("/api/logs", json=BODY, headers=auth())
    assert r.status_code == 201
    assert r.json()["category"] == "normale"
    insert = next(c for c in app.state.pool.calls if "insert into logs" in c[0])
    assert insert[1]["user_id"] == USER_ID  # always the verified user, never the body


def test_body_cannot_override_user_id(client):
    client.post("/api/logs", json={**BODY, "user_id": str(uuid.uuid4())}, headers=auth())
    insert = next(c for c in app.state.pool.calls if "insert into logs" in c[0])
    assert insert[1]["user_id"] == USER_ID


@pytest.mark.parametrize(
    "patch",
    [
        {"portafilter_dry_g": "200.00"},  # dry not heavier than empty
        {"cup_full_g": "100.00"},  # full cup not heavier than empty
        {"portafilter_wet_g": "217.00"},  # wet lighter than dry
        {"portafilter_empty_g": "5000.01"},  # over the 5000 g limit
        {"taste": "salty"},
    ],
)
def test_invalid_bodies_are_422(client, patch):
    assert client.post("/api/logs", json={**BODY, **patch}, headers=auth()).status_code == 422


def test_foreign_or_unknown_bean_is_422(monkeypatch):
    monkeypatch.setenv("INTERNAL_JWT_SECRET", SECRET)

    def handler(sql, params):
        if "insert into logs" in sql:
            raise psycopg.errors.ForeignKeyViolation("bean not owned by user")
        return handler_ok(sql, params)

    app.state.pool = FakePool(handler)
    r = TestClient(app).post("/api/logs", json={**BODY, "bean_id": str(uuid.uuid4())}, headers=auth())
    assert r.status_code == 422
    assert r.json()["detail"] == "unknown bean_id"


def test_list_logs_filters_by_user_and_adds_category(client):
    r = client.get("/api/logs?limit=10", headers=auth())
    assert r.status_code == 200
    assert [row["category"] for row in r.json()] == ["normale", "ristretto"]
    select = next(c for c in app.state.pool.calls if "from logs" in c[0])
    assert select[1][0] == USER_ID
    assert "where user_id = %s" in select[0]


def test_list_limit_is_bounded(client):
    assert client.get("/api/logs?limit=1000", headers=auth()).status_code == 422


@pytest.mark.parametrize("case", CASES["cases"], ids=lambda c: c["name"])
def test_category_matches_shared_contract_cases(case):
    assert category(Decimal(str(case["ratio"]))) == case["category"]
