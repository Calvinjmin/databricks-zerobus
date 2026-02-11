import asyncio
import os
import time
import logging

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class DatabricksSQLClient:
    """Thin wrapper around the Databricks SQL Statement Execution REST API."""

    def __init__(self):
        self.workspace_url = os.getenv("DATABRICKS_WORKSPACE_URL", "").rstrip("/")
        self.client_id = os.getenv("DATABRICKS_CLIENT_ID", "")
        self.client_secret = os.getenv("DATABRICKS_CLIENT_SECRET", "")
        self.warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID", "")
        self.table_name = os.getenv(
            "DATABRICKS_TABLE", "main.default.financial_transactions"
        )
        self._token: str | None = None
        self._token_expiry: float = 0

    @property
    def configured(self) -> bool:
        return bool(
            self.workspace_url
            and self.client_id
            and self.client_secret
            and self.warehouse_id
        )

    async def _get_token(self) -> str:
        """Get or refresh an OAuth2 token using client_credentials grant."""
        if self._token and time.time() < self._token_expiry - 60:
            return self._token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.workspace_url}/oidc/v1/token",
                data={"grant_type": "client_credentials", "scope": "all-apis"},
                auth=(self.client_id, self.client_secret),
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            self._token_expiry = time.time() + data.get("expires_in", 3600)
            return self._token

    async def execute_statement(self, sql: str) -> dict:
        """Execute a SQL statement via the Statement Execution API.

        Returns the raw API response dict.  For small result sets the data
        comes back inline; for larger ones we poll until SUCCEEDED.
        """
        token = await self._get_token()
        url = f"{self.workspace_url}/api/2.0/sql/statements"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "statement": sql,
            "warehouse_id": self.warehouse_id,
            "wait_timeout": "30s",
            "on_wait_timeout": "CONTINUE",
            "format": "JSON_ARRAY",
            "disposition": "INLINE",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()

            statement_id = result.get("statement_id")
            status = result.get("status", {}).get("state")

            poll_count = 0
            while status in ("PENDING", "RUNNING") and poll_count < 30:
                await asyncio.sleep(1)
                poll_resp = await client.get(
                    f"{url}/{statement_id}", headers=headers
                )
                poll_resp.raise_for_status()
                result = poll_resp.json()
                status = result.get("status", {}).get("state")
                poll_count += 1

            if status == "FAILED":
                error = result.get("status", {}).get("error", {})
                raise RuntimeError(f"SQL statement failed: {error}")

            return result
