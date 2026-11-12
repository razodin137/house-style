#!/usr/bin/env python3
"""Deliberately broken — this is what the gate catches. Do not run."""

import sys
import os


def deploy(count, verbose="", steps=[]):
    # verbose is unused on purpose — arguments are allowed to go
    # unused, same as the JavaScript no-unused-vars with args: none.
    if count > len(steps):
        total = count + 1
        print(f"deploying to {missing_dir}")
        print('done')


def finish(steps):
    sys.exit(len(steps))
