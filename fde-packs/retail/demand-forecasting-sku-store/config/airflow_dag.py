"""Airflow DAG skeleton for the nightly forecast. Each task is idempotent and keyed by the run date, so a re-run overwrites nothing and duplicates nothing.
Adapt the operators to the customer's orchestrator (Airflow, Dagster, Control-M, Azure Data Factory, AWS Step Functions)."""
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.sensors.python import PythonSensor

default_args = {"retries": 2, "retry_delay": timedelta(minutes=10), "sla": timedelta(hours=5)}

with DAG("sku_store_forecast", start_date=datetime(2026, 1, 1), schedule="0 1 * * *", catchup=False, default_args=default_args, max_active_runs=1) as dag:
    wait_sales = PythonSensor(task_id="wait_sales_manifest", python_callable=lambda ds, **_: manifest_exists(f"inputs/{ds}/sales/_SUCCESS"), poke_interval=300, timeout=4 * 3600)
    wait_stock = PythonSensor(task_id="wait_stock_manifest", python_callable=lambda ds, **_: manifest_exists(f"inputs/{ds}/stock/_SUCCESS"), poke_interval=300, timeout=4 * 3600)
    reconcile_master = PythonOperator(task_id="reconcile_master_data", python_callable=lambda ds, **_: reconcile(ds))
    forecast = PythonOperator(task_id="forecast_and_publish", python_callable=lambda ds, **_: run_nightly_for(ds))
    notify = PythonOperator(task_id="notify_replenishment", python_callable=lambda ds, **_: notify_planning(ds))
    [wait_sales, wait_stock] >> reconcile_master >> forecast >> notify
