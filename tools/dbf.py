"""Minimal dBase (.DBF) reader for the MOE 國小學童常用字詞調查報告書 tables (Big5 text fields).

usage: python3 tools/dbf.py <file.dbf>   (prints the fields and the first rows)
"""
import struct
import sys


def read_dbf(path):
    with open(path, 'rb') as f:
        head = f.read(32)
        n_rec, head_len, rec_len = struct.unpack('<IHH', head[4:12])
        fields = []
        while True:
            fd = f.read(32)
            if fd[0] == 0x0D:
                break
            name = fd[:11].split(b'\0')[0].decode('ascii')
            fields.append((name, chr(fd[11]), fd[16]))
        f.seek(head_len)
        rows = []
        for _ in range(n_rec):
            rec = f.read(rec_len)
            if not rec or rec[0] == 0x2A:
                continue
            pos = 1
            row = {}
            for name, kind, length in fields:
                raw = rec[pos:pos + length]
                pos += length
                row[name] = raw.decode('big5', errors='replace').strip()
            rows.append(row)
        return fields, rows


if __name__ == '__main__':
    fields, rows = read_dbf(sys.argv[1])
    print(fields)
    print(len(rows), 'rows')
    for r in rows[:12]:
        print(r)
