import sys
import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- DA VINCI RESOLVE CONNECTION SETUP ---
# Manually Add DaVinci API Path (Windows default)
api_path = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules"

resolve = None
project = None

def connect_to_resolve():
    global resolve, project
    
    if os.path.exists(api_path):
        if api_path not in sys.path:
            sys.path.append(api_path)
            logger.info(f"✅ Added DaVinci Modules folder: {api_path}")
    else:
        logger.error(f"❌ Critical Error: The folder {api_path} does not exist.")
        return False

    try:
        import DaVinciResolveScript as dvr_script
        resolve = dvr_script.scriptapp("Resolve")
        
        if resolve:
            logger.info("🚀 SUCCESS! Connected to DaVinci Resolve.")
            project = resolve.GetProjectManager().GetCurrentProject()
            if not project:
                logger.warning("⚠️ No active project found in Resolve.")
                return False
            return True
        else:
            logger.error("❌ Import worked, but could not get 'resolve' object.")
            return False

    except ImportError as e:
        logger.error(f"❌ Failed to import DaVinciResolveScript: {e}")
        return False

# Initial connection attempt
connect_to_resolve()

@app.route('/health', methods=['GET'])
def health_check():
    """Check if the server is running and connected to Resolve."""
    status = "connected" if resolve else "disconnected"
    return jsonify({"status": "ok", "resolve_connection": status})

@app.route('/apply-grade', methods=['POST'])
def apply_grade():
    """Receive grade parameters and apply them to the current node in Resolve."""
    global resolve, project
    
    # Re-check connection if needed
    if not resolve:
        if not connect_to_resolve():
            return jsonify({"error": "Could not connect to DaVinci Resolve"}), 503

    project = resolve.GetProjectManager().GetCurrentProject()
    if not project:
        return jsonify({"error": "No active project in DaVinci Resolve"}), 400

    timeline = project.GetCurrentTimeline()
    if not timeline:
        return jsonify({"error": "No active timeline in DaVinci Resolve"}), 400

    current_item = timeline.GetCurrentVideoItem()
    if not current_item:
        return jsonify({"error": "No clip selected. Please select a clip in the Color page."}), 400

    data = request.json
    if not data or 'primary' not in data:
        return jsonify({"error": "Invalid payload. Missing 'primary' parameters."}), 400

    logger.info(f"🚀 Applying Vibe to {current_item.GetName()}...")

    try:
        # --- VALUES & MATH ---
        params = data["primary"]
        
        raw_lift = params["lift"]
        raw_gamma = params["gamma"]
        raw_gain = params["gain"]
        contrast = params.get("contrast", 1.0)
        pivot = params.get("pivot", 0.435)
        saturation = params.get("saturation", 1.0)
        
        # Apply CDL Parameters
        # Note: The DaVinci Resolve API for setting CDL is limited. 
        # We generally use SetCDL(slope, offset, power, saturation) on the node.
        # But SetCDL often expects specific list formats.
        
        # We'll calculate the final Slope/Offset/Power based on the contrast math
        # similar to build_grade.py
        
        final_slope = []
        final_offset = []
        final_power = [raw_gamma['r'], raw_gamma['g'], raw_gamma['b']]

        for i, c in enumerate(['r', 'g', 'b']):
            # Contrast Baking
            # Formula: NewOffset = (Offset * Contrast) + (Pivot * (1 - Contrast))
            
            # Gain -> Slope
            s = raw_gain[c] * contrast
            final_slope.append(s)
            
            # Lift -> Offset
            o = (raw_lift[c] * contrast) + (pivot * (1 - contrast))
            final_offset.append(o)

        # Apply to Node 2 (assuming Node 1 is CST) or Node 1
        # 1 = Slope (R, G, B)
        # 2 = Offset (R, G, B)
        # 3 = Power (R, G, B)
        # 4 = Saturation
        
        # However, SetCDL isn't a standard API method on MediaPoolItem.
        # We usually have to generate a LUT or use SetProperty if available.
        # Since we don't want to manage file I/O for temporary LUTs if we can avoid it,
        # but the API is strict. 
        
        # BEST APPROACH FOR LIVE PREVIEW:
        # We will generate a temporary .cube file and apply it, just like build_grade.py,
        # but we handle the file generation here server-side silently.
        
        # 1. Generate LUT content (we need the LUT generation logic here or import it)
        # Since we don't have the JS LUT engine here, we'll rely on the client sending the LUT content?
        # OR we just map the CDL values we have to the node tools if possible.
        
        # Actually, the most reliable way in Resolve API is SetLUT().
        # So we need to write a .cube file.
        
        temp_lut_dir = r"C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\LUT\VibeEngine\Temp"
        if not os.path.exists(temp_lut_dir):
            os.makedirs(temp_lut_dir)
            
        temp_lut_name = "Vibe_Live_Preview.cube"
        temp_lut_path = os.path.join(temp_lut_dir, temp_lut_name)
        
        # The client should ideally send the LUT content string to us to save re-implementing 
        # the LUT math in Python.
        lut_content = data.get('lutContent')
        
        if lut_content:
            with open(temp_lut_path, "w") as f:
                f.write(lut_content)
                
            project.RefreshLUTList()
            
            lut_relative_path = f"VibeEngine/Temp/{temp_lut_name}"
            
            # Try Node 2 then Node 1
            if current_item.SetLUT(2, lut_relative_path):
                msg = "Applied to Node 2"
            elif current_item.SetLUT(1, lut_relative_path):
                msg = "Applied to Node 1"
            else:
                return jsonify({"error": "Could not set LUT on Node 1 or 2"}), 500
                
            return jsonify({"status": "success", "message": msg})
            
        else:
            return jsonify({"error": "Missing 'lutContent' in payload"}), 400

    except Exception as e:
        logger.error(f"Error applying grade: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\n--- VIBE ENGINE BRIDGE SERVER ---")
    print("Listening on http://localhost:8000")
    print("Keep this window open to sync with DaVinci Resolve.\n")
    app.run(port=8000)


