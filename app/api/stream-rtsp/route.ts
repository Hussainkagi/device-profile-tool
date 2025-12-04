import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rtspUrl = searchParams.get("url")

  if (!rtspUrl) {
    return NextResponse.json({ error: "RTSP URL is required" }, { status: 400 })
  }

  try {
    // For EZVIZ cameras, the RTSP URL format is typically:
    // rtsp://username:password@ip:port/h264/ch1/main/av_stream

    // In a browser environment, we need to proxy RTSP through WebSocket
    // This is a simplified example - in production you'd use a streaming server

    return new NextResponse(
      JSON.stringify({
        message: "RTSP streaming requires a media server. See instructions below.",
        instructions: [
          "RTSP cannot be played directly in browsers",
          "You need to convert RTSP to HLS or WebRTC",
          "Options: 1) Use MediaMTX server, 2) Use ffmpeg to convert to HLS",
          "Example EZVIZ URL: rtsp://admin:password@192.168.1.100:554/h264/ch1/main/av_stream",
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: "Failed to process RTSP stream" }, { status: 500 })
  }
}
