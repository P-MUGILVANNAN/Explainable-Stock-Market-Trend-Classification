from pydantic import BaseModel
from typing import List, Optional

class StockItem(BaseModel):
    symbol: str
    company_name: str
    exchange: Optional[str] = "US"
    created_at: Optional[str] = None

class StockPriceItem(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: float

class StockHistoryResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    count: int
    data: List[StockPriceItem]

class StockFetchRequest(BaseModel):
    period: Optional[str] = "2y"  # e.g., 1y, 2y, 5y, max
    interval: Optional[str] = "1d"  # 1d, 1wk, 1mo
    start_date: Optional[str] = None
    end_date: Optional[str] = None

