"""Tables owned by this implementation (the platform tables live in bsref.db)."""

from sqlalchemy import Boolean, Column, Float, Integer, String, Table, Text

from bsref.db import metadata

# ── the simulated operational system (ERP / point of sale) ──
core_sales = Table(
    "core_sales", metadata,
    Column("store_id", String(8), primary_key=True), Column("sku", String(8), primary_key=True),
    Column("day", String(10), primary_key=True), Column("units", Integer, nullable=False),
    Column("on_promo", Boolean, nullable=False), Column("stockout", Boolean, nullable=False), Column("price", Float, nullable=False),
)
sim_state = Table("sim_state", metadata, Column("id", Integer, primary_key=True), Column("state", Text, nullable=False))

# ── the ML platform's side ──
sales_daily = Table(
    "sales_daily", metadata,
    Column("store_id", String(8), primary_key=True), Column("sku", String(8), primary_key=True),
    Column("day", String(10), primary_key=True, index=True), Column("units", Integer, nullable=False),
    Column("on_promo", Boolean, nullable=False), Column("stockout", Boolean, nullable=False), Column("price", Float, nullable=False),
    Column("source_seq", Integer, nullable=False),  # the newest source change applied: a restatement replaces the row
    Column("restated", Integer, nullable=False), Column("updated_at", Float, nullable=False),
)
promo_plan = Table(
    "promo_plan", metadata,
    Column("store_id", String(8), primary_key=True), Column("sku", String(8), primary_key=True), Column("day", String(10), primary_key=True),
)
forecast_runs = Table(
    "forecast_runs", metadata,
    Column("run_id", String(48), primary_key=True), Column("origin_day", String(10), nullable=False, index=True),
    Column("model_version", String(16), nullable=False), Column("status", String(16), nullable=False),
    Column("series", Integer, nullable=False), Column("held", Integer, nullable=False),
    Column("completeness", Float, nullable=False), Column("started_by", String(64), nullable=False), Column("created_at", Float, nullable=False),
)
forecasts = Table(
    "forecasts", metadata,
    Column("run_id", String(48), primary_key=True), Column("store_id", String(8), primary_key=True),
    Column("sku", String(8), primary_key=True), Column("target_day", String(10), primary_key=True, index=True),
    Column("horizon", Integer, nullable=False), Column("p10", Float, nullable=False), Column("p50", Float, nullable=False),
    Column("p90", Float, nullable=False), Column("baseline", Float, nullable=False),
    Column("final", Float, nullable=False),          # what consumers receive: p50, a planner override, or the baseline while held
    Column("status", String(12), nullable=False),    # published | held | overridden
    Column("decided_by", String(64)),
)
