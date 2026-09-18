"""
eCyber Cafe local development server with Remove.bg API proxy.
Pure Python standard library (no pip dependencies needed).

Usage:
    python server.py [port]
Example:
    python server.py 8000
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.error

# Automatically load .env file if present
def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = val

load_env_file()

class EcyberHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching issues during development
        if self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/removebg' or self.path == '/api/removebg/':
            api_key = os.environ.get('REMOVE_BG_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': 'REMOVE_BG_API_KEY is not configured on the server. Please add REMOVE_BG_API_KEY to your .env file.'
                }).encode('utf-8'))
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Invalid JSON payload: {str(e)}'}).encode('utf-8'))
                return

            req_payload = {
                'image_file_b64': data.get('image_file_b64', ''),
                'size': data.get('size', 'auto')
            }

            req = urllib.request.Request(
                'https://api.remove.bg/v1.0/removebg',
                data=json.dumps(req_payload).encode('utf-8'),
                headers={
                    'X-Api-Key': api_key,
                    'Content-Type': 'application/json'
                },
                method='POST'
            )

            try:
                with urllib.request.urlopen(req) as response:
                    img_bytes = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Length', str(len(img_bytes)))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(img_bytes)
            except urllib.error.HTTPError as e:
                err_body = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_body)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        self.send_error(404, "Not Found")

def run():
    # Priority: command line arg > env PORT > default 8000
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    elif os.environ.get('PORT'):
        try:
            port = int(os.environ['PORT'])
        except ValueError:
            pass

    # Ensure working directory is workspace root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), EcyberHandler) as httpd:
        print(f"==================================================")
        print(f" eCyber Cafe Automation Suite is running!")
        print(f" Local URL: http://localhost:{port}")
        has_key = bool(os.environ.get('REMOVE_BG_API_KEY'))
        print(f" Remove.bg API Key: {'Configured from environment' if has_key else 'Missing (check .env)'}")
        print(f" Press Ctrl+C to stop the server.")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == '__main__':
    run()
