"""Run by CI after `npx cap add android`.

1. Signs every build with the SAME key (app-debug.keystore in the repo root).
   Without this, each GitHub run makes a new random key and Android refuses
   to update the app over the old one.
2. Sets versionCode / versionName from the VERSION_CODE / VERSION_NAME
   environment variables, so every release is a higher version and installs
   as a normal update (data is kept).
"""
import os, re, pathlib, sys

p = pathlib.Path("android/app/build.gradle")
s = p.read_text()

# ---- 1. signing ----
if "app-debug.keystore" not in s:
    block = '''android {
    signingConfigs {
        debug {
            storeFile file("../../app-debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
'''
    s, n = re.subn(r"^android \{\n", block, s, count=1, flags=re.M)
    if n != 1:
        sys.exit("Could not find 'android {' block in build.gradle")
    print("patched signing")
else:
    print("signing already patched")

# ---- 2. version ----
code = os.environ.get("VERSION_CODE", "1")
name = os.environ.get("VERSION_NAME", "1.0")
s, n1 = re.subn(r"versionCode\s+\d+", f"versionCode {code}", s, count=1)
s, n2 = re.subn(r'versionName\s+"[^"]*"', f'versionName "{name}"', s, count=1)
if n1 != 1 or n2 != 1:
    sys.exit("Could not patch versionCode/versionName")
print(f"version set to {name} (code {code})")

p.write_text(s)
