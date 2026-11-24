# -*- coding: utf-8 -*-
"""
店铺数据看板 API（Flask Blueprint）
- SKU 日维度订单表 sku_orders：日期 / 店铺 / SKU / 商品名 / 订单数 / GMV
- 导入批次表 order_imports
- 汇总接口：SKU 当日出单、单 SKU 对比、店铺整体（日/周/月 + 环比同比）
不依赖任何旧 API / 旧店铺凭证。
"""
import json
import os
import re
import sqlite3
import tempfile
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request

DB_PATH = None  # 由 register_dashboard_api 注入
STORE_CANONICAL = "跨境1店"
STORE_ALIASES = (STORE_CANONICAL, "\uc69c\uc4f11\ub4e6")

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_dashboard_tables(db_path):
    global DB_PATH
    DB_PATH = db_path
    conn = _db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sku_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            store TEXT NOT NULL DEFAULT '',
            sku TEXT NOT NULL,
            system_sku TEXT DEFAULT '',
            product_name TEXT DEFAULT '',
            orders INTEGER DEFAULT 0,
            gmv REAL DEFAULT 0,
            source TEXT DEFAULT 'import',
            raw_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, store, sku)
        );
        CREATE INDEX IF NOT EXISTS idx_sku_orders_date ON sku_orders(date);
        CREATE INDEX IF NOT EXISTS idx_sku_orders_sku ON sku_orders(sku);

        /* 广告数据表：服务器新库可能缺失，此处兜底创建，避免总览接口 500 */
        CREATE TABLE IF NOT EXISTS imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            record_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'success',
            note TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS ad_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            site TEXT DEFAULT '',
            store TEXT DEFAULT '',
            campaign TEXT DEFAULT '',
            ad_group TEXT DEFAULT '',
            product_sku TEXT DEFAULT '',
            product_name TEXT DEFAULT '',
            keyword TEXT DEFAULT '',
            ad_type TEXT DEFAULT '',
            impressions INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            spend REAL DEFAULT 0,
            orders INTEGER DEFAULT 0,
            sales REAL DEFAULT 0,
            raw_json TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ad_records_sku ON ad_records(product_sku);
        CREATE INDEX IF NOT EXISTS idx_ad_records_date ON ad_records(date);

        CREATE TABLE IF NOT EXISTS order_imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source_file TEXT DEFAULT '',
            record_count INTEGER DEFAULT 0,
            date_from TEXT DEFAULT '',
            date_to TEXT DEFAULT '',
            status TEXT DEFAULT 'success',
            note TEXT DEFAULT ''
        );
    """)
    conn.commit()
    conn.close()


def _norm_date(value):
    s = str(value or "").strip()
    if not s:
        return ""
    m = re.match(r"^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})", s)
    if m:
        return "%04d-%02d-%02d" % (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return s[:10]


def _norm_store(value):
    s = str(value or "").strip()
    return STORE_CANONICAL if s in STORE_ALIASES or not s else s


def _fnum(value, default=0.0):
    if value is None or value == "":
        return default
    s = str(value).replace(",", "").replace("$", "").replace("US", "").strip()
    try:
        return float(s)
    except (ValueError, TypeError):
        return default


def _store_expr(alias=""):
    prefix = (alias + ".") if alias else ""
    return "CASE WHEN %sstore IN (?, ?) THEN ? ELSE %sstore END" % (prefix, prefix)


def _store_params():
    return [STORE_ALIASES[0], STORE_ALIASES[1], STORE_CANONICAL]


@dashboard_bp.route("/meta", methods=["GET"])
def meta():
    conn = _db()
    stores = [r[0] for r in conn.execute(
        "SELECT DISTINCT %s AS s FROM sku_orders ORDER BY s" % _store_expr(), _store_params()
    ).fetchall()]
    skus = [r[0] for r in conn.execute(
        "SELECT DISTINCT sku FROM sku_orders WHERE sku <> '' ORDER BY sku"
    ).fetchall()]
    dates = [r[0] for r in conn.execute(
        "SELECT DISTINCT date FROM sku_orders ORDER BY date DESC"
    ).fetchall()]
    ad_dates = [r[0] for r in conn.execute(
        "SELECT DISTINCT date FROM ad_records ORDER BY date DESC LIMIT 1"
    ).fetchall()]
    conn.close()
    return jsonify({
        "stores": stores,
        "skus": skus,
        "dates": dates,
        "latest_date": dates[0] if dates else "",
        "latest_ad_date": ad_dates[0] if ad_dates else "",
        "order_count": len(dates),
    })


@dashboard_bp.route("/import", methods=["POST"])
def import_orders():
    """导入 SKU 订单数据。body: {records:[{date,store,sku,orders,gmv,...}], source_file}"""
    data = request.get_json(silent=True) or {}
    records = data.get("records")
    if not isinstance(records, list):
        return jsonify({"ok": False, "error": "records 必须是数组"}), 400
    conn = _db()
    ok_count = 0
    skipped = 0
    date_from, date_to = "", ""
    for rec in records:
        if not isinstance(rec, dict):
            skipped += 1
            continue
        d = _norm_date(rec.get("date"))
        sku = str(rec.get("sku") or "").strip()
        if not d or not sku:
            skipped += 1
            continue
        store = _norm_store(rec.get("store"))
        orders = int(_fnum(rec.get("orders")))
        gmv = _fnum(rec.get("gmv"))
        system_sku = str(rec.get("system_sku") or "").strip()
        product_name = str(rec.get("product_name") or "").strip()
        raw = rec.get("raw_json")
        raw_json = json.dumps(raw, ensure_ascii=False) if isinstance(raw, (dict, list)) else str(raw or "{}")
        source = str(rec.get("source") or data.get("source") or "import")
        conn.execute("""
            INSERT INTO sku_orders
                (date, store, sku, system_sku, product_name, orders, gmv, source, raw_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(date, store, sku) DO UPDATE SET
                system_sku = excluded.system_sku,
                product_name = excluded.product_name,
                orders = excluded.orders,
                gmv = excluded.gmv,
                source = excluded.source,
                raw_json = excluded.raw_json,
                updated_at = CURRENT_TIMESTAMP
        """, (d, store, sku, system_sku, product_name, orders, gmv, source, raw_json))
        ok_count += 1
        if not date_from or d < date_from:
            date_from = d
        if not date_to or d > date_to:
            date_to = d
    conn.execute("""
        INSERT INTO order_imports
            (source_file, record_count, date_from, date_to, status, note)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        str(data.get("source_file") or ""), ok_count, date_from, date_to,
        "success", str(data.get("note") or ""),
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "count": ok_count, "skipped": skipped,
                    "date_from": date_from, "date_to": date_to})


