#!/usr/bin/env python3
import argparse, json, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

parser=argparse.ArgumentParser()
parser.add_argument('--root',default='.')
parser.add_argument('--port',type=int,default=8765)
parser.add_argument('--output',required=True)
args=parser.parse_args()
os.chdir(args.root)

class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/result':
            self.send_error(404); return
        length=int(self.headers.get('Content-Length','0') or '0')
        raw=self.rfile.read(length)
        try:
            data=json.loads(raw.decode('utf-8'))
            with open(args.output,'w',encoding='utf-8') as f:
                json.dump(data,f,ensure_ascii=False,indent=2)
                f.write('\n')
            self.send_response(204); self.end_headers()
        except Exception as exc:
            self.send_error(400,str(exc))
    def log_message(self,fmt,*vals):
        print('[seek-server] '+fmt%vals,flush=True)

print(f'SERVING http://127.0.0.1:{args.port}',flush=True)
ThreadingHTTPServer(('0.0.0.0',args.port),Handler).serve_forever()
