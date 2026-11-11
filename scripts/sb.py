"""Tiny Supabase helper (needs SB_KEY in the environment) for the Slate scheduled tasks.
  python3 /tmp/sb.py get PATH [PATH ...]      prints {"PATH": {"data": ..., "updated_at": ...}, ...} (missing paths left out)
  python3 /tmp/sb.py put PATH FILE [--merge]  writes FILE's JSON to PATH (--merge deep-merges objects into what's there)
"""
import json, os, sys, urllib.request, urllib.parse
SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co"
K = os.environ.get("SB_KEY") or sys.exit("set SB_KEY")
H = {"apikey": K, "Authorization": "Bearer " + K, "Content-Type": "application/json"}

def get(paths):
    q = "select=path,data,updated_at&path=in.(" + ",".join(urllib.parse.quote(p, safe="/-") for p in paths) + ")"
    rows = json.load(urllib.request.urlopen(urllib.request.Request(SB + "/rest/v1/docs?" + q, headers=H), timeout=30))
    return {r["path"]: {"data": r["data"], "updated_at": r["updated_at"]} for r in rows}

def put(path, data, merge=False):
    body = json.dumps({"p_path": path, "p_data": data, "p_merge": merge}).encode()
    last = None
    for _ in range(2):
        try:
            return urllib.request.urlopen(urllib.request.Request(SB + "/rest/v1/rpc/mirror_doc", data=body, method="POST", headers=H), timeout=30).status
        except Exception as e: last = e
    raise SystemExit(f"write failed: {last}")

if __name__ == "__main__":
    if len(sys.argv) < 3: sys.exit(__doc__)
    if sys.argv[1] == "get": print(json.dumps(get(sys.argv[2:])))
    elif sys.argv[1] == "put": print(put(sys.argv[2], json.load(open(sys.argv[3])), "--merge" in sys.argv))
    else: sys.exit(__doc__)
