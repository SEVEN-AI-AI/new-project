# -*- coding: utf-8 -*-
"""
美客多销售报表解析器
适配后台导出的「销售额」报表（西班牙语/中文/英文表头）。
自动定位表头行，提取：日期 / SKU / 订单号 / 销量 / GMV(USD)。
不依赖任何 API。
"""
import re

# 中文月份（长词在前，避免"十月"匹配到"十一月"的前缀）
_CN_MONTHS = [
    ("十二月", 12), ("十一月", 11), ("十月", 10), ("九月", 9),
    ("八月", 8), ("七月", 7), ("六月", 6), ("五月", 5),
    ("四月", 4), ("三月", 3), ("二月", 2), ("一月", 1),
]
_EN_MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6, "jul": 7,
    "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

# 表头别名（小写匹配，去空格）
HEADER_ALIASES = {
    "date": ["销售日期", "订单日期", "fecha de venta", "sale date", "order date", "date"],
    "sku": ["sku", "商品编码", "卖家sku", "seller sku"],
    "order_id": ["订单号", "order id", "order number", "numero de orden", "id de orden"],
    "qty": ["单位", "数量", "units", "quantity", "unidades"],
    "gmv": ["产品收入 (usd)", "产品收入(usd)", "产品收入", "item revenue",
            "product revenue", "ingreso por producto", "sales", "销售额 (usd)"],
    "net": ["总计 (usd)", "总计(usd)", "total (usd)", "total usd"],
    "title": ["商品标题", "product title", "titulo", "item title"],
    "country": ["国家/地区", "country", "pais"],
}

# 数据列固定位置（中文报表实测：表头第6行，列 C/Y/J/K）
FIXED_COLUMNS = {"date": 3, "sku": 25, "order_id": 2, "qty": 10, "gmv": 11, "net": 19, "title": 27}


def _clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    return "" if s in (" ", "-", "null", "None") else s


def _norm_header(v):
    return re.sub(r"\s+", "", _clean(v)).lower()


def parse_sales_date(value):
    """解析 '十一月 23, 2026 11:21 下午 GMT-06:00' / '2026-11-23' 等格式为 YYYY-MM-DD。"""
    s = _clean(value)
    if not s:
        return ""
    # 纯日期
    m = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", s)
    if m:
        return "%04d-%02d-%02d" % (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    # 中文月份
    for cn, month in _CN_MONTHS:
        m = re.search(cn + r"\s*(\d{1,2})\s*[,，]?\s*(\d{4})", s)
        if m:
            return "%04d-%02d-%02d" % (int(m.group(2)), month, int(m.group(1)))
    # 英文月份
    m = re.search(r"([A-Za-z]+)\s+(\d{1,2})\s*,?\s*(\d{4})", s)
    if m and m.group(1).lower() in _EN_MONTHS:
        return "%04d-%02d-%02d" % (int(m.group(3)), _EN_MONTHS[m.group(1).lower()], int(m.group(2)))
    return ""


def _num(value):
    s = _clean(value).replace(",", "").replace("$", "").replace("US", "").strip()
    if not s:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def find_header_row(rows):
    """在前 15 行里找包含『SKU』和『销售日期/日期』的表头行，返回 (行索引0based, 列映射dict)。"""
    for idx, row in enumerate(rows[:15]):
        cells = [_norm_header(v) for v in row]
        sku_col = None
        date_col = None
        for ci, cell in enumerate(cells):
            for alias in HEADER_ALIASES["sku"]:
                if cell == _norm_header(alias):
                    sku_col = ci
                    break
            if sku_col is not None:
                break
        for ci, cell in enumerate(cells):
            for alias in HEADER_ALIASES["date"]:
                if cell == _norm_header(alias):
                    date_col = ci
                    break
            if date_col is not None:
                break
        if sku_col is not None and date_col is not None:
            mapping = {}
            for key, aliases in HEADER_ALIASES.items():
                for ci, cell in enumerate(cells):
                    if any(cell == _norm_header(a) for a in aliases):
                        mapping[key] = ci
                        break
            return idx, mapping
    return None, {}


def parse_workbook(file_path):
    """
    解析 xlsx 销售报表，返回 (records, meta)。
    records: [{date, sku, order_id, qty, gmv, net, product_name, system_sku}]
    """
    try:
        import openpyxl
    except ImportError:
        raise RuntimeError("服务器缺少 openpyxl，无法解析 Excel")

    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    all_records = []
    sheet_info = []
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        header_idx, mapping = find_header_row(rows)
        if header_idx is None:
            sheet_info.append({"sheet": ws.title, "rows": 0, "note": "未识别到表头"})
            continue
        date_col = mapping.get("date", 0)
        sku_col = mapping.get("sku", 1)
        qty_col = mapping.get("qty")
        gmv_col = mapping.get("gmv")
        net_col = mapping.get("net")
        order_col = mapping.get("order_id")
        title_col = mapping.get("title")

        count = 0
        for row in rows[header_idx + 1:]:
            if not row or date_col >= len(row) or sku_col >= len(row):
                continue
            d = parse_sales_date(row[date_col])
            sku = _clean(row[sku_col])
            if not d or not sku:
                continue
            qty = int(_num(row[qty_col])) if qty_col is not None and qty_col < len(row) else 1
            gmv = _num(row[gmv_col]) if gmv_col is not None and gmv_col < len(row) else 0.0
            net = _num(row[net_col]) if net_col is not None and net_col < len(row) else 0.0
            order_id = _clean(row[order_col]) if order_col is not None and order_col < len(row) else ""
            title = _clean(row[title_col]) if title_col is not None and title_col < len(row) else ""
            all_records.append({
                "date": d,
                "sku": sku,
                "order_id": order_id,
                "qty": qty,
                "gmv": round(gmv, 2),
                "net": round(net, 2),
                "product_name": title,
            })
            count += 1
        sheet_info.append({"sheet": ws.title, "rows": count, "header_row": header_idx + 1})
    wb.close()
    return all_records, {"sheets": sheet_info, "total_rows": len(all_records)}


def aggregate_by_sku(records, target_date=None):
    """
    把订单明细按 SKU 汇总（忽略原始日期差异），同一 SKU 的订单数与 GMV 全部合并。
    target_date: 归集到的日期，默认取报表中的最新日期。
    返回入库记录，每条对应一个 SKU。
    """
    if target_date is None:
        # 归集到报表主日期（最新日期），跨度日期的旧订单一并合并进来
        target_date = max((r.get("date", "") for r in records), default="")
    buckets = {}
    for r in records:
        sku = r["sku"]
        b = buckets.setdefault(sku, {
            "date": target_date, "sku": sku, "system_sku": "",
            "product_name": r.get("product_name", ""),
            "orders": 0, "gmv": 0.0, "net": 0.0,
            "order_ids": set(), "source": "sales_report",
            "dates": set(),
        })
        b["orders"] += int(r.get("qty") or 1)
        b["gmv"] += float(r.get("gmv") or 0)
        b["net"] += float(r.get("net") or 0)
        if r.get("order_id"):
            b["order_ids"].add(r["order_id"])
        if r.get("date"):
            b["dates"].add(r["date"])
    out = []
    for b in buckets.values():
        b["gmv"] = round(b["gmv"], 2)
        b["net"] = round(b["net"], 2)
        b["raw_json"] = {
            "order_ids": sorted(b.pop("order_ids"))[:500],
            "net_usd": b["net"],
            "source_dates": sorted(b.pop("dates")),
        }
        out.append(b)
    return out
