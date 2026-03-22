import sqlite3
import json

# Path to your database file
DB_PATH = "backend/app/db/stllhaus.db"
EXPORT_PATH = "sales_export.json"

def export_sales():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM sales")
        rows = cur.fetchall()
        sales = [dict(row) for row in rows]
        # Convert JSON fields to Python objects if needed
        for sale in sales:
            if 'items' in sale and isinstance(sale['items'], str):
                try:
                    sale['items'] = json.loads(sale['items'])
                except Exception:
                    pass
        with open(EXPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(sales, f, ensure_ascii=False, indent=2)
        print(f"Exported {len(sales)} sales to {EXPORT_PATH}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    export_sales()
