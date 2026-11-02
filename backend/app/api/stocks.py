from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from app.database.connection import get_db
from app.schemas.stock import StockItem, StockPriceItem, StockHistoryResponse, StockFetchRequest
from app.ml.data_collection.stock_collector import StockCollector

router = APIRouter(prefix="/stocks", tags=["Stock Market Data"])
collector = StockCollector()

@router.get("", response_model=List[StockItem])
def list_stocks():
    db = get_db()
    stocks = list(db.stocks.find({}, {"_id": 0}))
    return stocks

@router.get("/{symbol}")
def get_stock(symbol: str):
    db = get_db()
    stock = db.stocks.find_one({"symbol": symbol.upper()}, {"_id": 0})
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock symbol {symbol.upper()} not found")
    return stock

@router.get("/{symbol}/history", response_model=StockHistoryResponse)
def get_stock_history(
    symbol: str,
    period: str = Query("1y", description="1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    interval: str = Query("1d", description="1d, 1wk, 1mo"),
    limit: Optional[int] = Query(None, description="Limit rows returned")
):
    symbol = symbol.upper()
    df = collector.fetch_historical_prices(symbol, period=period, interval=interval)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No price history found for {symbol}")

    if limit and limit > 0:
        df = df.tail(limit)

    records = []
    for _, row in df.iterrows():
        d_str = row["date"].strftime("%Y-%m-%d") if hasattr(row["date"], "strftime") else str(row["date"])[:10]
        records.append({
            "date": d_str,
            "open": round(float(row["open"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "close": round(float(row["close"]), 2),
            "adjusted_close": round(float(row["adjusted_close"]), 2),
            "volume": float(row["volume"])
        })

    db = get_db()
    stock_meta = db.stocks.find_one({"symbol": symbol}) or {}

    return {
        "symbol": symbol,
        "company_name": stock_meta.get("company_name", symbol),
        "count": len(records),
        "data": records
    }

@router.post("/{symbol}/fetch")
def refresh_stock_data(symbol: str, req: StockFetchRequest):
    symbol = symbol.upper()
    df = collector.fetch_historical_prices(
        symbol=symbol,
        period=req.period or "2y",
        interval=req.interval or "1d",
        start_date=req.start_date,
        end_date=req.end_date,
        force_refresh=True
    )
    if df.empty:
        raise HTTPException(status_code=400, detail=f"Failed to fetch updated prices for {symbol}")
    return {"message": f"Successfully updated {len(df)} records for {symbol}", "count": len(df)}

@router.post("/{symbol}/upload-csv")
async def upload_stock_csv(symbol: str, file: UploadFile = File(...)):
    symbol = symbol.upper()
    try:
        content = await file.read()
        import io
        df = collector.load_from_csv(io.BytesIO(content), symbol)
        return {"message": f"Successfully loaded {len(df)} rows from CSV for {symbol}", "count": len(df)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

