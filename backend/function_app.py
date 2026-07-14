"""
Nutritional Insights - Azure Function App (Phase 2)
CPSY 300 - Cloud Computing for Software Development

Three HTTP endpoints, all reading All_Diets.csv from Azure Blob Storage (cloud):
  GET /api/insights   -> average macros per diet type + nutrient correlation matrix
  GET /api/recipes    -> paginated recipe list + recipe distribution by diet type
  GET /api/clusters   -> KMeans clustering of recipes by macro profile (for scatter plot)

Shared query params (all optional, apply to every endpoint):
  diet    -> filter to a single Diet_type (e.g. ?diet=keto)
  search  -> case-insensitive substring match on Recipe_name
Extra params for /api/recipes:
  page       -> 1-based page number (default 1)
  page_size  -> rows per page (default 10, max 100)
Extra param for /api/clusters:
  k          -> number of clusters (default 4)
"""

import azure.functions as func
import logging
import os
import io
import json
import time

import pandas as pd
import numpy as np

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

MACROS = ["Protein(g)", "Carbs(g)", "Fat(g)"]

# Loaded once per worker instance, then cached (keeps cold requests cheap).
_df_cache = None


def load_data() -> pd.DataFrame:
    """Download All_Diets.csv from Azure Blob Storage and clean it (cached)."""
    global _df_cache
    if _df_cache is not None:
        return _df_cache

    from azure.storage.blob import BlobServiceClient

    conn = os.environ.get("DATA_STORAGE_CONNECTION") or os.environ.get("AzureWebJobsStorage")
    if not conn:
        raise RuntimeError("No storage connection string set (DATA_STORAGE_CONNECTION).")

    container = os.environ.get("DATA_CONTAINER", "datasets")
    blob_name = os.environ.get("DATA_BLOB", "All_Diets.csv")

    client = BlobServiceClient.from_connection_string(conn)
    stream = client.get_container_client(container).get_blob_client(blob_name).download_blob().readall()
    df = pd.read_csv(io.BytesIO(stream))

    # Clean: coerce macros to numeric, fill any gaps with the column mean (same as Phase 1).
    for col in MACROS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].fillna(df[col].mean())

    _df_cache = df
    return df


def apply_filters(df: pd.DataFrame, req: func.HttpRequest) -> pd.DataFrame:
    """Apply the shared diet + search filters."""
    diet = (req.params.get("diet") or "").strip().lower()
    search = (req.params.get("search") or "").strip().lower()

    if diet and diet != "all":
        df = df[df["Diet_type"].str.lower() == diet]
    if search:
        df = df[df["Recipe_name"].str.lower().str.contains(search, na=False)]
    return df


def json_response(payload: dict, start: float, status: int = 200) -> func.HttpResponse:
    """Wrap a dict as JSON with execution-time metadata + permissive CORS."""
    payload["_meta"] = {
        "execution_ms": round((time.perf_counter() - start) * 1000, 2),
        "source": "Azure Function",
    }
    return func.HttpResponse(
        json.dumps(payload),
        status_code=status,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )


@app.route(route="insights", methods=["GET"])
def insights(req: func.HttpRequest) -> func.HttpResponse:
    """Average macros per diet type (bar chart) + nutrient correlations (heatmap)."""
    start = time.perf_counter()
    try:
        df = apply_filters(load_data(), req)

        avg = df.groupby("Diet_type")[MACROS].mean().round(2)
        avg_records = [
            {"diet_type": idx, "protein": row["Protein(g)"], "carbs": row["Carbs(g)"], "fat": row["Fat(g)"]}
            for idx, row in avg.iterrows()
        ]

        corr = df[MACROS].corr().round(3)
        corr_matrix = {
            "labels": ["Protein", "Carbs", "Fat"],
            "values": corr.values.tolist(),
        }

        return json_response(
            {
                "diet_types": sorted(df["Diet_type"].unique().tolist()),
                "avg_macros": avg_records,
                "correlation": corr_matrix,
                "recipe_count": int(len(df)),
            },
            start,
        )
    except Exception as e:
        logging.exception("insights failed")
        return json_response({"error": str(e)}, start, status=500)


@app.route(route="recipes", methods=["GET"])
def recipes(req: func.HttpRequest) -> func.HttpResponse:
    """Paginated recipe list (table) + recipe distribution by diet type (pie chart)."""
    start = time.perf_counter()
    try:
        df = apply_filters(load_data(), req)

        # Distribution is computed BEFORE pagination so the pie reflects the whole filtered set.
        distribution = [
            {"diet_type": k, "count": int(v)}
            for k, v in df["Diet_type"].value_counts().sort_index().items()
        ]

        try:
            page = max(1, int(req.params.get("page", 1)))
        except ValueError:
            page = 1
        try:
            page_size = min(100, max(1, int(req.params.get("page_size", 10))))
        except ValueError:
            page_size = 10

        total = len(df)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start_i = (page - 1) * page_size
        page_df = df.iloc[start_i:start_i + page_size]

        rows = [
            {
                "diet_type": r["Diet_type"],
                "recipe_name": r["Recipe_name"],
                "cuisine_type": r["Cuisine_type"],
                "protein": round(float(r["Protein(g)"]), 2),
                "carbs": round(float(r["Carbs(g)"]), 2),
                "fat": round(float(r["Fat(g)"]), 2),
            }
            for _, r in page_df.iterrows()
        ]

        return json_response(
            {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
                "distribution": distribution,
                "recipes": rows,
            },
            start,
        )
    except Exception as e:
        logging.exception("recipes failed")
        return json_response({"error": str(e)}, start, status=500)


@app.route(route="clusters", methods=["GET"])
def clusters(req: func.HttpRequest) -> func.HttpResponse:
    """KMeans clustering on macro profile -> points for the protein-vs-carbs scatter plot."""
    start = time.perf_counter()
    try:
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import KMeans

        df = apply_filters(load_data(), req).copy()

        try:
            k = min(8, max(2, int(req.params.get("k", 4))))
        except ValueError:
            k = 4

        X = StandardScaler().fit_transform(df[MACROS].values)
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        df["cluster"] = km.fit_predict(X)

        # Scatter payload stays light: sample up to 600 points but keep every cluster represented.
        sample = df.sample(n=min(600, len(df)), random_state=42) if len(df) > 600 else df

        points = [
            {
                "protein": round(float(r["Protein(g)"]), 2),
                "carbs": round(float(r["Carbs(g)"]), 2),
                "fat": round(float(r["Fat(g)"]), 2),
                "cluster": int(r["cluster"]),
                "diet_type": r["Diet_type"],
                "recipe_name": r["Recipe_name"],
            }
            for _, r in sample.iterrows()
        ]

        # Cluster centers back in real units, for labelling.
        centers = StandardScaler().fit(df[MACROS].values).inverse_transform(km.cluster_centers_)
        center_records = [
            {"cluster": i, "protein": round(float(c[0]), 2), "carbs": round(float(c[1]), 2), "fat": round(float(c[2]), 2)}
            for i, c in enumerate(centers)
        ]

        return json_response(
            {"k": k, "points": points, "centers": center_records, "total_clustered": int(len(df))},
            start,
        )
    except Exception as e:
        logging.exception("clusters failed")
        return json_response({"error": str(e)}, start, status=500)
