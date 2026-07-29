import { useEffect, useRef, useState } from "react";
import logoPulse from "../../assets/logosbg.png";

interface LogoLoaderProps {
  onComplete: () => void;
  duration?: number;
  transparent?: boolean;
  label?: string;
  className?: string;
}

/** Full-screen brand pulse animation using the transparent logo asset. */
export default function LogoLoader({
  onComplete,
  duration = 2500,
  transparent = false,
  label = "Chargement...",
  className = "",
}: LogoLoaderProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isLogoReady, setIsLogoReady] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const drawDuration = Math.max(600, duration - 700);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isLogoReady) return;

    const frame = requestAnimationFrame(() => setIsDrawing(true));
    const finishTimer = window.setTimeout(() => setIsComplete(true), drawDuration);
    const exitTimer = window.setTimeout(() => setIsExiting(true), duration - 300);
    const completeTimer = window.setTimeout(() => onCompleteRef.current(), duration);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [drawDuration, duration, isLogoReady]);

  return (
    <div
      className={`logo-loader${transparent ? " logo-loader--transparent" : ""}${isDrawing ? " logo-loader--drawing" : ""}${isComplete ? " logo-loader--complete" : ""}${isExiting ? " logo-loader--exiting" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--logo-loader-draw-duration": `${drawDuration}ms` } as React.CSSProperties}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={`logo-loader__mark${isLogoReady ? " logo-loader__mark--ready" : ""}`} aria-hidden="true">
        <img
          src={logoPulse}
          alt=""
          onLoad={() => setIsLogoReady(true)}
          onError={() => setIsLogoReady(true)}
        />
      </div>
      <p>{label}</p>
    </div>
  );
}
