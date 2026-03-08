import { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";

export default function App() {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("Loading face detection model...");
  const [faceStatus, setFaceStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const previewImgRef = useRef(null);
  const pendingAutoAdjustRef = useRef(null);
  const frameRef = useRef(null);
  const pinchStartDistance = useRef(null);
  const pinchStartScale = useRef(1);
  const pinchStartPosition = useRef({ x: 0, y: 0 });
  const pinchCenterStart = useRef({ x: 0, y: 0 });
  const [defaultScale, setDefaultScale] = useState(1);
  const [defaultPosition, setDefaultPosition] = useState({ x: 0, y: 0 });

  const frameWidth = 300;
  const frameHeight = 400;
  const exportWidth = 1200;
  const exportHeight = 1600;

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(
          "https://justadudewhohacks.github.io/face-api.js/models"
        );
        setStatus("Face detection ready.");
      } catch (error) {
        console.error(error);
        setStatus("Could not load face detection model.");
      }
    };

    loadModels();
  }, []);

  const resizeImageForProcessing = (file) => {
    return new Promise((resolve, reject) => {
      const original = new Image();
      original.onload = () => {
        const maxSide = 1200;
        let { width, height } = original;

        const largestSide = Math.max(width, height);
        const resizeRatio = largestSide > maxSide ? maxSide / largestSide : 1;

        const newWidth = Math.round(width * resizeRatio);
        const newHeight = Math.round(height * resizeRatio);

        const canvas = document.createElement("canvas");
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(original, 0, 0, newWidth, newHeight);

        const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

        const resizedImg = new Image();
        resizedImg.onload = () => {
          resolve({
            dataUrl: resizedDataUrl,
            img: resizedImg,
          });
        };
        resizedImg.onerror = reject;
        resizedImg.src = resizedDataUrl;
      };

      original.onerror = reject;
      original.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatus("Preparing image...");
      setFaceStatus("");
      setImage(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDefaultScale(1);
      setDefaultPosition({ x: 0, y: 0 });

      const processed = await resizeImageForProcessing(file);
      const img = processed.img;
      const imageUrl = processed.dataUrl;

      const fitScale = Math.min(frameWidth / img.width, frameHeight / img.height);
      setBaseScale(fitScale);

      let autoScale = 1;
      let autoX = 0;
      let autoY = 0;

      setStatus("Detecting face...");

      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        })
      );

      if (detection) {
        const box = detection.box;

        const targetFaceHeight = frameHeight * 0.72;
        const currentFaceHeight = box.height * fitScale;
        autoScale = targetFaceHeight / currentFaceHeight;
        autoScale = Math.max(0.9, Math.min(autoScale, 2.5));

        const displayedImageWidth = img.width * fitScale * autoScale;
        const displayedImageHeight = img.height * fitScale * autoScale;

        const faceCenterX = (box.x + box.width / 2) * fitScale * autoScale;
        const faceCenterY = (box.y + box.height / 2) * fitScale * autoScale;

        const targetCenterX = frameWidth / 2;
        const targetCenterY = frameHeight * 0.42;

        autoX = targetCenterX - (faceCenterX - displayedImageWidth / 2);
        autoY = targetCenterY - (faceCenterY - displayedImageHeight / 2);

        const faceRatio = (box.height * fitScale * autoScale) / frameHeight;

        if (faceRatio < 0.65) {
          setFaceStatus("Face too small — zoom in.");
        } else if (faceRatio > 0.85) {
          setFaceStatus("Face too large — zoom out.");
        } else {
          setFaceStatus("Face size looks good.");
        }

        setStatus("Face detected and auto-positioned.");
      } else {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setFaceStatus("");
        setStatus("No face detected. You can still drag manually.");
      }

      setBaseScale(fitScale);
      setDefaultScale(autoScale);
      setDefaultPosition({ x: autoX, y: autoY });

      pendingAutoAdjustRef.current = {
        scale: autoScale,
        position: { x: autoX, y: autoY },
      };

      setImage(imageUrl);
      setIsProcessing(false);
    } catch (error) {
      console.error(error);
      setStatus("Image processing failed.");
      setFaceStatus("");
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

  const getTouchMidpoint = (touches) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const startDrag = (clientX, clientY) => {
    setDragging(true);
    setStart({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragging) return;
    setPosition({
      x: clientX - start.x,
      y: clientY - start.y,
    });
  };

  const stopDrag = () => {
    setDragging(false);
  };

  const handleMouseDown = (e) => startDrag(e.clientX, e.clientY);
  const handleMouseMove = (e) => moveDrag(e.clientX, e.clientY);
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      setDragging(false);

      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = scale;
      pinchStartPosition.current = { ...position };
      pinchCenterStart.current = getTouchMidpoint(e.touches);
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      const touch = e.touches[0];
      moveDrag(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      if (!pinchStartDistance.current || !frameRef.current) return;

      const zoomFactor = currentDistance / pinchStartDistance.current;
      const newScale = Math.max(0.8, Math.min(pinchStartScale.current * zoomFactor, 3));

      const rect = frameRef.current.getBoundingClientRect();
      const currentMid = getTouchMidpoint(e.touches);

      const startMidX = pinchCenterStart.current.x - rect.left;
      const startMidY = pinchCenterStart.current.y - rect.top;

      const frameCenterX = rect.width / 2;
      const frameCenterY = rect.height / 2;

      const worldX =
        (startMidX - frameCenterX - pinchStartPosition.current.x) /
        (baseScale * pinchStartScale.current);

      const worldY =
        (startMidY - frameCenterY - pinchStartPosition.current.y) /
        (baseScale * pinchStartScale.current);

      const newPositionX = startMidX - frameCenterX - worldX * (baseScale * newScale);
      const newPositionY = startMidY - frameCenterY - worldY * (baseScale * newScale);

      setScale(newScale);
      setPosition({
        x: newPositionX,
        y: newPositionY,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      stopDrag();
      pinchStartDistance.current = null;
    } else if (e.touches.length === 1) {
      pinchStartDistance.current = null;
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    }
  };

  const resetPhoto = () => {
    setScale(defaultScale);
    setPosition({ ...defaultPosition });
    setStatus("Photo reset to auto-position.");
  };

  const downloadImage = () => {
    if (!image) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    const img = new Image();
    img.onload = () => {
      const previewScale = baseScale * scale;
      const scaledWidth = img.width * previewScale;
      const scaledHeight = img.height * previewScale;
      const exportMultiplier = exportWidth / frameWidth;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      ctx.drawImage(
        img,
        (frameWidth / 2 - scaledWidth / 2 + position.x) * exportMultiplier,
        (frameHeight / 2 - scaledHeight / 2 + position.y) * exportMultiplier,
        scaledWidth * exportMultiplier,
        scaledHeight * exportMultiplier
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "passport-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = image;
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: "20px",
        background: "#f5f5f5",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: "28px", textAlign: "center" }}>
          NZ Passport Photo Adjuster
        </h1>

        <p style={{ textAlign: "center", color: "#444" }}>
          Upload, auto-center, adjust, and export a passport-style photo.
        </p>

        <p style={{ fontWeight: "bold", textAlign: "center" }}>{status}</p>
        <p style={{ color: "blue", fontWeight: "bold", textAlign: "center" }}>
          {faceStatus}
        </p>

        <p
          style={{
            fontSize: "13px",
            color: "#666",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          Final photo should still be checked with the official NZ photo checker.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: "block", margin: "0 auto 16px auto" }}
        />

        {isProcessing && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              background: "#fafafa",
              borderRadius: "12px",
              marginBottom: "16px",
            }}
          >
            Processing image...
          </div>
        )}

        {image && !isProcessing && (
          <>
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <label>Zoom: </label>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <div
                ref={frameRef}
                style={{
                  width: `${frameWidth}px`,
                  height: `${frameHeight}px`,
                  border: "4px solid black",
                  margin: "auto",
                  overflow: "hidden",
                  position: "relative",
                  background: "#ffffff",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                  maxWidth: "100%",
                }}
              >
                <img
                  ref={previewImgRef}
                  src={image}
                  alt="preview"
                  onLoad={handlePreviewImageLoad}
                  onMouseDown={handleMouseDown}
                  draggable="false"
                  style={{
                    position: "absolute",
                    left: `calc(50% + ${position.x}px)`,
                    top: `calc(50% + ${position.y}px)`,
                    transform: `translate(-50%, -50%) scale(${baseScale * scale})`,
                    userSelect: "none",
                    maxWidth: "none",
                    maxHeight: "none",
                    /* pointerEvents must be enabled for mouse drag */
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    width: "180px",
                    height: "220px",
                    border: "2px dashed red",
                    borderRadius: "50%",
                    left: "50%",
                    top: "45%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              <p style={{ marginTop: "10px" }}>Passport ratio preview (3:4)</p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  marginTop: "16px",
                }}
              >
                <button
                  onClick={resetPhoto}
                  style={{
                    padding: "10px 16px",
                    fontSize: "16px",
                    cursor: "pointer",
                    borderRadius: "10px",
                    border: "1px solid #ccc",
                    background: "#f3f3f3",
                  }}
                >
                  Reset
                </button>

                <button
                  onClick={downloadImage}
                  style={{
                    padding: "10px 16px",
                    fontSize: "16px",
                    cursor: "pointer",
                    borderRadius: "10px",
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                  }}
                >
                  Download Passport Photo
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}