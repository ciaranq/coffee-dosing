"""DRAFT of frontend/api/index.py. Untested, never run.

Lives in docs/contract/ until AGY has scaffolded frontend/. It then moves to
frontend/api/index.py (Claude does this; AGY should not edit it).
Pending dependency approval: fastapi, psycopg[binary,pool], pyjwt, pydantic.
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

import jwt
from psycopg.errors import ForeignKeyViolation
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, Field, model_validator


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = AsyncConnectionPool(
        os.environ["DATABASE_URL"],  # Neon -pooler DSN (PgBouncer, transaction mode)
        min_size=0,
        max_size=3,
        timeout=5,  # fail the checkout well inside the 10s function limit
        open=False,
        kwargs={"row_factory": dict_row, "prepare_threshold": None},  # no prepared statements behind PgBouncer
    )
    await app.state.pool.open()
    yield
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")

Grams = Annotated[Decimal, Field(ge=0, le=5000, decimal_places=2)]


class LogIn(BaseModel):
    client_id: UUID
    bean_id: UUID | None = None
    portafilter_empty_g: Grams
    portafilter_dry_g: Grams
    cup_empty_g: Grams
    cup_full_g: Grams
    portafilter_wet_g: Grams | None = None
    shot_time_s: Annotated[Decimal, Field(gt=0, le=120, decimal_places=1)] | None = None
    taste: Literal["sour", "balanced", "bitter"] | None = None
    grind_external: Annotated[Decimal, Field(ge=0, le=200, decimal_places=1)] | None = None
    burr_internal: Annotated[Decimal, Field(ge=0, le=200, decimal_places=1)] | None = None
    notes: str | None = Field(None, max_length=1000)

    @model_validator(mode="after")
    def check_weights(self):
        if self.portafilter_dry_g <= self.portafilter_empty_g:
            raise ValueError("dry portafilter must outweigh empty portafilter")
        if self.cup_full_g <= self.cup_empty_g:
            raise ValueError("full cup must outweigh empty cup")
        if self.portafilter_wet_g is not None and self.portafilter_wet_g < self.portafilter_dry_g:
            raise ValueError("wet portafilter cannot weigh less than dry")
        return self


def category(ratio: Decimal) -> str:
    # PROVISIONAL boundary rule: lower bound inclusive, upper exclusive.
    # `ratio` is the 3-decimal value stored by Postgres. See ratio-cases.json.
    return "ristretto" if ratio < Decimal("1.5") else "normale" if ratio < Decimal("2.5") else "lungo"


async def current_user_id(request: Request, authorization: Annotated[str, Header()]) -> UUID:
    try:
        claims = jwt.decode(
            authorization.removeprefix("Bearer "),
            os.environ["INTERNAL_JWT_SECRET"],
            algorithms=["HS256"],
            audience="dialin-api",
        )
    except jwt.PyJWTError:
        raise HTTPException(401, "invalid token")
    async with request.app.state.pool.connection() as conn:
        row = await (
            await conn.execute(
                """insert into users (auth_subject) values (%s)
                   on conflict (auth_subject) do update set auth_subject = excluded.auth_subject
                   returning id""",
                (claims["sub"],),
            )
        ).fetchone()
    return row["id"]


UserId = Annotated[UUID, Depends(current_user_id)]


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.post("/api/logs", status_code=201)
async def create_log(body: LogIn, user_id: UserId, request: Request):
    try:
        async with request.app.state.pool.connection() as conn:
            row = await (
                await conn.execute(
                    """insert into logs (user_id, client_id, bean_id, portafilter_empty_g,
                       portafilter_dry_g, cup_empty_g, cup_full_g, portafilter_wet_g,
                       shot_time_s, taste, grind_external, burr_internal, notes)
                   values (%(user_id)s, %(client_id)s, %(bean_id)s, %(portafilter_empty_g)s,
                       %(portafilter_dry_g)s, %(cup_empty_g)s, %(cup_full_g)s, %(portafilter_wet_g)s,
                       %(shot_time_s)s, %(taste)s, %(grind_external)s, %(burr_internal)s, %(notes)s)
                   on conflict (user_id, client_id) do update set client_id = excluded.client_id
                   returning *""",
                    {**body.model_dump(), "user_id": user_id},
                )
            ).fetchone()
    except ForeignKeyViolation:
        # composite FK (bean_id, user_id): bean does not exist or belongs to someone else
        raise HTTPException(422, "unknown bean_id")
    return {**row, "category": category(row["ratio"])}


@app.get("/api/logs")
async def list_logs(
    user_id: UserId,
    request: Request,
    bean_id: UUID | None = None,
    before: datetime | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    async with request.app.state.pool.connection() as conn:
        rows = await (
            await conn.execute(
                """select * from logs
                   where user_id = %s
                     and (%s::uuid is null or bean_id = %s)
                     and (%s::timestamptz is null or created_at < %s)
                   order by created_at desc limit %s""",
                (user_id, bean_id, bean_id, before, before, limit),
            )
        ).fetchall()
    return [{**r, "category": category(r["ratio"])} for r in rows]
