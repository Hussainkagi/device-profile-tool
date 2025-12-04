"use client";

import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Video,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader,
  Info,
  Usb,
  RefreshCw,
} from "lucide-react";

const IPCameraDeviceProfile = () => {
  const [deviceType, setDeviceType] = useState("mobile");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [images, setImages] = useState<any>([]);
  const [videoFile, setVideoFile] = useState<any>(null);
  const [ipCameras, setIpCameras] = useState<any>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [apiEndpoint, setApiEndpoint] = useState("");

  const [showAddCamera, setShowAddCamera] = useState(false);
  const [newCameraName, setNewCameraName] = useState("");
  const [newCameraUrl, setNewCameraUrl] = useState("");
  const [cameraStreamType, setCameraStreamType] = useState("mjpeg");
  const [connectionError, setConnectionError] = useState("");

  const [rtspUsername, setRtspUsername] = useState("");
  const [rtspPassword, setRtspPassword] = useState("");
  const [showRtspInfo, setShowRtspInfo] = useState(false);

  const [localDevices, setLocalDevices] = useState<any>([]);
  const [selectedLocalDevice, setSelectedLocalDevice] = useState("");
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const videoRef = useRef<any>(null);
  const canvasStreamRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any>([]);
  const streamRef = useRef<any>(null);
  const captureIntervalRef = useRef<any>(null);

  useEffect(() => {
    const savedCameras = localStorage.getItem("ipCameras");
    if (savedCameras) {
      setIpCameras(JSON.parse(savedCameras));
    } else {
      setIpCameras([
        {
          id: "cam1",
          name: "Camera 1 - Example",
          url: "http://your-camera-ip:port/video",
          type: "mjpeg",
        },
      ]);
    }

    loadLocalDevices();
  }, []);

  useEffect(() => {
    if (ipCameras.length > 0) {
      localStorage.setItem("ipCameras", JSON.stringify(ipCameras));
    }
  }, [ipCameras]);

  const loadLocalDevices = async () => {
    setIsLoadingDevices(true);
    try {
      // First request permission to access cameras
      // This ensures we get device labels for all cameras including external ones
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      // Stop the stream immediately, we just needed permission
      permissionStream.getTracks().forEach((track) => track.stop());

      // Now enumerate devices - we should get proper labels now
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      console.log("Found video devices:", videoDevices);
      setLocalDevices(videoDevices);
    } catch (error) {
      console.error("Error loading local devices:", error);
      // Try to enumerate anyway, might work without permission
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setLocalDevices(videoDevices);
      } catch (err) {
        console.error("Could not enumerate devices:", err);
      }
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const addCamera = () => {
    if (!newCameraName || !newCameraUrl) {
      alert("Please enter both camera name and URL");
      return;
    }

    let finalUrl = newCameraUrl;
    if (cameraStreamType === "rtsp" && rtspUsername && rtspPassword) {
      const urlWithoutProtocol = newCameraUrl.replace(/^rtsp:\/\//, "");
      finalUrl = `rtsp://${rtspUsername}:${rtspPassword}@${urlWithoutProtocol}`;
    }

    const newCamera = {
      id: `cam_${Date.now()}`,
      name: newCameraName,
      url: finalUrl,
      type: cameraStreamType,
    };

    setIpCameras([...ipCameras, newCamera]);
    setNewCameraName("");
    setNewCameraUrl("");
    setRtspUsername("");
    setRtspPassword("");
    setShowAddCamera(false);
  };

  const removeCamera = (cameraId: any) => {
    setIpCameras(ipCameras.filter((cam: any) => cam.id !== cameraId));
    if (selectedCamera === cameraId) {
      disconnectCamera();
    }
  };

  const connectToLocalDevice = async (deviceId: any) => {
    try {
      setConnectionError("");
      setIsCapturing(true);
      setSelectedCamera("");
      setSelectedLocalDevice(deviceId);

      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      canvasStreamRef.current = stream;
    } catch (error: any) {
      console.error("Error accessing local camera:", error);
      setConnectionError(`Failed to access local camera: ${error.message}`);
      setIsCapturing(false);
      setSelectedLocalDevice("");
    }
  };

  const connectToCamera = async (cameraId: any) => {
    try {
      setConnectionError("");
      setIsCapturing(true);
      setSelectedCamera(cameraId);
      setSelectedLocalDevice("");

      const camera = ipCameras.find((cam: any) => cam.id === cameraId);
      if (!camera) {
        throw new Error("Camera not found");
      }

      if (camera.type === "rtsp") {
        setConnectionError(
          "RTSP streams (like EZVIZ) require a media server to convert to HLS or WebRTC. " +
            "Please use MediaMTX, ffmpeg, or a similar tool to convert your RTSP stream to HLS, " +
            "then add it as an HLS camera instead. Example: Use ffmpeg to convert RTSP to HLS and serve it."
        );
        setIsCapturing(false);
        setSelectedCamera("");
        return;
      }

      if (videoRef.current) {
        if (camera.type === "mjpeg") {
          videoRef.current.src = camera.url;

          const canvas = document.createElement("canvas");
          canvas.width = 1280;
          canvas.height = 720;
          const ctx: any = canvas.getContext("2d");

          captureIntervalRef.current = setInterval(() => {
            if (videoRef.current && videoRef.current.complete) {
              ctx.drawImage(
                videoRef.current,
                0,
                0,
                canvas.width,
                canvas.height
              );
            }
          }, 33);

          canvasStreamRef.current = canvas.captureStream(30);
        } else if (camera.type === "hls") {
          videoRef.current.src = camera.url;
          videoRef.current.play();
        } else if (camera.type === "direct") {
          videoRef.current.src = camera.url;
          videoRef.current.play();
        }
      }
    } catch (error: any) {
      console.error("Error connecting to IP camera:", error);
      setConnectionError(`Failed to connect to camera: ${error.message}`);
      setIsCapturing(false);
      setSelectedCamera("");
    }
  };

  const disconnectCamera = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
    canvasStreamRef.current = null;
    setIsCapturing(false);
    setSelectedCamera("");
    setSelectedLocalDevice("");
    setConnectionError("");
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");

    if (videoRef.current.tagName === "IMG") {
      canvas.width = videoRef.current.naturalWidth || 1280;
      canvas.height = videoRef.current.naturalHeight || 720;
    } else {
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
    }

    const ctx: any = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob: any) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImages((prev: any) => [
          ...prev,
          { file, preview: URL.createObjectURL(blob) },
        ]);
      },
      "image/jpeg",
      0.95
    );
  };

  const startRecording = () => {
    const stream = canvasStreamRef.current || streamRef.current;
    if (!stream) {
      alert(
        "Cannot record from this camera. Please connect to a camera first."
      );
      return;
    }

    recordedChunksRef.current = [];
    const options = { mimeType: "video/webm;codecs=vp9" };

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch (e) {
      console.error("MediaRecorder error:", e);
      mediaRecorderRef.current = new MediaRecorder(stream);
    }

    mediaRecorderRef.current.ondataavailable = (event: any) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `recording_${Date.now()}.webm`, {
        type: "video/webm",
      });
      setVideoFile({ file, preview: URL.createObjectURL(blob) });
      setIsRecording(false);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const removeImage = (index: any) => {
    setImages((prev: any) => prev.filter((_: any, i: any) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
  };

  const handleSubmit = async () => {
    if (!trackingNumber) {
      alert("Please enter a tracking number");
      return;
    }

    if (images.length === 0) {
      alert("Please capture at least one image");
      return;
    }

    setUploadStatus("uploading");

    const formData = new FormData();
    formData.append("device_type", deviceType);
    formData.append("tracking_number", trackingNumber);

    images.forEach((img: any, index: any) => {
      formData.append("images_array", img.file);
    });

    if (videoFile) {
      formData.append("video", videoFile.file);
    }

    try {
      const endpoint =
        apiEndpoint ||
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/device-profile/devices`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadStatus("success");
        setTimeout(() => {
          setTrackingNumber("");
          setImages([]);
          setVideoFile(null);
          setUploadStatus(null);
          disconnectCamera();
        }, 2000);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Camera className="w-8 h-8" />
              IP Camera Device Profile Creator
            </h1>
            <p className="text-blue-100 mt-2">
              Connect to external IP cameras, EZVIZ (RTSP), or local USB/webcam
              devices
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <label className="block text-sm font-medium text-white mb-2">
                  API Endpoint (Optional)
                </label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="{{API_ENDPOINT}}/api/v1/device-profile/devices"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="tablet">Tablet</option>
                    <option value="laptop">Laptop</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Tracking Number *
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Usb className="w-5 h-5 text-white" />
                    <label className="block text-sm font-medium text-white">
                      Local USB/Webcam Devices ({localDevices.length})
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={loadLocalDevices}
                    disabled={isLoadingDevices}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isLoadingDevices ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                </div>

                {isLoadingDevices ? (
                  <div className="text-center py-8">
                    <Loader className="w-8 h-8 text-white animate-spin mx-auto" />
                    <p className="text-white/70 mt-2">Loading cameras...</p>
                  </div>
                ) : localDevices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {localDevices.map((device: any, index: any) => (
                      <div
                        key={device.deviceId}
                        className={`relative p-4 rounded-lg border-2 transition-all ${
                          selectedLocalDevice === device.deviceId
                            ? "bg-green-600 border-green-400 text-white"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => connectToLocalDevice(device.deviceId)}
                          disabled={
                            isCapturing &&
                            selectedLocalDevice !== device.deviceId
                          }
                          className="w-full text-left disabled:opacity-50"
                        >
                          <Usb className="w-6 h-6 mb-2" />
                          <p className="text-sm font-medium">
                            {device.label || `Camera ${index + 1}`}
                          </p>
                          <p className="text-xs opacity-70 mt-1">
                            {device.label ? "USB/Webcam" : "Local Camera"}
                          </p>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Camera className="w-12 h-12 text-white/30 mx-auto mb-2" />
                    <p className="text-white/70">No cameras detected</p>
                    <p className="text-white/50 text-sm mt-1">
                      Make sure your camera is connected and click Refresh
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-white">
                    IP Cameras
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCamera(!showAddCamera)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Camera
                  </button>
                </div>

                {showAddCamera && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                    <input
                      type="text"
                      value={newCameraName}
                      onChange={(e) => setNewCameraName(e.target.value)}
                      placeholder="Camera name (e.g., EZVIZ Warehouse Cam)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={newCameraUrl}
                      onChange={(e) => setNewCameraUrl(e.target.value)}
                      placeholder={
                        cameraStreamType === "rtsp"
                          ? "192.168.1.100:554/h264/ch1/main/av_stream"
                          : "Camera URL (e.g., http://192.168.1.100:8080/video)"
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                      value={cameraStreamType}
                      onChange={(e) => {
                        setCameraStreamType(e.target.value);
                        setShowRtspInfo(e.target.value === "rtsp");
                      }}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mjpeg">MJPEG Stream</option>
                      <option value="hls">HLS Stream (.m3u8)</option>
                      <option value="rtsp">RTSP Stream (EZVIZ)</option>
                      <option value="direct">Direct Video URL</option>
                    </select>

                    {cameraStreamType === "rtsp" && (
                      <>
                        <input
                          type="text"
                          value={rtspUsername}
                          onChange={(e) => setRtspUsername(e.target.value)}
                          placeholder="RTSP Username (e.g., admin)"
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="password"
                          value={rtspPassword}
                          onChange={(e) => setRtspPassword(e.target.value)}
                          placeholder="RTSP Password"
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 flex gap-2">
                          <Info className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-yellow-100">
                            <p className="font-semibold mb-1">
                              ⚠️ RTSP Requires Additional Setup
                            </p>
                            <p className="mb-2">
                              RTSP streams (like EZVIZ) cannot play directly in
                              browsers. You need to:
                            </p>
                            <ol className="list-decimal ml-4 space-y-1">
                              <li>
                                Install MediaMTX or use ffmpeg to convert RTSP
                                to HLS
                              </li>
                              <li>
                                Run:{" "}
                                <code className="bg-black/30 px-1 rounded">
                                  mediamtx
                                </code>{" "}
                                or use ffmpeg conversion
                              </li>
                              <li>
                                Access the HLS stream and add it as "HLS Stream"
                                instead
                              </li>
                            </ol>
                            <p className="mt-2">
                              <a
                                href="https://github.com/bluenviron/mediamtx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 hover:text-blue-200 underline"
                              >
                                Get MediaMTX →
                              </a>
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addCamera}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCamera(false)}
                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="text-xs text-gray-400 mt-2">
                      <p className="font-semibold mb-1">Examples:</p>
                      <p>• MJPEG: http://192.168.1.100:8080/video</p>
                      <p>• HLS: http://your-server.com/stream.m3u8</p>
                      <p>
                        • RTSP (EZVIZ):
                        192.168.1.100:554/h264/ch1/main/av_stream
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ipCameras.map((camera: any) => (
                    <div
                      key={camera.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        selectedCamera === camera.id
                          ? "bg-blue-600 border-blue-400 text-white"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => connectToCamera(camera.id)}
                        disabled={isCapturing && selectedCamera !== camera.id}
                        className="w-full text-left disabled:opacity-50"
                      >
                        <Camera className="w-6 h-6 mb-2" />
                        <p className="text-sm font-medium">{camera.name}</p>
                        <p className="text-xs opacity-70 truncate mt-1">
                          {camera.url}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCamera(camera.id)}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {connectionError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-200 text-sm">{connectionError}</p>
                </div>
              )}

              {isCapturing && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">
                      Live Camera Feed
                    </h3>
                    <button
                      type="button"
                      onClick={disconnectCamera}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>

                  <div className="relative bg-black rounded-lg overflow-hidden">
                    {selectedCamera &&
                    ipCameras.find((cam: any) => cam.id === selectedCamera)
                      ?.type === "mjpeg" ? (
                      <img
                        ref={videoRef}
                        alt="IP Camera Feed"
                        className="w-full h-auto"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-auto"
                        crossOrigin="anonymous"
                      />
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={captureImage}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Capture Image
                    </button>

                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={videoFile !== null}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Video className="w-5 h-5" />
                        Start Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 animate-pulse"
                      >
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        Stop Recording
                      </button>
                    )}
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Captured Images ({images.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img: any, index: any) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview || "/placeholder.svg"}
                          alt={`Capture ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {videoFile && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">
                      Recorded Video
                    </h3>
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                  <video
                    src={videoFile.preview}
                    controls
                    className="w-full rounded-lg bg-black"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={uploadStatus === "uploading" || images.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadStatus === "uploading" ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : uploadStatus === "success" ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Success!
                    </>
                  ) : uploadStatus === "error" ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Failed - Retry
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Device Profile
                    </>
                  )}
                </button>
              </div>

              {uploadStatus === "success" && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                  <p className="text-green-200 text-center">
                    Device profile created successfully!
                  </p>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-200 text-center">
                    Failed to create device profile. Please try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPCameraDeviceProfile;
