import os
import sys
from pathlib import Path

name = "XBox 360.png"
size = 1013169
search_list = [os.path.expanduser('~')]

for d in search_list:
    for root, dirs, fnames in os.walk(d):
        if name in fnames:
            candidate = os.path.join(root, name)
            print(f"FOUND EXACT: {candidate} -> SIZE: {os.path.getsize(candidate)}")
