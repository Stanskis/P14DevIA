import statistics
import time
import httpx

c = httpx.Client(base_url="http://localhost:8000", timeout=60)
token = c.post("/login", json={"email": "test@test.com",
               "password": "test"}).json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

questions = ["Quelles sont les actualités du jour ?",
             "Donne-moi plus de détails sur le premier sujet."]

times, errors = [], 0
for i in range(5):
    chat_id = c.post("/chats", headers=h).json()["id"]
    for q in questions:
        t = time.perf_counter()
        r = c.post(f"/chats/{chat_id}/messages",
                   json={"content": q}, headers=h)
        d = time.perf_counter() - t
        print(f"essai {i+1} : {r.status_code} en {d:.1f} s", flush=True)
        if r.status_code == 200:
            times.append(d)
        else:
            errors += 1
        time.sleep(3)

times.sort()
if times:
    print(
        f"n={len(times)} erreurs={errors} | médiane {statistics.median(times):.1f} s | max {times[-1]:.1f} s")
