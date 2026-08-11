import { useEffect, useRef, useState } from 'react';
import { verifyStairPhoto } from '../lib/stairVerifyApi';

// 셋로그처럼: 카메라를 강제로 켜고(갤러리 선택 불가), 3초짜리 짧은 영상을 찍으면서
// 화면 가운데에 촬영 시각을 실시간으로 찍어 넣는다. 영상 자체를 백엔드에 저장하진
// 않지만, 녹화가 끝난 시점의 정지 프레임 1장을 Gemini한테 보내서 "이거 진짜
// 계단 맞아?"를 물어보고, 계단이 아니면 기록을 막는다(가벼운 필터, 완벽 검증 아님).
// 통과하면 onConfirm()이 호출되고, 그 안에서 기존 계단이용 API를 부르면 됨.

const RECORD_SECONDS = 3;

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.gaetSeconds())}`;
}

export default function CameraTimestampRecorder({ onConfirm, onCancel }) {
  const videoRef = useRef(null); // 카메라 원본 미리보기(숨김, 캔버스 그리기용 소스)
  const canvasRef = useRef(null); // 실제로 녹화되는 캔버스(타임스탬프 합성됨)
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const rafRef = useRef(null);
  const chunksRef = useRef([]);
  const lastFrameRef = useRef(null); // 검증용 정지 프레임(dataURL)

  // opening | ready | recording | verifying | done | rejected | error
  const [phase, setPhase] = useState('opening');
  const [countdown, setCountdown] = useState(RECORD_SECONDS);
  const [resultUrl, setResultUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [rejectReason, setRejectReason] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function openCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPhase('ready');
      } catch (err) {
        console.error('[CameraTimestampRecorder] 카메라 접근 실패:', err);
        setErrorMessage('카메라를 열 수 없어요. 브라우저 카메라 권한을 확인해줘.');
        setPhase('error');
      }
    }

    openCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 화면 가운데에 촬영 시각 오버레이 (셋로그 스타일)
    const label = formatTimestamp(new Date());
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvas.width / 2 - textWidth / 2 - 12, canvas.height / 2 - 18, textWidth + 24, 36);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    rafRef.current = requestAnimationFrame(drawFrame);
  };

  const handleStartRecording = () => {
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 640;

    drawFrame(); // 캔버스에 실시간으로 프레임+타임스탬프 그리기 시작

    const canvasStream = canvas.captureStream(30);
    const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      cancelAnimationFrame(rafRef.current);
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setResultUrl(videoUrl);

      // 캔버스에 마지막으로 그려진 프레임(=녹화 끝난 순간의 장면)을 그대로 정지 이미지로 캡처
      const stillFrame = canvas.toDataURL('image/jpeg', 0.85);
      lastFrameRef.current = stillFrame;

      setPhase('verifying');
      try {
        const { isStairs, reason } = await verifyStairPhoto(stillFrame);
        if (isStairs) {
          setPhase('done');
        } else {
          setRejectReason(reason || '계단이 잘 안 보여요.');
          setPhase('rejected');
        }
      } catch (err) {
        console.error('[CameraTimestampRecorder] 계단 검증 실패:', err);
        // 검증 서버 자체가 안 열려있는 등 인증 못 하는 상황이면, 막지 말고 그냥 통과시킨다
        // (인증 서버 다운이 계단 기록 자체를 막아버리면 너무 가혹함).
        setPhase('done');
      }
    };

    recorderRef.current = recorder;
    recorder.start();
    setPhase('recording');
    setCountdown(RECORD_SECONDS);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          recorder.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirm = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onConfirm?.();
  };

  const handleRetake = () => {
    setResultUrl(null);
    setRejectReason(null);
    setPhase('ready');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs bg-white/95 rounded-2xl overflow-hidden">
        <div className="relative aspect-[3/4] bg-black flex items-center justify-center">
          {/* 원본 카메라 스트림(숨김, 캔버스가 이걸 그대로 그려서 보여줌) */}
          <video ref={videoRef} playsInline muted className="hidden" />
          {(phase === 'done' || phase === 'verifying' || phase === 'rejected') ? (
            <video src={resultUrl} controls autoPlay loop className="w-full h-full object-cover" />
          ) : (
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
          )}

          {phase === 'opening' && <p className="absolute text-white text-sm">카메라 여는 중...</p>}
          {phase === 'recording' && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ● {countdown}
            </div>
          )}
          {phase === 'verifying' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white text-sm font-medium">계단인지 확인하는 중...</p>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2">
          {phase === 'error' && <p className="text-red-500 text-xs text-center">{errorMessage}</p>}

          {phase === 'ready' && (
            <p className="text-[#4a3b57] text-xs text-center mb-1">
              계단에서 {RECORD_SECONDS}초 촬영하면 시간이 자동으로 찍혀요.
            </p>
          )}

          {phase === 'rejected' && (
            <p className="text-red-500 text-xs text-center mb-1">
              계단이 잘 안 보여요. {rejectReason && `(${rejectReason})`} 계단이 잘 보이게 다시 찍어줘.
            </p>
          )}

          <div className="flex gap-2">
            {phase === 'ready' && (
              <button
                type="button"
                onClick={handleStartRecording}
                className="flex-1 py-2.5 rounded-full bg-[#a78bba] text-white text-sm font-medium"
              >
                촬영 시작
              </button>
            )}
            {phase === 'done' && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-2.5 rounded-full bg-white/50 text-[#a775ca] text-sm font-medium border border-[#a78bba]/40"
                >
                  다시 찍기
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-full bg-[#a78bba] text-white text-sm font-medium"
                >
                  이걸로 기록하기
                </button>
              </>
            )}
            {phase === 'rejected' && (
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 rounded-full bg-[#a78bba] text-white text-sm font-medium"
              >
                다시 찍기
              </button>
            )}
            {(phase === 'ready' || phase === 'error' || phase === 'opening') && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-full bg-white/50 text-[#a775ca] text-sm font-medium border border-[#a78bba]/40"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
