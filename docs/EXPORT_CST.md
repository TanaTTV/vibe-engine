# How to Export a Reference Frame (CST Image)

To get the best results with **Vibe Engine**, you should import a high-quality still frame from your timeline that represents your "base" image (Rec.709).

## Why do this?
If you are shooting in **Log** (S-Log3, V-Log, LogC, etc.), the image is flat and grey. If you grade on top of that without converting it first, the AI will get confused and the colors will be wrong.

By exporting a frame **after** your Color Space Transform (CST), you give the engine a clean, correct starting point.

## Step-by-Step Guide

### 1. Set up your Node Tree
1.  Open the **Color Page** in DaVinci Resolve.
2.  Add a **Color Space Transform (CST)** node as your first node (Node 01).
    -   *Input Color Space*: [Your Camera, e.g., Sony S-Gamut3.Cine]
    -   *Input Gamma*: [Your Camera, e.g., Sony S-Log3]
    -   *Output Color Space*: **Rec.709**
    -   *Output Gamma*: **Rec.709** (or Gamma 2.4)
3.  Ensure this is the **only** active node for now.

### 2. Grab a Still
1.  Right-click on the viewer (the video preview).
2.  Select **Grab Still**.
3.  Open the **Gallery** (top left button if hidden).
4.  Right-click the still you just grabbed.
5.  Select **Export**.

### 3. Export Settings
-   **Save as type**: JPEG or PNG.
    -   *PNG* is better quality (lossless).
    -   *JPEG* is smaller and faster to upload.
-   **Filename**: Give it a name and save it.

### 4. Import to Vibe Engine
1.  Go to Vibe Engine.
2.  Click **Import Image**.
3.  Select the file you just exported.
4.  **Important**: Ensure the **"Log Footage"** toggle is **OFF**. (Since you already converted it to Rec.709 in Resolve).

You are now ready to generate looks!