@dashboard_bp.route("/import-file", methods=["POST"])
def import_file():
    """上传美客多销售报表（xlsx），自动解析并按 SKU 汇总入库。"""
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"ok": False, "error": "未收到文件"}), 400
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".xlsx", ".xlsm"):
        return jsonify({"ok": False, "error": "仅支持 .xlsx / .xlsm 文件"}), 400
    tmp_path = None
    try:
        import sales_report_parser as srp
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name
        detail, parse_meta = srp.parse_workbook(tmp_path)
        if not detail:
            return jsonify({"ok": False, "error": "未解析到订单数据", "meta": parse_meta}), 400
        records = srp.aggregate_by_sku(detail)
        imp_store = _norm_store(request.form.get("store"))
        # 复用入库逻辑
        conn = _db()
        date_from = min(r["date"] for r in records)
        date_to = max(r["date"] for r in records)
        for rec in records:
            conn.execute("""
                INSERT INTO sku_orders
                    (date, store, sku, system_sku, product_name, orders, gmv, source, raw_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(date, store, sku) DO UPDATE SET
                    system_sku = excluded.system_sku,
                    product_name = excluded.product_name,
                    orders = excluded.orders,
                    gmv = excluded.gmv,
                    source = excluded.source,
                    raw_json = excluded.raw_json,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                rec["date"], imp_store,
                rec["sku"], rec.get("system_sku", ""), rec.get("product_name", ""),
                int(rec["orders"]), float(rec["gmv"]), "sales_report",
                json.dumps(rec.get("raw_json", {}), ensure_ascii=False),
            ))
        conn.execute("""
            INSERT INTO order_imports
                (source_file, record_count, date_from, date_to, status, note)
            VALUES (?, ?, ?, ?, 'success', ?)
        """, (file.filename[:200], len(records), date_from, date_to,
              "店铺 %s · 明细 %d 行 → SKU 汇总 %d 条" % (imp_store, parse_meta["total_rows"], len(records))))
        conn.commit()

        # 直接返回当日汇总，前端可立即展示
        latest = date_to
        rows = conn.execute("""
            SELECT %s AS store, sku, product_name, SUM(orders) AS orders, SUM(gmv) AS gmv
            FROM sku_orders WHERE date = ? GROUP BY sku ORDER BY gmv DESC
        """ % _store_expr(), _store_params() + [latest]).fetchall()
        conn.close()
        return jsonify({
            "ok": True, "imported": len(records), "detail_rows": parse_meta["total_rows"],
            "date_from": date_from, "date_to": date_to,
            "latest_date": latest,
            "summary": {"orders": sum(int(r["orders"]) for r in rows),
                        "gmv": round(sum(float(r["gmv"] or 0) for r in rows), 2),
                        "skus": len(rows)},
            "meta": parse_meta,
        })
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


@dashboard_bp.route("/imports", methods=["GET"])
def list_imports():
    conn = _db()
    rows = conn.execute("SELECT * FROM order_imports ORDER BY id DESC LIMIT 50").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@dashboard_bp.route("/orders", methods=["DELETE"])
def delete_orders():
    """清理数据。source=demo 时只删演示数据；confirm=all 时清空全部。"""
    source = request.args.get("source", "")
    confirm = request.args.get("confirm", "")
    conn = _db()
    if confirm == "all":
        cur = conn.execute("DELETE FROM sku_orders")
    elif source:
        cur = conn.execute("DELETE FROM sku_orders WHERE source = ?", (source,))
    else:
        conn.close()
        return jsonify({"ok": False, "error": "请指定 source 或 confirm=all"}), 400
    n = cur.rowcount
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "deleted": n})


@dashboard_bp.route("/demo", methods=["POST"])
def make_demo():
    """从 ad_records 生成演示订单数据（source=demo），仅用于看板演示，可一键清除。"""
    conn = _db()
    rows = conn.execute("""
        SELECT r.date, r.store, r.product_sku, r.product_name,
               r.orders, r.sales, r.spend,
               COALESCE(m.product_model, r.product_sku) AS model
        FROM ad_records r
        LEFT JOIN sku_mappings m
          ON m.store IN (?, ?) AND m.system_sku = r.product_sku
        ORDER BY r.date, r.product_sku
    """, STORE_ALIASES).fetchall()
    count = 0
    for r in rows:
        d = _norm_date(r["date"])
        sku = r["model"] or r["product_sku"]
        if not d or not sku:
            continue
        # 演示：广告出单当作订单，广告销售额当作 GMV；补一点自然单让曲线更真实
        demo_orders = int(r["orders"] or 0)
        demo_gmv = float(r["sales"] or 0)
        if demo_orders == 0 and demo_gmv == 0:
            continue
        conn.execute("""
            INSERT INTO sku_orders
                (date, store, sku, system_sku, product_name, orders, gmv, source, raw_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'demo', '{}', CURRENT_TIMESTAMP)
            ON CONFLICT(date, store, sku) DO UPDATE SET
                orders = excluded.orders, gmv = excluded.gmv,
                product_name = excluded.product_name, updated_at = CURRENT_TIMESTAMP
        """, (d, _norm_store(r["store"]), sku, r["product_sku"], r["product_name"],
              demo_orders, demo_gmv))
        count += 1
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "count": count})


def _period_bounds(anchor, period):
    try:
        d = datetime.strptime(anchor, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        d = datetime.now().date()
    if period == "week":
        start = d - timedelta(days=d.weekday())
        return start, start + timedelta(days=6)
    if period == "month":
        start = d.replace(day=1)
        end = (start.replace(year=start.year + 1, month=1) if start.month == 12
               else start.replace(month=start.month + 1)) - timedelta(days=1)
        return start, end
    return d, d


def _prev_period(start, end, period, mode="mom"):
    if mode == "yoy":
        if period == "month":
            return start.replace(year=start.year - 1), end.replace(year=end.year - 1)
        # 日/周：按 364 天对齐星期
        return start - timedelta(days=364), end - timedelta(days=364)
    # 环比
    if period == "day":
        return start - timedelta(days=1), end - timedelta(days=1)
    span = (end - start).days + 1
    return start - timedelta(days=span), start - timedelta(days=1)


def _aggregate(conn, start, end, store):
    where = ["date >= ?", "date <= ?"]
    params = [start.isoformat(), end.isoformat()]
    if store:
        where.append("%s = ?" % _store_expr())
        params.extend(_store_params() + [store])
    w = " AND ".join(where)
    row = conn.execute("""
        SELECT SUM(orders) AS orders, SUM(gmv) AS gmv, COUNT(DISTINCT sku) AS skus
        FROM sku_orders WHERE %s
    """ % w, params).fetchone()
    orders = int(row["orders"] or 0)
    gmv = float(row["gmv"] or 0)

    ad_where = ["date >= ?", "date <= ?"]
    ad_params = [start.isoformat(), end.isoformat()]
    if store:
        ad_where.append("%s = ?" % _store_expr("r"))
        ad_params.extend(_store_params() + [store])
    adw = " AND ".join(ad_where)
    ad = conn.execute("""
        SELECT SUM(spend) AS spend, SUM(sales) AS ad_gmv, SUM(orders) AS ad_orders
        FROM ad_records r WHERE %s
    """ % adw, ad_params).fetchone()
    spend = float(ad["spend"] or 0)
    ad_gmv = float(ad["ad_gmv"] or 0)
    return {
        "gmv": round(gmv, 2),
        "orders": orders,
        "skus": int(row["skus"] or 0),
        "ad_spend": round(spend, 2),
        "ad_gmv": round(ad_gmv, 2),
        "roi": round(gmv / spend, 2) if spend > 0 else None,
        "tacos": round(spend / gmv * 100, 2) if gmv > 0 else None,
        "ad_share": round(ad_gmv / gmv * 100, 2) if gmv > 0 else None,
    }


def _delta(current, previous, key):
    c, p = current.get(key), previous.get(key)
    if c is None or p in (None, 0):
        return None
    return round((c - p) / abs(p) * 100, 1)


@dashboard_bp.route("/overview", methods=["GET"])
def overview():
    period = request.args.get("period", "day")
    anchor = request.args.get("date", "").strip()
    store = request.args.get("store", "").strip()
    conn = _db()
    if not anchor:
        r = conn.execute("SELECT MAX(date) AS d FROM sku_orders").fetchone()
        anchor = r["d"] if r and r["d"] else datetime.now().strftime("%Y-%m-%d")
    start, end = _period_bounds(anchor, period)
    current = _aggregate(conn, start, end, store)

    result = {
        "period": period, "anchor": anchor,
        "start": start.isoformat(), "end": end.isoformat(),
        "current": current,
        "mom": {}, "yoy": {}, "delta": {},
    }
    for mode in ("mom", "yoy"):
        ps, pe = _prev_period(start, end, period, mode)
        prev = _aggregate(conn, ps, pe, store)
        result[mode] = prev
        result["delta"][mode] = {
            k: _delta(current, prev, k) for k in ("gmv", "orders", "ad_spend", "roi", "tacos")
        }

    # 趋势序列（当前周期内按天）
    daily = []
    cur = start
    while cur <= end and len(daily) < 400:
        d = _aggregate(conn, cur, cur, store)
        d["date"] = cur.isoformat()
        daily.append(d)
        cur += timedelta(days=1)
    result["daily"] = daily
    conn.close()
    return jsonify(result)


@dashboard_bp.route("/sku-orders", methods=["GET"])
def sku_orders():
    date_str = request.args.get("date", "").strip()
    store = request.args.get("store", "").strip()
    conn = _db()
    if not date_str:
        r = conn.execute("SELECT MAX(date) AS d FROM sku_orders").fetchone()
        date_str = r["d"] if r and r["d"] else ""
    where = ["date = ?"]
    params = [date_str]
    if store:
        where.append("%s = ?" % _store_expr())
        params.extend(_store_params() + [store])
    w = " AND ".join(where)
    rows = conn.execute("""
        SELECT date, %s AS store, sku, system_sku, product_name,
               SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE %s
        GROUP BY sku
        ORDER BY gmv DESC, orders DESC
    """ % (_store_expr(), w), _store_params() + params).fetchall()
    records = [dict(r) for r in rows]
    # 同 SKU 昨日对比
    prev_date = (datetime.strptime(date_str, "%Y-%m-%d").date() - timedelta(days=1)).isoformat() if date_str else ""
    prev_rows = conn.execute("""
        SELECT sku, SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE date = ? GROUP BY sku
    """, (prev_date,)).fetchall()
    prev_map = {r["sku"]: dict(r) for r in prev_rows}
    for rec in records:
        p = prev_map.get(rec["sku"], {})
        rec["prev_orders"] = int(p.get("orders") or 0)
        rec["prev_gmv"] = round(float(p.get("gmv") or 0), 2)
    conn.close()
    total_orders = sum(r["orders"] for r in records)
    total_gmv = round(sum(float(r["gmv"] or 0) for r in records), 2)
    return jsonify({
        "date": date_str,
        "records": records,
        "summary": {"orders": total_orders, "gmv": total_gmv, "skus": len(records)},
    })


@dashboard_bp.route("/order-history", methods=["GET"])
def order_history():
    """订单明细历史：按日期返回，可筛选单个 SKU。用于日期柱状图 + 明细表。"""
    sku = request.args.get("sku", "").strip()
    days = min(int(request.args.get("days", 30)), 180)
    store = request.args.get("store", "").strip()
    conn = _db()
    r = conn.execute("SELECT MAX(date) AS d FROM sku_orders").fetchone()
    anchor = r["d"] if r and r["d"] else datetime.now().strftime("%Y-%m-%d")
    end = datetime.strptime(anchor, "%Y-%m-%d").date()
    start = end - timedelta(days=days - 1)

    where = ["date >= ?", "date <= ?"]
    params = [start.isoformat(), end.isoformat()]
    if sku:
        where.append("sku = ?")
        params.append(sku)
    if store:
        where.append("%s = ?" % _store_expr())
        params.extend(_store_params() + [store])

    # 按天汇总（当日全部订单）
    daily_rows = conn.execute("""
        SELECT date, SUM(orders) AS orders, SUM(gmv) AS gmv,
               COUNT(DISTINCT sku) AS skus
        FROM sku_orders WHERE %s GROUP BY date ORDER BY date
    """ % " AND ".join(where), params).fetchall()
    daily = [{"date": x["date"], "orders": int(x["orders"] or 0),
              "gmv": round(float(x["gmv"] or 0), 2), "skus": int(x["skus"] or 0)}
             for x in daily_rows]

    # 明细：按日期 + SKU
    detail_rows = conn.execute("""
        SELECT date, %s AS store, sku, product_name,
               SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE %s
        GROUP BY date, sku ORDER BY date DESC, gmv DESC
    """ % (_store_expr(), " AND ".join(where)), _store_params() + params).fetchall()
    details = [dict(x) for x in detail_rows]
    conn.close()
    return jsonify({
        "sku": sku, "start": start.isoformat(), "end": end.isoformat(),
        "daily": daily, "details": details,
        "summary": {
            "orders": sum(x["orders"] for x in daily),
            "gmv": round(sum(x["gmv"] for x in daily), 2),
            "days": len(daily),
        },
    })


@dashboard_bp.route("/order-chart", methods=["GET"])
def order_chart():
    """订单柱状图/列表数据。
    未筛选 SKU：指定日期当天所有 SKU 的订单数/GMV（横轴=SKU）；
    筛选 SKU  ：该 SKU 近 N 天每日订单数/GMV（横轴=日期）。
    同时返回明细表数据，供「图表/列表」切换共用。
    """
    store = request.args.get("store", "").strip()
    sku = request.args.get("sku", "").strip()
    try:
        days = min(max(int(request.args.get("days", 30) or 30), 1), 180)
    except (ValueError, TypeError):
        days = 30
    date_str = request.args.get("date", "").strip()
    conn = _db()
    if not date_str:
        r = conn.execute("SELECT MAX(date) AS d FROM sku_orders").fetchone()
        date_str = r["d"] if r and r["d"] else datetime.now().strftime("%Y-%m-%d")

    se, sp = _store_expr(), _store_params()
    try:
        anchor = datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        anchor = datetime.now().date()
        date_str = anchor.isoformat()

    if sku:
        axis = "date"
        start = anchor - timedelta(days=days - 1)
        end = anchor
        where = ["date >= ?", "date <= ?", "sku = ?"]
        params = [start.isoformat(), end.isoformat(), sku]
        group_by = "date"
        order_by = "date"
    else:
        axis = "sku"
        start = end = anchor
        where = ["date = ?"]
        params = [date_str]
        group_by = "sku"
        order_by = "gmv DESC, orders DESC"
    if store:
        where.append("%s = ?" % se)
        params.extend(sp + [store])
    wsql = " AND ".join(where)

    bar_rows = conn.execute("""
        SELECT %s AS label, date, sku, MAX(product_name) AS product_name,
               SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE %s
        GROUP BY %s ORDER BY %s
    """ % ("date" if axis == "date" else "sku", wsql, group_by, order_by),
        params).fetchall()

    detail_rows = conn.execute("""
        SELECT date, %s AS store, sku, product_name,
               SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE %s
        GROUP BY %s ORDER BY %s
    """ % (se, wsql, "date, sku" if axis == "date" else "sku",
           "date DESC, gmv DESC" if axis == "date" else "gmv DESC, orders DESC"),
        sp + params).fetchall()

    bars = [{"label": x["label"], "date": x["date"], "sku": x["sku"],
             "product_name": x["product_name"],
             "orders": int(x["orders"] or 0), "gmv": round(float(x["gmv"] or 0), 2)}
            for x in bar_rows]
    details = [dict(x) for x in detail_rows]
    conn.close()
    return jsonify({
        "axis": axis, "sku": sku, "store": store, "date": date_str,
        "start": start.isoformat(), "end": end.isoformat(),
        "bars": bars, "details": details,
        "summary": {
            "orders": sum(x["orders"] for x in bars),
            "gmv": round(sum(x["gmv"] for x in bars), 2),
            "skus": len(set(x["sku"] for x in bars)),
            "days": len(bars) if axis == "date" else 1,
        },
    })


@dashboard_bp.route("/sku-trend", methods=["GET"])
def sku_trend():
    sku = request.args.get("sku", "").strip()
    days = min(int(request.args.get("days", 14)), 120)
    store = request.args.get("store", "").strip()
    conn = _db()
    if not sku:
        conn.close()
        return jsonify({"points": [], "summary": {}})
    # 以有数据的最新日期为锚
    r = conn.execute("SELECT MAX(date) AS d FROM sku_orders WHERE sku = ?", (sku,)).fetchone()
    anchor = r["d"] if r and r["d"] else datetime.now().strftime("%Y-%m-%d")
    end = datetime.strptime(anchor, "%Y-%m-%d").date()
    start = end - timedelta(days=days - 1)
    where = ["date >= ?", "date <= ?", "sku = ?"]
    params = [start.isoformat(), end.isoformat(), sku]
    if store:
        where.append("%s = ?" % _store_expr())
        params.extend(_store_params() + [store])
    rows = conn.execute("""
        SELECT date, SUM(orders) AS orders, SUM(gmv) AS gmv
        FROM sku_orders WHERE %s GROUP BY date ORDER BY date
    """ % " AND ".join(where), params).fetchall()
    points = [{"date": x["date"], "orders": int(x["orders"] or 0),
               "gmv": round(float(x["gmv"] or 0), 2)} for x in rows]
    # 广告数据对比（同 SKU）
    ad_where = ["r.date >= ?", "r.date <= ?", "COALESCE(m.product_model, r.product_sku) = ?"]
    ad_params = [start.isoformat(), end.isoformat(), sku]
    ad_rows = conn.execute("""
        SELECT r.date, SUM(r.spend) AS spend, SUM(r.sales) AS ad_gmv, SUM(r.orders) AS ad_orders
        FROM ad_records r
        LEFT JOIN sku_mappings m ON m.store IN (?, ?) AND m.system_sku = r.product_sku
        WHERE %s GROUP BY r.date ORDER BY r.date
    """ % " AND ".join(ad_where), STORE_ALIASES + tuple(ad_params)).fetchall()
    ad_map = {x["date"]: dict(x) for x in ad_rows}
    for p in points:
        a = ad_map.get(p["date"], {})
        p["ad_spend"] = round(float(a.get("spend") or 0), 2)
        p["ad_gmv"] = round(float(a.get("ad_gmv") or 0), 2)
        p["ad_orders"] = int(a.get("ad_orders") or 0)
    conn.close()
    total_orders = sum(p["orders"] for p in points)
    total_gmv = round(sum(p["gmv"] for p in points), 2)
    total_spend = round(sum(p["ad_spend"] for p in points), 2)
    return jsonify({
        "sku": sku, "start": start.isoformat(), "end": end.isoformat(),
        "points": points,
        "summary": {
            "orders": total_orders, "gmv": total_gmv, "ad_spend": total_spend,
            "roi": round(total_gmv / total_spend, 2) if total_spend > 0 else None,
            "tacos": round(total_spend / total_gmv * 100, 2) if total_gmv > 0 else None,
            "avg_order_value": round(total_gmv / total_orders, 2) if total_orders else None,
        },
    })


def register_dashboard_api(app, db_path):
    init_dashboard_tables(db_path)
    app.register_blueprint(dashboard_bp)
