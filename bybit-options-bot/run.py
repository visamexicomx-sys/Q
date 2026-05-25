#!/usr/bin/env python3
"""Entrypoint: `python run.py [--once] [--no-exec] [--config config.yaml]`."""

from bot.main import main

if __name__ == "__main__":
    raise SystemExit(main())
