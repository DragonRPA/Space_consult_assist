import os
import psycopg
from datetime import date, datetime
import json

DATABASE_URL = "postgresql://postgres.eknwzjcbchbefdlykqgl:jUHGAmVsSeXc1jdR@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres"

def dump_table(conn, table_name):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table_name}")
    rows = cur.fetchall()
    cols = [desc[0] for desc in cur.description]
    
    if not rows:
        return f"-- No data in {table_name}\n"
    
    sql_statements = [f"-- INSERT for {table_name}"]
    for row in rows:
        values = []
        for val in row:
            if val is None:
                values.append("NULL")
            elif isinstance(val, (int, float, bool)):
                values.append(str(val))
            elif isinstance(val, (dict, list)):
                values.append("'" + json.dumps(val).replace("'", "''") + "'")
            elif isinstance(val, (date, datetime)):
                values.append(f"'{val.isoformat()}'")
            else:
                values.append("'" + str(val).replace("'", "''") + "'")
        sql_statements.append(f"INSERT INTO {table_name} ({', '.join(cols)}) VALUES ({', '.join(values)});")
    return "\n".join(sql_statements) + "\n\n"

try:
    with psycopg.connect(DATABASE_URL) as conn:
        employees_sql = dump_table(conn, "employees")
        events_sql = dump_table(conn, "schedule_events")
        
        with open("supabase_data_injection.sql", "w", encoding="utf-8") as f:
            f.write(employees_sql)
            f.write(events_sql)
    print("SQL file generated.")
except Exception as e:
    print(f"Error: {e}")
