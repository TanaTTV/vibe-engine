import sys
import os
import json
import time
import shutil

# --- NUCLEAR FIX: Manually Add DaVinci API Path ---
api_path = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules"

if os.path.exists(api_path):
    if api_path not in sys.path:
        sys.path.append(api_path)
    print(f"✅ Found DaVinci Modules folder: {api_path}")
else:
    print(f"❌ Critical Error: The folder {api_path} does not exist.")

# --- CONNECT TO RESOLVE ---
try:
    import DaVinciResolveScript as dvr_script
    resolve = dvr_script.scriptapp("Resolve")
    
    if resolve:
        print("🚀 SUCCESS! Connected to DaVinci Resolve.")
        project = resolve.GetProjectManager().GetCurrentProject()
        if not project:
            print("❌ No active project found.")
            sys.exit()
    else:
        print("❌ Import worked, but could not get 'resolve' object.")
        sys.exit()

except ImportError as e:
    print(f"❌ Still failing to import: {e}")
    resolve = None
    sys.exit()

# --- MAIN LOGIC ---
if 'resolve' in locals() and resolve:
    import tkinter as tk
    from tkinter import filedialog
    
    timeline = project.GetCurrentTimeline()
    if not timeline:
        print("❌ Error: Open a timeline first.")
        sys.exit()
        
    current_item = timeline.GetCurrentVideoItem()
    if not current_item:
        print("❌ Error: Select a clip on the timeline (red outline).")
        sys.exit()

    # Input: Select File
    print("Waiting for file selection...")
    root = tk.Tk()
    root.withdraw() 
    root.attributes('-topmost', True)

    json_path = filedialog.askopenfilename(
        title="Select Vibe Blueprint", 
        filetypes=[("JSON Files", "*.json")]
    )
    root.destroy()

    if not json_path:
        print("⚠️ No file selected.")
        sys.exit()

    try:
        with open(json_path, "r") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Error reading JSON: {e}")
        sys.exit()

    print(f"🚀 Applying Vibe to {current_item.GetName()}...")

    # --- VALUES & MATH ---
    params = data["primary"]
    
    raw_lift = params["lift"]
    raw_gamma = params["gamma"]
    raw_gain = params["gain"]
    contrast = params.get("contrast", 1.0)
    pivot = params.get("pivot", 0.435)
    saturation = params.get("saturation", 1.0)

    print(f"   Baking Contrast: {contrast} (Pivot: {pivot})")

    final_slope = []
    final_offset = []
    final_power = raw_gamma 

    for i in range(3):
        # Contrast Baking
        # Formula: NewOffset = (Offset * Contrast) + (Pivot * (1 - Contrast))
        s = raw_gain[i] * contrast
        final_slope.append(s)
        o = (raw_lift[i] * contrast) + (pivot * (1 - contrast))
        final_offset.append(o)

    # --- AUTO-INSTALL LUT STRATEGY ---
    # Direct file path loading failed. We will install it to the Resolve LUT folder.
    
    lut_filename = json_path.replace(".json", ".cube")
    lut_basename = os.path.basename(lut_filename)
    
    # Standard Windows Resolve LUT Path
    resolve_lut_dir = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\VibeEngine"
    
    lut_applied = False
    
    if os.path.exists(lut_filename):
        try:
            if not os.path.exists(resolve_lut_dir):
                os.makedirs(resolve_lut_dir)
            
            target_path = os.path.join(resolve_lut_dir, lut_basename)
            
            # Copy file
            shutil.copy2(lut_filename, target_path)
            print(f"✅ Installed LUT to: {target_path}")
            
            # Refresh Resolve
            project.RefreshLUTList()
            
            # Apply by Name (Relative Path)
            lut_relative_path = f"VibeEngine/{lut_basename}"
            print(f"   Applying LUT: {lut_relative_path}")
            
            # Try Node 2 first (Standard Workflow: CST -> Grade)
            if current_item.SetLUT(2, lut_relative_path):
                print("✅ SetLUT Success on Node 2!")
                lut_applied = True
            else:
                print("⚠️ Could not set LUT on Node 2. Trying Node 1...")
                if current_item.SetLUT(1, lut_relative_path):
                    print("✅ SetLUT Success on Node 1!")
                    lut_applied = True
                    
        except Exception as e:
            print(f"❌ LUT Install Error: {e}")
    else:
        print(f"⚠️ LUT file not found: {lut_filename}")

    # --- STEP 2: APPLY CDL ---
    # Only apply CDL if LUT was NOT applied, to avoid double-grading.
    # The Vibe Engine LUT already contains Lift/Gamma/Gain/Contrast.
    if lut_applied:
        print("ℹ️  LUT applied successfully. Skipping CDL to prevent double-application of grade.")
    else:
        def to_cdl_str(rgb_array):
            return f"{rgb_array[0]:.6f} {rgb_array[1]:.6f} {rgb_array[2]:.6f}"

        cdl_map = {
            "NodeIndex": "2",
            "Slope": to_cdl_str(final_slope),
            "Offset": to_cdl_str(final_offset),
            "Power": to_cdl_str(final_power),
            "Saturation": str(saturation)
        }
        
        print(f"DEBUG: Sending CDL Map -> {cdl_map}")
        
        try:
            if current_item.SetCDL(cdl_map):
                print("✅ SetCDL Success (Node 2)!")
            else:
                print("⚠️ SetCDL failed on Node 2. Retrying on Node 1...")
                cdl_map["NodeIndex"] = "1"
                if current_item.SetCDL(cdl_map):
                    print("✅ SetCDL Success (Node 1)!")
                else:
                    print("❌ SetCDL Returned False.")
        except Exception as e:
            print(f"❌ SetCDL Error: {e}")

    print("🏁 DONE! Grade Updated.")
