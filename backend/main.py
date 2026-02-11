import asyncio
import collections
import json
import logging
import random
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models import Transaction
from transaction_generator import generate_transaction
from databricks_sql import DatabricksSQLClient
from zerobus_client import ZeroBusClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
zerobus = ZeroBusClient()
db_sql = DatabricksSQLClient()
connected_ws: list[WebSocket] = []
running = False
task: Optional[asyncio.Task] = None

# Throttle: 1 (slowest) to 100 (fastest)
# Maps to batch_size and sleep interval in the generation loop
throttle = 50

# Stats
stats = {
    "total_count": 0,
    "total_volume": 0.0,
    "anomaly_count": 0,
    "start_time": None,
    "ingested_to_databricks": 0,
}

# Rolling window for instantaneous tx/sec (stores timestamps of recent transactions)
RATE_WINDOW = 2  # seconds - shorter window for more responsive rate
tx_timestamps: collections.deque[float] = collections.deque(maxlen=1000)  # Limit size for performance
# Exponential moving average for smoother rate display
_ema_rate = 0.0
_ema_alpha = 0.3  # Smoothing factor (0-1, higher = more responsive)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    stop_generation()


app = FastAPI(title="ZeroBus Transaction Monitor", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def broadcast(tx: Transaction):
    payload = tx.model_dump_json()
    stale: list[WebSocket] = []
    for ws in connected_ws:
        try:
            await ws.send_text(payload)
        except Exception:
            stale.append(ws)
    for ws in stale:
        connected_ws.remove(ws)


async def generation_loop():
    global running
    zb_connected = zerobus.connect()
    if zb_connected:
        await zerobus.start_ack_worker()
        logger.info("ZeroBus ingestion active — non-blocking mode")
    else:
        logger.info("Running in demo mode — transactions broadcast via WebSocket only")

    try:
        while running:
            # throttle 1-100 → batch 1-10, sleep 1.0-0.02s
            t = max(1, min(100, throttle))
            batch_size = max(1, t // 10)
            sleep_time = max(0.02, 1.0 - (t - 1) * 0.98 / 99)

            for _ in range(batch_size):
                if not running:
                    break
                tx = generate_transaction()

                # Update stats
                stats["total_count"] += 1
                stats["total_volume"] += tx.amount
                tx_timestamps.append(time.time())
                if tx.risk_score > 0.8:
                    stats["anomaly_count"] += 1

                # Ingest to Databricks (non-blocking - returns immediately)
                if zb_connected:
                    record = json.loads(tx.model_dump_json())
                    await zerobus.ingest_async(record)  # Non-blocking!

                # Broadcast to WebSocket clients
                await broadcast(tx)

            await asyncio.sleep(sleep_time)
    finally:
        if zb_connected:
            await zerobus.stop_ack_worker()
        zerobus.close()


def stop_generation():
    global running, task
    running = False
    if task and not task.done():
        task.cancel()
    task = None
    zerobus.close()


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------
@app.post("/api/start")
async def start():
    global running, task, stats, _ema_rate, tx_timestamps
    if running:
        return {"status": "already_running"}
    stats = {
        "total_count": 0,
        "total_volume": 0.0,
        "anomaly_count": 0,
        "start_time": time.time(),
        "ingested_to_databricks": 0,
    }
    tx_timestamps.clear()
    _ema_rate = 0.0
    running = True
    task = asyncio.create_task(generation_loop())
    return {"status": "started"}


@app.post("/api/stop")
async def stop():
    if not running:
        return {"status": "not_running"}
    stop_generation()
    return {"status": "stopped"}


@app.get("/api/stats")
async def get_stats():
    global _ema_rate
    
    # Prune old timestamps and compute instantaneous rate
    now = time.time()
    cutoff = now - RATE_WINDOW
    
    # Efficiently prune old timestamps
    while tx_timestamps and len(tx_timestamps) > 0 and tx_timestamps[0] < cutoff:
        tx_timestamps.popleft()
    
    # Calculate instantaneous rate over the window
    instant_rate = len(tx_timestamps) / RATE_WINDOW if tx_timestamps else 0
    
    # Apply exponential moving average for smoother display
    if _ema_rate == 0.0:
        _ema_rate = instant_rate
    else:
        _ema_rate = _ema_alpha * instant_rate + (1 - _ema_alpha) * _ema_rate

    # Calculate elapsed time since start
    elapsed_seconds = 0
    if stats["start_time"] and running:
        elapsed_seconds = int(now - stats["start_time"])

    # Get ingestion metrics
    ingestion_metrics = zerobus.get_metrics()
    
    return {
        **stats,
        "avg_amount": (
            round(stats["total_volume"] / stats["total_count"], 2)
            if stats["total_count"]
            else 0
        ),
        "tx_per_sec": round(_ema_rate, 1),  # Use smoothed rate
        "throttle": throttle,
        "elapsed_seconds": elapsed_seconds,
        "running": running,
        "ingestion": ingestion_metrics,
        "ingested_to_databricks": ingestion_metrics.get("total_ingested", 0),
    }


@app.post("/api/throttle")
async def set_throttle(value: int):
    """Set generation speed: 1 (slowest) to 100 (fastest)."""
    global throttle
    throttle = max(1, min(100, value))
    return {"throttle": throttle}


# ---------------------------------------------------------------------------
# Databricks history helpers
# ---------------------------------------------------------------------------
def _parse_result(api_response: dict) -> list[dict]:
    """Convert SQL Statement API JSON_ARRAY response to list of dicts."""
    manifest = api_response.get("manifest", {})
    columns = [col["name"] for col in manifest.get("schema", {}).get("columns", [])]
    data_array = api_response.get("result", {}).get("data_array", [])
    return [dict(zip(columns, row)) for row in data_array]


@app.get("/api/history/summary")
async def history_summary():
    """Aggregated statistics from the Databricks Delta table."""
    if not db_sql.configured:
        return {"error": "Databricks SQL not configured (missing DATABRICKS_WAREHOUSE_ID)"}

    table = db_sql.table_name
    try:
        summary_res, type_res, status_res, currency_res = await asyncio.gather(
            db_sql.execute_statement(f"""
                SELECT COUNT(*) as total_rows,
                       ROUND(SUM(amount), 2) as total_volume,
                       ROUND(AVG(amount), 2) as avg_amount,
                       COUNT(CASE WHEN risk_score > 0.8 THEN 1 END) as anomaly_count,
                       ROUND(COUNT(CASE WHEN risk_score > 0.8 THEN 1 END) * 100.0 / COUNT(*), 2) as anomaly_pct,
                       MIN(timestamp) as earliest,
                       MAX(timestamp) as latest
                FROM {table}
            """),
            db_sql.execute_statement(f"""
                SELECT type, COUNT(*) as count, ROUND(SUM(amount), 2) as volume
                FROM {table} GROUP BY type ORDER BY count DESC
            """),
            db_sql.execute_statement(f"""
                SELECT status, COUNT(*) as count
                FROM {table} GROUP BY status ORDER BY count DESC
            """),
            db_sql.execute_statement(f"""
                SELECT currency, COUNT(*) as count, ROUND(SUM(amount), 2) as volume
                FROM {table} GROUP BY currency ORDER BY volume DESC
            """),
        )
        return {
            "summary": _parse_result(summary_res),
            "by_type": _parse_result(type_res),
            "by_status": _parse_result(status_res),
            "by_currency": _parse_result(currency_res),
        }
    except Exception as e:
        logger.error(f"Databricks query failed: {e}")
        return {"error": str(e)}


@app.get("/api/history/transactions")
async def history_transactions(limit: int = 50, offset: int = 0):
    """Recent transactions from the Databricks Delta table."""
    if not db_sql.configured:
        return {"error": "Databricks SQL not configured (missing DATABRICKS_WAREHOUSE_ID)"}

    table = db_sql.table_name
    try:
        result, count_result = await asyncio.gather(
            db_sql.execute_statement(f"""
                SELECT id, timestamp, sender, receiver, amount, currency,
                       type, status, category, risk_score
                FROM {table}
                ORDER BY timestamp DESC
                LIMIT {int(limit)} OFFSET {int(offset)}
            """),
            db_sql.execute_statement(f"SELECT COUNT(*) as total FROM {table}"),
        )
        rows = _parse_result(result)
        count_rows = _parse_result(count_result)
        total = int(count_rows[0]["total"]) if count_rows else 0
        return {"transactions": rows, "total": total, "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Databricks query failed: {e}")
        return {"error": str(e)}


@app.post("/api/history/clear")
async def history_clear():
    """Delete all rows from the Databricks Delta table."""
    if not db_sql.configured:
        return {"error": "Databricks SQL not configured (missing DATABRICKS_WAREHOUSE_ID)"}

    table = db_sql.table_name
    try:
        await db_sql.execute_statement(f"DELETE FROM {table}")
        logger.info(f"Cleared all rows from {table}")
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"Failed to clear table: {e}")
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_ws.append(ws)
    logger.info(f"WebSocket client connected ({len(connected_ws)} total)")
    try:
        while True:
            await ws.receive_text()  # keep-alive; we don't expect client msgs
    except WebSocketDisconnect:
        pass
    finally:
        if ws in connected_ws:
            connected_ws.remove(ws)
        logger.info(f"WebSocket client disconnected ({len(connected_ws)} total)")
