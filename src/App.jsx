import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

// ─── Inline CSS ────────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:   #0d1b2a;
      --navy2:  #1a2e42;
      --teal:   #00b4a6;
      --teal2:  #00887d;
      --white:  #f7f9fb;
      --grey1:  #e4eaf0;
      --grey2:  #a8b8c8;
      --grey3:  #5a7080;
      --warn:   #e8a020;
      --error:  #d94040;
      --ok:     #27ae60;
      --font:   'IBM Plex Sans', sans-serif;
      --mono:   'IBM Plex Mono', monospace;
    }

    body {
      font-family: var(--font);
      background: var(--navy);
      min-height: 100vh;
      color: var(--navy);
    }

    /* Layout */
    .app-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 16px 48px;
      background:
        radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,180,166,0.12) 0%, transparent 70%),
        var(--navy);
    }

    /* Header */
    .header {
      width: 100%;
      max-width: 480px;
      padding: 36px 0 28px;
      text-align: center;
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(0,180,166,0.15);
      border: 1px solid rgba(0,180,166,0.35);
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: 16px;
    }
    .header-badge .dot {
      width: 6px; height: 6px;
      background: var(--teal);
      border-radius: 50%;
    }
    .header h1 {
      font-size: 26px;
      font-weight: 600;
      color: #fff;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .header h1 span { color: var(--teal); }
    .header p {
      margin-top: 10px;
      font-size: 14px;
      color: var(--grey2);
      line-height: 1.6;
    }

    /* Card */
    .card {
      width: 100%;
      max-width: 480px;
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.12);
    }

    /* Steps bar */
    .steps-bar {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid var(--grey1);
    }
    .step-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 14px 8px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--grey2);
      border-bottom: 3px solid transparent;
      transition: all 0.25s;
      cursor: default;
    }
    .step-item.active { color: var(--teal2); border-bottom-color: var(--teal); }
    .step-item.done   { color: var(--ok);   border-bottom-color: var(--ok); }
    .step-num {
      width: 22px; height: 22px;
      border-radius: 50%;
      border: 2px solid currentColor;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px;
      font-family: var(--mono);
    }
    .step-item.done .step-num {
      background: var(--ok);
      border-color: var(--ok);
      color: #fff;
    }
    .step-item.active .step-num {
      background: var(--teal);
      border-color: var(--teal);
      color: #fff;
    }

    /* Body sections */
    .card-body { padding: 24px; }

    /* Upload zone */
    .upload-zone {
      border: 2px dashed var(--grey1);
      border-radius: 14px;
      padding: 40px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--white);
      position: relative;
      overflow: hidden;
    }
    .upload-zone:hover {
      border-color: var(--teal);
      background: rgba(0,180,166,0.04);
    }
    .upload-zone input[type="file"] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }
    .upload-icon {
      width: 52px; height: 52px;
      margin: 0 auto 14px;
      background: rgba(0,180,166,0.1);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .upload-icon svg { color: var(--teal); }
    .upload-zone h3 { font-size: 15px; font-weight: 600; color: var(--navy); margin-bottom: 6px; }
    .upload-zone p  { font-size: 13px; color: var(--grey3); }

    /* Status pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      margin: 16px auto 0;
      width: 100%;
    }
    .status-pill.info    { background: rgba(0,180,166,0.1); color: var(--teal2); }
    .status-pill.warn    { background: rgba(232,160,32,0.12); color: #c07810; }
    .status-pill.error   { background: rgba(217,64,64,0.1);  color: var(--error); }
    .status-pill.ok      { background: rgba(39,174,96,0.1);  color: var(--ok); }
    .status-pill .spinner {
      width: 14px; height: 14px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Processing overlay */
    .processing-block {
      text-align: center;
      padding: 32px;
      border-radius: 14px;
      background: var(--white);
      margin-top: 16px;
    }
    .processing-block .big-spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--grey1);
      border-top-color: var(--teal);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 14px;
    }
    .processing-block p { font-size: 14px; color: var(--grey3); font-weight: 500; }

    /* Checks panel */
    .checks-panel {
      border-radius: 14px;
      border: 1px solid var(--grey1);
      overflow: hidden;
      margin-top: 20px;
    }
    .checks-header {
      background: var(--white);
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--grey3);
      border-bottom: 1px solid var(--grey1);
    }
    .check-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 16px;
      font-size: 13px;
      color: #333;
      border-bottom: 1px solid var(--grey1);
      line-height: 1.4;
    }
    .check-row:last-child { border-bottom: none; }
    .check-icon {
      width: 18px; height: 18px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 1px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px;
      font-weight: 700;
    }
    .check-icon.ok    { background: var(--ok);    color: #fff; }
    .check-icon.warn  { background: var(--warn);  color: #fff; }
    .check-icon.info  { background: var(--grey2); color: #fff; }

    /* Preview area */
    .preview-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .preview-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--grey3);
      margin-bottom: 12px;
      align-self: flex-start;
    }
    .preview-frame {
      width: 300px;
      height: 400px;
      position: relative;
      overflow: hidden;
      background: #fff;
      cursor: grab;
      touch-action: none;
      border-radius: 4px;
      box-shadow:
        0 0 0 1px var(--grey1),
        0 8px 32px rgba(0,0,0,0.12);
    }
    .preview-frame:active { cursor: grabbing; }
    .preview-frame img {
      position: absolute;
      left: 50%; top: 50%;
      user-select: none;
      max-width: none; max-height: none;
      pointer-events: none;
    }
    .guide-overlay {
      position: absolute;
      pointer-events: none;
      left: 50%; top: 45%;
      transform: translate(-50%, -50%);
    }
    /* Corner marks on frame */
    .corner { position: absolute; width: 18px; height: 18px; }
    .corner.tl { top: 0; left: 0;  border-top: 3px solid var(--teal); border-left: 3px solid var(--teal); border-radius: 4px 0 0 0; }
    .corner.tr { top: 0; right: 0; border-top: 3px solid var(--teal); border-right: 3px solid var(--teal); border-radius: 0 4px 0 0; }
    .corner.bl { bottom: 0; left: 0;  border-bottom: 3px solid var(--teal); border-left: 3px solid var(--teal); border-radius: 0 0 0 4px; }
    .corner.br { bottom: 0; right: 0; border-bottom: 3px solid var(--teal); border-right: 3px solid var(--teal); border-radius: 0 0 4px 0; }

    /* Zoom control */
    .zoom-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 16px;
      width: 300px;
    }
    .zoom-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--grey3);
      width: 38px;
      flex-shrink: 0;
    }
    .zoom-value {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--grey3);
      width: 38px;
      text-align: right;
      flex-shrink: 0;
    }
    input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      background: var(--grey1);
      border-radius: 2px;
      outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px; height: 18px;
      background: var(--teal);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,180,166,0.4);
      transition: transform 0.15s;
    }
    input[type="range"]::-webkit-slider-thumb:active { transform: scale(1.2); }

    /* Buttons */
    .btn-row {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      width: 300px;
    }
    .btn {
      flex: 1;
      padding: 12px 16px;
      border-radius: 12px;
      font-family: var(--font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.18s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
    }
    .btn-ghost {
      background: var(--white);
      color: var(--navy);
      border: 1px solid var(--grey1);
    }
    .btn-ghost:hover { background: var(--grey1); }
    .btn-primary {
      background: var(--navy);
      color: #fff;
    }
    .btn-primary:hover { background: var(--navy2); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(13,27,42,0.3); }
    .btn-primary:active { transform: translateY(0); }

    /* Disclaimer */
    .disclaimer {
      margin-top: 20px;
      padding: 12px 16px;
      background: rgba(232,160,32,0.08);
      border-left: 3px solid var(--warn);
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #7a5500;
      line-height: 1.5;
    }

    /* Footer */
    .app-footer {
      margin-top: 24px;
      font-size: 12px;
      color: var(--grey3);
      text-align: center;
      line-height: 1.7;
    }
    .app-footer a { color: var(--teal); text-decoration: none; }

    @media (max-width: 520px) {
      .header h1 { font-size: 22px; }
      .card-body { padding: 18px; }
      .preview-frame { width: 280px; height: 373px; }
      .zoom-row, .btn-row { width: 280px; }
    }
  `}</style>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CheckIcon = ({ text }) => {
  const isOk   = /good|acceptable|well|bright/i.test(text);
  const isWarn = /too|dark|small|large|no face/i.test(text);
  const cls    = isOk ? "ok" : isWarn ? "warn" : "info";
  return (
    <span className={`check-icon ${cls}`}>
      {isOk ? "✓" : isWarn ? "!" : "i"}
    </span>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [image, setImage]               = useState(null);
  const [scale, setScale]               = useState(1);
  const [baseScale, setBaseScale]       = useState(1);
  const [position, setPosition]         = useState({ x: 0, y: 0 });
  const [defaultScale, setDefaultScale] = useState(1);
  const [defaultPosition, setDefaultPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging]         = useState(false);
  const [start, setStart]               = useState({ x: 0, y: 0 });
  const [status, setStatus]             = useState("Loading face detection model…");
  const [statusType, setStatusType]     = useState("info");
  const [faceStatus, setFaceStatus]     = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [checks, setChecks]             = useState([]);
  const [step, setStep]                 = useState(1); // 1=upload 2=adjust 3=done

  const pendingAutoAdjustRef  = useRef(null);
  const pinchStartDistance    = useRef(null);
  const pinchStartScale       = useRef(1);

  const frameWidth  = 300;
  const frameHeight = 400;
  const exportWidth  = 1200;
  const exportHeight = 1600;

  useEffect(() => {
    faceapi.nets.tinyFaceDetector
      .loadFromUri("https://justadudewhohacks.github.io/face-api.js/models")
      .then(() => { setStatus("Ready — upload a photo to begin."); setStatusType("ok"); })
      .catch(() => { setStatus("Could not load face detection."); setStatusType("error"); });
  }, []);

  const resizeImageForProcessing = (file) =>
    new Promise((resolve, reject) => {
      const original = new Image();
      original.onload = () => {
        const maxSide = 1200;
        const ratio = Math.max(original.width, original.height) > maxSide
          ? maxSide / Math.max(original.width, original.height) : 1;
        const w = Math.round(original.width * ratio);
        const h = Math.round(original.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(original, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const img = new Image();
        img.onload = () => resolve({ dataUrl, img });
        img.onerror = reject;
        img.src = dataUrl;
      };
      original.onerror = reject;
      original.src = URL.createObjectURL(file);
    });

  const checkBackground = (img) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0, n = 0;
    for (let i = 0; i < data.length; i += 40) {
      total += (data[i] + data[i+1] + data[i+2]) / 3; n++;
    }
    const avg = total / n;
    if (avg < 150) return "Background may be too dark for passport requirements.";
    if (avg > 240) return "Background looks very bright (likely acceptable).";
    return "Background brightness looks acceptable.";
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      setStep(1);
      setStatus("Preparing image…");
      setStatusType("info");
      setFaceStatus(""); setChecks([]); setImage(null);
      setScale(1); setPosition({ x: 0, y: 0 });

      setProcessingMsg("Resizing image…");
      const processed = await resizeImageForProcessing(file);
      const originalImg = processed.img;

      const fitScale = Math.min(frameWidth / originalImg.width, frameHeight / originalImg.height);

      setProcessingMsg("Detecting face…");
      const detection = await faceapi.detectSingleFace(
        originalImg,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      );

      const bgResult = checkBackground(originalImg);
      let autoScale = 1, autoX = 0, autoY = 0;

      if (detection) {
        const box = detection.box;
        const checkResults = [bgResult];

        const fhRatio = box.height / originalImg.height;
        const fxRatio = (box.x + box.width / 2) / originalImg.width;
        const fyRatio = (box.y + box.height / 2) / originalImg.height;

        checkResults.push(
          fhRatio < 0.25 ? "Face looks too small in original photo." :
          fhRatio > 0.55 ? "Face looks too large in original photo." :
                           "Face size looks acceptable."
        );
        checkResults.push(
          fxRatio < 0.4 ? "Face is too far left in original photo." :
          fxRatio > 0.6 ? "Face is too far right in original photo." :
                          "Face is horizontally well centered."
        );
        checkResults.push(
          fyRatio < 0.35 ? "Face is too high in original photo." :
          fyRatio > 0.55 ? "Face is too low in original photo." :
                           "Face is vertically well placed."
        );
        setChecks(checkResults);

        const targetFaceH = frameHeight * 0.72;
        autoScale = Math.max(0.9, Math.min(targetFaceH / (box.height * fitScale), 2.5));

        const faceCX = (box.x + box.width / 2) * fitScale * autoScale;
        const faceCY = (box.y + box.height / 2) * fitScale * autoScale;
        autoX = frameWidth / 2 - faceCX;
        autoY = frameHeight * 0.42 - faceCY;

        const faceRatio = (box.height * fitScale * autoScale) / frameHeight;
        if (faceRatio < 0.65)      { setFaceStatus("Face too small — zoom in.");  setStatusType("warn"); }
        else if (faceRatio > 0.85) { setFaceStatus("Face too large — zoom out."); setStatusType("warn"); }
        else                       { setFaceStatus("Face size looks good ✓");     setStatusType("ok");   }

        setStatus("Face detected — adjust if needed.");
        setStatusType("ok");
      } else {
        setChecks([bgResult, "No face detected — compliance checks skipped."]);
        setStatus("No face detected. Position manually.");
        setStatusType("warn");
      }

      setBaseScale(fitScale);
      setDefaultScale(autoScale);
      setDefaultPosition({ x: autoX, y: autoY });
      pendingAutoAdjustRef.current = { scale: autoScale, position: { x: autoX, y: autoY } };
      setImage(processed.dataUrl);
      setIsProcessing(false);
      setStep(2);
    } catch (err) {
      console.error(err);
      setStatus("Image processing failed."); setStatusType("error");
      setIsProcessing(false);
    }
  };

  const handlePreviewImageLoad = () => {
    if (!pendingAutoAdjustRef.current) return;
    const { scale, position } = pendingAutoAdjustRef.current;
    requestAnimationFrame(() => {
      setScale(scale);
      setPosition(position);
      pendingAutoAdjustRef.current = null;
    });
  };

  const startDrag  = (cx, cy) => { setDragging(true); setStart({ x: cx - position.x, y: cy - position.y }); };
  const moveDrag   = (cx, cy) => { if (!dragging) return; setPosition({ x: cx - start.x, y: cy - start.y }); };
  const stopDrag   = ()       => setDragging(false);

  const getTouchDist = (t) => {
    const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) {
      setDragging(false);
      pinchStartDistance.current = getTouchDist(e.touches);
      pinchStartScale.current = scale;
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    else if (e.touches.length === 2) {
      e.preventDefault();
      if (pinchStartDistance.current)
        setScale(Math.max(0.8, Math.min(pinchStartScale.current * getTouchDist(e.touches) / pinchStartDistance.current, 3)));
    }
  };
  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) { stopDrag(); pinchStartDistance.current = null; }
    else if (e.touches.length === 1) {
      pinchStartDistance.current = null;
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const resetPhoto = () => { setScale(defaultScale); setPosition({ ...defaultPosition }); };

  const downloadImage = () => {
    if (!image) return;
    setStep(3);
    const canvas = document.createElement("canvas");
    canvas.width = exportWidth; canvas.height = exportHeight;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const ps = baseScale * scale;
      const sw = img.width * ps, sh = img.height * ps;
      const em = exportWidth / frameWidth;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(img,
        (frameWidth  / 2 + position.x - sw / 2) * em,
        (frameHeight / 2 + position.y - sh / 2) * em,
        sw * em, sh * em
      );
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.download = "nz-passport-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = image;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: "Upload"  },
    { n: 2, label: "Adjust"  },
    { n: 3, label: "Export"  },
  ];

  return (
    <>
      <GlobalStyles />
      <div
        className="app-shell"
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={stopDrag}
      >
        {/* Header */}
        <header className="header">
          <div className="header-badge"><span className="dot" />NZ Passport Standard</div>
          <h1>Passport Photo <span>Adjuster</span></h1>
          <p>Auto-detect, centre &amp; export your passport photo to<br />New Zealand specification (35 × 45 mm, 1200 × 1600 px).</p>
        </header>

        {/* Card */}
        <div className="card">

          {/* Steps */}
          <div className="steps-bar">
            {steps.map(s => (
              <div key={s.n} className={`step-item ${step === s.n ? "active" : step > s.n ? "done" : ""}`}>
                <div className="step-num">{step > s.n ? "✓" : s.n}</div>
                {s.label}
              </div>
            ))}
          </div>

          <div className="card-body">

            {/* Status */}
            <div className={`status-pill ${statusType}`}>
              {isProcessing && <span className="spinner" />}
              {status}
            </div>

            {/* Upload zone — always visible */}
            {!image && !isProcessing && (
              <div className="upload-zone" style={{ marginTop: 20 }}>
                <input type="file" accept="image/*" onChange={handleUpload} />
                <div className="upload-icon">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3>Choose a photo</h3>
                <p>JPG, PNG, HEIC · Max 20 MB</p>
              </div>
            )}

            {/* Re-upload when image loaded */}
            {image && !isProcessing && (
              <div style={{ marginTop: 16, position: "relative" }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "var(--grey3)",
                  cursor: "pointer", padding: "6px 12px",
                  border: "1px solid var(--grey1)", borderRadius: 8,
                  background: "var(--white)"
                }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Change photo
                  <input type="file" accept="image/*" onChange={handleUpload}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                </label>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="processing-block">
                <div className="big-spinner" />
                <p>{processingMsg}</p>
              </div>
            )}

            {/* Preview + controls */}
            {image && !isProcessing && (
              <>
                {/* Face size status */}
                {faceStatus && (
                  <div style={{
                    marginTop: 14, padding: "8px 14px", borderRadius: 8,
                    background: faceStatus.includes("good") ? "rgba(39,174,96,0.1)" : "rgba(232,160,32,0.1)",
                    color: faceStatus.includes("good") ? "var(--ok)" : "#c07810",
                    fontSize: 13, fontWeight: 500
                  }}>
                    {faceStatus}
                  </div>
                )}

                {/* Preview frame */}
                <div className="preview-wrapper" style={{ marginTop: 20 }}>
                  <div className="preview-label">Preview — drag to reposition</div>

                  <div
                    className="preview-frame"
                    style={{ width: frameWidth, height: frameHeight }}
                    onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <img
                      src={image}
                      alt="preview"
                      onLoad={handlePreviewImageLoad}
                      draggable="false"
                      style={{
                        transform: `translate(-50%, -50%) scale(${baseScale * scale})`,
                        left: `calc(50% + ${position.x}px)`,
                        top:  `calc(50% + ${position.y}px)`,
                      }}
                    />

                    {/* Guide oval — NZ passport approx head position */}
                    <div className="guide-overlay">
                      <svg width="180" height="220" viewBox="0 0 180 220" fill="none">
                        <ellipse cx="90" cy="110" rx="88" ry="108"
                          stroke="rgba(0,180,166,0.7)" strokeWidth="1.5" strokeDasharray="6 4" />
                        {/* horizontal centre line */}
                        <line x1="70" y1="110" x2="110" y2="110"
                          stroke="rgba(0,180,166,0.4)" strokeWidth="1" />
                        {/* vertical centre line */}
                        <line x1="90" y1="90" x2="90" y2="130"
                          stroke="rgba(0,180,166,0.4)" strokeWidth="1" />
                      </svg>
                    </div>

                    {/* Corner marks */}
                    <div className="corner tl" /><div className="corner tr" />
                    <div className="corner bl" /><div className="corner br" />
                  </div>

                  {/* Zoom slider */}
                  <div className="zoom-row">
                    <span className="zoom-label">Zoom</span>
                    <input type="range" min="0.8" max="3" step="0.01"
                      value={scale} onChange={(e) => setScale(Number(e.target.value))} />
                    <span className="zoom-value">{(scale * 100).toFixed(0)}%</span>
                  </div>

                  {/* Action buttons */}
                  <div className="btn-row">
                    <button className="btn btn-ghost" onClick={resetPhoto}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
                      </svg>
                      Reset
                    </button>
                    <button className="btn btn-primary" onClick={downloadImage}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Download Photo
                    </button>
                  </div>
                </div>

                {/* Checks */}
                {checks.length > 0 && (
                  <div className="checks-panel">
                    <div className="checks-header">Photo compliance checks</div>
                    {checks.map((c, i) => (
                      <div className="check-row" key={i}>
                        <CheckIcon text={c} />
                        {c}
                      </div>
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                <div className="disclaimer">
                  ⚠️ These checks are informational only. Always verify your final photo using the
                  {" "}<a href="https://www.passportphotochecker.com/nz" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}>official NZ photo checker</a>.
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="app-footer">
          NZ Passport Photo Adjuster · Exports 1200 × 1600 px (35 × 45 mm equivalent)<br />
          <a href="https://www.govt.nz/browse/passports/" target="_blank" rel="noopener noreferrer">NZ passport photo requirements ↗</a>
        </footer>
      </div>
    </>
  );
}
 
 