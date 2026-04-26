from typing import Any


def ok(data: Any, status: int = 200) -> dict:
    return {"data": data, "error": None, "status": status}


def err(message: str, status: int = 400) -> dict:
    return {"data": None, "error": message, "status": status}
