import requests

class Memstore:
    def __init__(self, api_key: str, base_url: str = "https://memstore.dev/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def remember(self, content: str, session: str = None,
                 metadata: dict = None, ttl: int = None):
        payload = {"content": content}
        if session: payload["session"] = session
        if metadata: payload["metadata"] = metadata
        if ttl: payload["ttl"] = ttl
        response = requests.post(
            f"{self.base_url}/memory/remember",
            json=payload, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def recall(self, query: str, session: str = None,
               top_k: int = 5, threshold: float = 0.5):
        params = {"q": query, "top_k": top_k, "threshold": threshold}
        if session: params["session"] = session
        response = requests.get(
            f"{self.base_url}/memory/recall",
            params=params, headers=self.headers)
        response.raise_for_status()
        return response.json().get("memories", [])

    def forget(self, memory_id: str):
        response = requests.delete(
            f"{self.base_url}/memory/forget/{memory_id}",
            headers=self.headers)
        response.raise_for_status()
        return True

    def list(self, session: str = None, limit: int = 20):
        params = {"limit": limit}
        if session: params["session"] = session
        response = requests.get(
            f"{self.base_url}/memory/list",
            params=params, headers=self.headers)
        response.raise_for_status()
        return response.json()
