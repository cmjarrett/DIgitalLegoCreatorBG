"""Local web server for testing the game (no caching, so edits show up on reload).

    python tools/serve.py        then open http://localhost:8123
"""
import http.server
import os


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
http.server.ThreadingHTTPServer(('', 8123), NoCache).serve_forever()
