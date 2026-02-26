import urllib.request
import json
import ssl

url = "https://lvhdyvlqaqzdbixnwixq.supabase.co/rest/v1/"
# Key from .env.local
key = "YOUR_SUPABASE_SERVICE_ROLE_KEY"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

def check_structure():
    print(f"Checking URL: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        # Bypassing SSL for local dev if needed, but usually not for supabase
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context) as response:
            status = response.getcode()
            print(f"Status Code: {status}")
            if status == 200:
                spec = json.loads(response.read().decode())
                definitions = spec.get('definitions', {})
                productos = definitions.get('productos', {})
                if productos:
                    props = productos.get('properties', {})
                    print(f"COLUMNS IN 'productos': {list(props.keys())}")
                else:
                    print("Table 'productos' NOT FOUND in OpenAPI spec.")
                    print(f"Available tables: {list(definitions.keys())}")
            else:
                print(f"Unexpected status code: {status}")
    except Exception as e:
        print(f"Error checking structure: {e}")

if __name__ == "__main__":
    check_structure()
