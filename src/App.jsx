import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { removeBackground } from "@imgly/background-removal";

export default function App() {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [defaultScale, setDefaultScale] = useState(1);
  const [defaultPosition, setDefaultPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState("Loading face detection model...");
  const [faceStatus, setFaceStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checks, setChecks] = useState([]);

  const pendingAutoAdjustRef = useRef(null);
  const pinchStartDistance = useRef(null);
  const pinchStartScale = useRef(1);

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
        const largestSide = Math.max(original.width, original.height);
        const resizeRatio = largestSide > maxSide ? maxSide / largestSide : 1;

        const newWidth = Math.round(original.width * resizeRatio);
        const newHeight = Math.round(original.height * resizeRatio);

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

  const checkBackground = (img) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let totalBrightness = 0;
    let samples = 0;

    for (let i = 0; i < imageData.length; i += 40) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];

      const brightness = (r + g + b) / 3;

      totalBrightness += brightness;
      samples++;
    }

    const avgBrightness = totalBrightness / samples;

    if (avgBrightness < 150) {
      return "Background may be too dark for passport requirements.";
    }

    if (avgBrightness > 240) {
      return "Background looks very bright (likely acceptable).";
    }

    return "Background brightness looks acceptable.";
  };

  const removePhotoBackground = async (imageUrl) => {
    try {
      const blob = await removeBackground(imageUrl);
      const newUrl = URL.createObjectURL(blob);
      return newUrl;
    } catch (error) {
      console.error("Background removal failed:", error);
      return imageUrl;
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setStatus("Preparing image...");
      setFaceStatus("");
      setChecks([]);
      setImage(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDefaultScale(1);
      setDefaultPosition({ x: 0, y: 0 });

      const processed = await resizeImageForProcessing(file);
      const img = processed.img;
      const backgroundResult = checkBackground(img);
      let imageUrl = processed.dataUrl;

      imageUrl = await removePhotoBackground(imageUrl);

      const fitScale = Math.min(frameWidth / img.width, frameHeight / img.height);

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

        const checkResults = [];

        checkResults.push(backgroundResult);

        const faceHeightRatio = box.height / img.height;
        const faceCenterXRatio = (box.x + box.width / 2) / img.width;
        const faceCenterYRatio = (box.y + box.height / 2) / img.height;

        if (faceHeightRatio < 0.25) {
          checkResults.push("Face looks too small in the original photo.");
        } else if (faceHeightRatio > 0.55) {
          checkResults.push("Face looks too large in the original photo.");
        } else {
          checkResults.push("Face size looks acceptable.");
        }

        if (faceCenterXRatio < 0.4) {
          checkResults.push("Face is too far left in the original photo.");
        } else if (faceCenterXRatio > 0.6) {
          checkResults.push("Face is too far right in the original photo.");
        } else {
          checkResults.push("Face is horizontally well centered.");
        }

        if (faceCenterYRatio < 0.35) {
          checkResults.push("Face is too high in the original photo.");
        } else if (faceCenterYRatio > 0.55) {
          checkResults.push("Face is too low in the original photo.");
        } else {
          checkResults.push("Face is vertically well placed.");
        }

        setChecks(checkResults);

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
        autoScale = 1;
        autoX = 0;
        autoY = 0;
        setFaceStatus("");
        setChecks(["No face detected, so compliance checks could not be completed."]);
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

  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      setDragging(false);
      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && dragging) {
      const touch = e.touches[0];
      moveDrag(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);

      if (pinchStartDistance.current) {
        const zoomFactor = currentDistance / pinchStartDistance.current;
        const newScale = pinchStartScale.current * zoomFactor;
        setScale(Math.max(0.8, Math.min(newScale, 3)));
      }
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

        {checks.length > 0 && (
          <div
            style={{
              background: "#f8f8f8",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "12px",
              margin: "12px 0",
            }}
          >
            <p style={{ fontWeight: "bold", marginTop: 0 }}>Photo checks:</p>
            {checks.map((check, index) => (
              <p key={index} style={{ margin: "6px 0", fontSize: "14px", color: "#333" }}>
                {check}
              </p>
            ))}
          </div>
        )}

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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
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