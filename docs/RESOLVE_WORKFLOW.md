# DaVinci Resolve Automation Workflow

This guide explains how to use the **Vibe Engine Bridge** to automatically apply your grades in DaVinci Resolve Studio.

## Prerequisites
- **DaVinci Resolve Studio**: The free version of Resolve does **not** support external scripting. You must have the Studio version.
- **Python 3.6+**: Must be installed on your system.
- **Enable Scripting in Resolve**:
  1. Open DaVinci Resolve.
  2. Go to **DaVinci Resolve > Preferences**.
  3. Go to **System > General**.
  4. Under "External Scripting Using", select **Local**.
  5. Restart DaVinci Resolve.

## The Workflow

### Step 1: Generate Your Look
1. Create your grade in the Vibe Engine web app.
2. Click **Export to Resolve**.
3. This will download two files (e.g., `Vibe_Bridge_12345.json` and `.cube`).

### Step 2: Prepare DaVinci Resolve
1. Open your project and go to the **Color Page**.
2. Select the clip you want to grade.
3. **Important - Color Management**:
   - Ideally, use a **Color Space Transform (CST)** node *before* your grading node to convert your camera's Log format to **Rec.709**.
   - Ensure you had "Log Footage" turned **OFF** in Vibe Engine if you are grading after a CST.

### Step 3: Run the Automation Script
1. Locate the `build_grade.py` script in the `automation/` folder of this project.
2. Make sure DaVinci Resolve is open.
3. Run the script (e.g., by double-clicking it if you have Python associated, or running `python automation/build_grade.py` in a terminal).
4. A file picker window will open.
5. Select the `.json` file you downloaded in Step 1.

### Step 4: Result
The script will:
1. Connect to DaVinci Resolve.
2. Locate the `.cube` file associated with the JSON.
3. Install the LUT into Resolve's LUT folder automatically.
4. Apply the LUT to your selected node.

## Troubleshooting

### "Deep Fried" / Oversaturated Images
This usually happens due to a Color Space mismatch or double-application.
- **Check**: Do you have a CST converting to Rec.709 before the grade? If so, Vibe Engine should have "Log Footage" **OFF**.
- **Check**: Did you apply the LUT manually *and* run the script? The script applies the LUT for you.

### Script Fails to Connect
- Ensure DaVinci Resolve is open.
- Ensure "External Scripting" is set to "Local" in Resolve Preferences.
- Ensure you are running the **Studio** version of Resolve.

