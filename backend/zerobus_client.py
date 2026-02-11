import os
import asyncio
import logging
import time
from collections import deque
from typing import Optional
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class IngestionMetrics:
    """Track ingestion performance metrics."""
    total_ingested: int = 0
    total_failed: int = 0
    pending_acks: int = 0
    avg_latency_ms: float = 0.0
    _latency_samples: deque = field(default_factory=lambda: deque(maxlen=1000))  # Increased for better percentiles


class ZeroBusClient:
    """Wrapper around the Databricks ZeroBus Ingest SDK with async batch processing."""

    def __init__(self):
        self._stream = None
        self._sdk = None
        self.endpoint = os.getenv("ZEROBUS_ENDPOINT", "")
        self.workspace_url = os.getenv("DATABRICKS_WORKSPACE_URL", "")
        self.client_id = os.getenv("DATABRICKS_CLIENT_ID", "")
        self.client_secret = os.getenv("DATABRICKS_CLIENT_SECRET", "")
        self.table_name = os.getenv("DATABRICKS_TABLE", "main.default.financial_transactions")
        
        # Async ACK tracking
        self._ack_queue: Optional[asyncio.Queue] = None
        self._ack_worker_task: Optional[asyncio.Task] = None
        self._running = False
        
        # Metrics
        self.metrics = IngestionMetrics()

    def connect(self) -> bool:
        """Initialize the SDK and create an ingestion stream."""
        if not all([self.endpoint, self.workspace_url, self.client_id, self.client_secret]):
            logger.warning(
                "ZeroBus credentials not configured — running in demo mode (no ingestion)"
            )
            return False

        try:
            from zerobus.sdk.sync import ZerobusSdk
            from zerobus.sdk.shared import (
                RecordType,
                StreamConfigurationOptions,
                TableProperties,
            )

            self._sdk = ZerobusSdk(self.endpoint, self.workspace_url)

            table_properties = TableProperties(self.table_name)
            options = StreamConfigurationOptions(record_type=RecordType.JSON)
            self._stream = self._sdk.create_stream(
                self.client_id, self.client_secret, table_properties, options
            )
            logger.info("ZeroBus stream created successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to ZeroBus: {e}")
            self._stream = None
            return False

    async def start_ack_worker(self):
        """Start background worker to handle ACKs asynchronously."""
        if self._stream is None or self._running:
            return False
            
        self._ack_queue = asyncio.Queue()
        self._running = True
        self._ack_worker_task = asyncio.create_task(self._ack_worker())
        logger.info("Started background ACK worker for non-blocking ingestion")
        return True

    async def _ack_worker(self):
        """Background worker that waits for ACKs without blocking ingestion."""
        while self._running:
            try:
                ack_data = await asyncio.wait_for(self._ack_queue.get(), timeout=1.0)
                ack, submit_time = ack_data
                self.metrics.pending_acks += 1
                
                try:
                    await asyncio.to_thread(ack.wait_for_ack)
                    elapsed_ms = (time.time() - submit_time) * 1000
                    self.metrics.total_ingested += 1
                    self.metrics.pending_acks -= 1
                    
                    self.metrics._latency_samples.append(elapsed_ms)
                    if self.metrics._latency_samples:
                        self.metrics.avg_latency_ms = (
                            sum(self.metrics._latency_samples) / len(self.metrics._latency_samples)
                        )
                except Exception as e:
                    logger.error(f"ACK wait failed: {e}")
                    self.metrics.total_failed += 1
                    self.metrics.pending_acks -= 1
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"ACK worker error: {e}")

    async def ingest_async(self, record: dict) -> bool:
        """Ingest a record without waiting for ACK (fire-and-forget)."""
        if self._stream is None:
            return False
        try:
            ack = self._stream.ingest_record(record)
            if self._ack_queue:
                await self._ack_queue.put((ack, time.time()))
            return True
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            self.metrics.total_failed += 1
            return False

    def ingest(self, record: dict) -> bool:
        """Synchronous ingest (kept for backward compatibility)."""
        if self._stream is None:
            return False
        try:
            ack = self._stream.ingest_record(record)
            ack.wait_for_ack()
            return True
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            return False

    def get_metrics(self) -> dict:
        """Get current ingestion performance metrics."""
        samples = list(self.metrics._latency_samples)
        samples_sorted = sorted(samples) if samples else []
        
        def percentile(p: float) -> float:
            if not samples_sorted:
                return 0.0
            idx = int(len(samples_sorted) * p)
            idx = min(idx, len(samples_sorted) - 1)
            return samples_sorted[idx]
        
        return {
            "total_ingested": self.metrics.total_ingested,
            "total_failed": self.metrics.total_failed,
            "pending_acks": self.metrics.pending_acks,
            "avg_latency_ms": round(self.metrics.avg_latency_ms, 2),
            "min_latency_ms": round(samples_sorted[0] if samples_sorted else 0, 2),
            "max_latency_ms": round(samples_sorted[-1] if samples_sorted else 0, 2),
            "p50_latency_ms": round(percentile(0.50), 2),
            "p95_latency_ms": round(percentile(0.95), 2),
            "p99_latency_ms": round(percentile(0.99), 2),
            "queue_size": self._ack_queue.qsize() if self._ack_queue else 0,
        }

    async def stop_ack_worker(self):
        """Stop the ACK worker."""
        if not self._running:
            return
        self._running = False
        if self._ack_worker_task:
            self._ack_worker_task.cancel()
            try:
                await self._ack_worker_task
            except asyncio.CancelledError:
                pass
        self._ack_worker_task = None
        logger.info("ACK worker stopped")

    def close(self):
        """Flush and close the stream."""
        if self._stream is not None:
            try:
                self._stream.close()
                logger.info("ZeroBus stream closed")
            except Exception as e:
                logger.error(f"Error closing ZeroBus stream: {e}")
            finally:
                self._stream = None
                self._sdk = None
