import sqlite3

DB = "data/coherent.db"

def add(contrib_id, user_handle, reflection, score):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO evolutions (contrib_id, user_handle, reflection, score) "
        "VALUES (?, ?, ?, ?)",
        (contrib_id, user_handle, reflection, score)
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add(
        contrib_id="PUT_FIRST_PR_SHA_HERE",
        user_handle="example_user",
        reflection="First ritual felt grounding.",
        score=5
    )
