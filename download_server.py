import http.server, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILENAME = 'ENIBexder_source.tar.gz'
FILEPATH = os.path.join(BASE_DIR, FILENAME)

HTML = b"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Download ENI Bexder</title>
<style>
  body { background: #0a0a0f; color: #fff; font-family: sans-serif;
         display: flex; align-items: center; justify-content: center;
         height: 100vh; margin: 0; flex-direction: column; gap: 20px; }
  a { background: #7c5cfc; color: #fff; padding: 14px 32px; border-radius: 10px;
      text-decoration: none; font-size: 18px; font-weight: 700; }
  a:hover { background: #6a4ee0; }
  p { color: #aaa; }
</style>
</head>
<body>
  <h1>ENI Bexder</h1>
  <p>Source code - 5.1 MB</p>
  <a href="/file">Download .tar.gz</a>
</body>
</html>"""

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', len(HTML))
            self.end_headers()
            self.wfile.write(HTML)
        elif self.path == '/file':
            size = os.path.getsize(FILEPATH)
            self.send_response(200)
            self.send_header('Content-Type', 'application/gzip')
            self.send_header('Content-Disposition', f'attachment; filename="{FILENAME}"')
            self.send_header('Content-Length', size)
            self.end_headers()
            with open(FILEPATH, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *a): pass

print('Serving on port 5000')
http.server.HTTPServer(('0.0.0.0', 5000), Handler).serve_forever()
