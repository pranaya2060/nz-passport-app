import { useEffect, useState } from "react";
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
            width: resizedImg.width,
            height: resizedImg.height,
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
      setStatus("Preparing image...");
      setFaceStatus("");
      setImage(null);
      setScale(1);
      setBaseScale(1);
      setPosition({ x: 0, y: 0 });

      const processed = await resizeImageForProcessing(file);
      const img = processed.img;
      const imageUrl = processed.dataUrl;

      setImage(imageUrl);

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

        setScale(autoScale);
        setPosition({ x: autoX, y: autoY });

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
    } catch (error) {
      console.error(error);
      setStatus("Image processing failed.");
      setFaceStatus("");
    }
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - start.x,
      y: e.clientY - start.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
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
        fontFamily: "Arial",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: "30px",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <h1>NZ Passport Photo Adjuster</h1>
      <p>Upload, drag, and zoom your photo into a 3:4 passport frame.</p>
      <p style={{ fontWeight: "bold" }}>{status}</p>
      <p style={{ color: "blue", fontWeight: "bold" }}>{faceStatus}</p>

      <input type="file" accept="image/*" onChange={handleUpload} />

      {image && (
        <>
          <div style={{ marginTop: "20px" }}>
            <label>Zoom: </label>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.01"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </div>

          <div style={{ marginTop: "30px" }}>
            <h3>Preview</h3>

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
              }}
            >
              <img
                src={image}
                alt="preview"
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

            <button
              onClick={downloadImage}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Download Passport Photo
            </button>
          </div>
        </>
      )}
    </div>
  );
}