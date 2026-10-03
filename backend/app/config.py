"""
config.py
------------------------------------------------------------------
Central place for every setting the backend needs, all loaded from
environment variables (see .env.example). Nothing here should ever
be hardcoded secrets - copy .env.example to .env and fill in real
values locally; .env is git-ignored.
------------------------------------------------------------------
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database -------------------------------------------------
    # Defaults to a local SQLite file so the team can run this with
    # zero setup. Swap DATABASE_URL for a real Postgres URL later,
    # e.g. postgresql://user:password@localhost:5432/content_auth
    database_url: str = "sqlite:///./content_authenticity.db"

    # --- Original photo storage ------------------------------------
    # Where uploaded original photos are saved on disk. In a real
    # deployment this could be swapped for S3/R2/Drive - see
    # app/storage.py for where that swap would happen.
    storage_dir: str = "./storage_data"

    # --- Blockchain --------------------------------------------------
    # RPC endpoint for whichever testnet you deployed HashRegistry to
    # (Sepolia or Polygon Amoy) - same value you used in
    # blockchain/.env's SEPOLIA_RPC_URL / AMOY_RPC_URL.
    web3_rpc_url: str = ""
    # Address printed by `npm run deploy:sepolia` (or :amoy) in the
    # blockchain/ project.
    contract_address: str = ""
    # Private key of the backend's own wallet, used to *sign and pay
    # for* registerHash() transactions. Use a burner/test wallet only.
    backend_wallet_private_key: str = ""
    # Master switch: while false, the backend stores captures in the
    # database only and skips blockchain writes entirely. Flip this on
    # once blockchain/ is deployed and the three values above are set.
    blockchain_enabled: bool = False

    # --- Misc ---------------------------------------------------------
    # Comma-separated list of origins allowed to call this API from a
    # browser (the verification web page). "*" is fine for a capstone
    # demo, tighten it for anything real.
    cors_allow_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
