from pathlib import Path
p=Path('tests/replay-session-regression.mjs')
s=p.read_text().replace("replay-session-clean-1.15","replay-session-clean-1.16")
p.write_text(s)
print('P0-2 test contracts aligned')
