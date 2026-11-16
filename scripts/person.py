"""Add, rename or remove a person in users/registry (run by .github/workflows/person.yml).
Env: SB_KEY, ACTION (add/rename/remove), PID, PNAME, PHASH (SHA-256 of the passcode, never the passcode)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from sb import get, put

act, pid = os.environ.get("ACTION", "add"), os.environ.get("PID", "").strip().lower()
name, h = os.environ.get("PNAME", "").strip(), os.environ.get("PHASH", "").strip().lower()
if not re.fullmatch(r"[a-z]{2,20}", pid) or pid == "dj": sys.exit("id must be 2-20 lowercase letters, not dj")
reg = (get(["users/registry"]).get("users/registry") or {}).get("data") or {}
users = reg.get("users") or {}
if act == "add":
    if not re.fullmatch(r"[0-9a-f]{64}", h): sys.exit("hash must be the 64-character SHA-256 of the passcode")
    if h in users: sys.exit("that passcode is already in use")
    if any(u.get("id") == pid for u in users.values()): sys.exit(f"{pid} already has a passcode; remove it first to change it")
    users[h] = {"id": pid, "name": name or pid.title(), "cap": 10}
elif act == "rename":
    # only the shown name changes: the id (and so their data under u/<id>/) and the passcode stay
    hit = [u for u in users.values() if u.get("id") == pid]
    if not hit or not name: sys.exit(f"need a name, and someone with id {pid}")
    for u in hit: u["name"] = name
elif act == "remove":
    gone = [k for k, u in users.items() if u.get("id") == pid]
    if not gone: sys.exit(f"no one with id {pid}")
    for k in gone: users.pop(k)
else: sys.exit("action must be add or remove")
reg["users"] = users
print(put("users/registry", reg))
print("people now:", ", ".join(f"{u.get('name')} ({u.get('id')})" for u in users.values()) or "none")
