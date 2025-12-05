import subprocess, sqlite3, os

DB_PATH = "data/coherent.db"
SCHEMA = "data/schema.sql"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    with open(SCHEMA) as f:
        conn.executescript(f.read())
    conn.commit()
    return conn

def git_log():
    cmd = ["git", "log", "--pretty=format:%H|%an|%ad|%s", "--date=iso"]
    return subprocess.check_output(cmd, text=True).splitlines()

def main():
    conn = init_db()
    cur = conn.cursor()
    for line in git_log():
        sha, author, date, subject = line.split("|", 3)
        cur.execute(
            "INSERT OR IGNORE INTO contributions (id, title, type, author, merged_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (sha, subject, "runbook", author, date)
        )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    main()
