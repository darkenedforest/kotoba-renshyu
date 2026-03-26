#!/usr/bin/env python3
"""Generate lessons 921-970."""
import json, sys, os
sys.stdout.reconfigure(encoding="utf-8")
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Read the first Write attempt content from the already-generated JSON
# Since we have the full content, let us build it programmatically

exec(open("scripts/gen-921-970-data.py", encoding="utf-8").read())
