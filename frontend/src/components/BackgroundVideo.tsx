import React, { useRef, useEffect } from 'react';

interface BackgroundVideoProps {
  opacity?: number;
  overlayOpacity?: number;
}

export const BackgroundVideo: React.FC<BackgroundVideoProps> = ({
  opacity = 0.9,
  overlayOpacity = 0.18,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Video autoplay notice:', err);
        });
      }
    }
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none -z-10"
      aria-hidden="true"
    >
      {/* High-definition animated background loop */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity }}
      >
        <source src="/webguard-ai-background-loop.mp4" type="video/mp4" />
      </video>

      {/* Cybernetic Jet Black Overlay with subtle gradient to maintain dominant background while preserving contrast */}
      <div
        className="absolute inset-0 bg-[#0B0B0F]"
        style={{ opacity: overlayOpacity }}
      />

      {/* Ambient gradient vignette focused on Royal Amethyst & Electric Cyan hues */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F]/80 via-transparent to-[#0B0B0F]/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F]/60 via-transparent to-[#0B0B0F]/40 pointer-events-none" />
    </div>
  );
};

export default BackgroundVideo;
