import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/api/contact.php'
data = json.dumps({
    'name': 'Test User',
    'email': 'test@example.com',
    'subject': 'Local Test',
    'message': 'This is a local test message.'
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print(r.status)
        print(r.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('ERROR', e)
