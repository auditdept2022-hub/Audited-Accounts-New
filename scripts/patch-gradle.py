"""Makes every CI build sign the APK with the SAME key (app-debug.keystore in the
repo root). Without this, each GitHub run generates a new random debug key and
Android refuses to update the app over the previous one (you'd have to uninstall,
losing offline data)."""
import re, pathlib
p = pathlib.Path("android/app/build.gradle")
s = p.read_text()
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
    s = re.sub(r"^android \{\n", block, s, count=1, flags=re.M)
    p.write_text(s)
    print("patched build.gradle")
else:
    print("already patched")
