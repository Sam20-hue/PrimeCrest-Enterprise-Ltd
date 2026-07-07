from pathlib import Path

roots = [Path('public/api'), Path('out/api')]
count = 0
for root in roots:
    for p in sorted(root.glob('*.php')):
        b = p.read_bytes()
        if b.startswith(b'\xef\xbb\xbf'):
            p.write_bytes(b[3:])
            print('Stripped BOM:', p)
            count += 1
print('Done', count, 'files')
