import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  AudioCueType,
  MixSettings,
  ReelAudioController,
  renderAudioMasterWav,
} from "./audio/soundEngine";
import { ReelStage } from "./components/ReelStage";
import { StudioTabId, StudioTabs } from "./components/StudioTabs";
import { INITIAL_BEATS, ReelBeat, TOTAL_REEL_DURATION } from "./data/reelBlueprint";
import {
  exportCoverThumbnailPng,
  ExportedVideoResult,
  exportReelVideo,
  ExportProgress,
} from "./lib/videoExporter";

export default function App() {
  const [beats, setBeats] = useState<ReelBeat[]>(() => INITIAL_BEATS);
  const [selectedBeatId, setSelectedBeatId] = useState<string>(INITIAL_BEATS[0].id);
  const [activeTab, setActiveTab] = useState<StudioTabId>("publish");

  // Images preloaded for synchronous Canvas rendering
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);

  // Voiceover state
  const [selectedVoice, setSelectedVoice] = useState<string>("Charon");
  const [voiceBuffers, setVoiceBuffers] = useState<Record<string, AudioBuffer>>({});
  const [voiceSources, setVoiceSources] = useState<Record<string, "ai" | "mic">>({});
  const [voiceSignatures, setVoiceSignatures] = useState<Record<string, string>>({});
  const [isGeneratingAllTts, setIsGeneratingAllTts] = useState<boolean>(false);
  const [generatingBeatId, setGeneratingBeatId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Microphone recording state
  const [recordingBeatId, setRecordingBeatId] = useState<string | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Soundscape Mix
  const [mix, setMix] = useState<MixSettings>({
    voiceGain: 1.0,
    sfxGain: 0.95,
    droneGain: 0.85,
    birdEnabled: true,
    birdGain: 1.25,
  });
  const [isRenderingWav, setIsRenderingWav] = useState<boolean>(false);

  // Export state
  const [exportResolution, setExportResolution] = useState<"1080p" | "720p">("1080p");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportedVideo, setExportedVideo] = useState<ExportedVideoResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  const audioControllerRef = useRef<ReelAudioController | null>(null);
  if (!audioControllerRef.current) {
    audioControllerRef.current = new ReelAudioController();
  }

  const rafRef = useRef<number>(0);
  const playOriginWallRef = useRef<number>(0);
  const playOriginReelRef = useRef<number>(0);
  const singleClipSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Preload bespoke 9:16 images and wait for Google Fonts so canvas text draws cleanly
  useEffect(() => {
    let active = true;
    const urls = Array.from(
      new Set(beats.map((b) => b.imageUrl).filter((u): u is string => Boolean(u)))
    );
    const loaded: Record<string, HTMLImageElement> = {};

    urls.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        if (!active) return;
        loaded[url] = img;
        setImages((prev) => ({ ...prev, [url]: img }));
      };
      img.src = url;
    });

    if (document.fonts && document.fonts.ready) {
      void document.fonts.ready.then(() => {
        if (active) setCurrentTime((t) => t);
      });
    }

    return () => {
      active = false;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      audioControllerRef.current?.stop();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (exportedVideo?.url) {
        URL.revokeObjectURL(exportedVideo.url);
      }
    };
  }, [exportedVideo]);

  const stopPlayback = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioControllerRef.current?.stop();
    setIsPlaying(false);
  }, []);

  const startPlaybackFrom = useCallback(
    (startSec: number) => {
      const clampedStart = startSec >= TOTAL_REEL_DURATION - 0.1 ? 0 : Math.max(0, startSec);
      cancelAnimationFrame(rafRef.current);
      audioControllerRef.current?.startPlayback(beats, voiceBuffers, mix, clampedStart, false);

      playOriginWallRef.current = performance.now();
      playOriginReelRef.current = clampedStart;
      setCurrentTime(clampedStart);
      setIsPlaying(true);

      const step = () => {
        const elapsed = (performance.now() - playOriginWallRef.current) / 1000;
        const nextTime = playOriginReelRef.current + elapsed;
        if (nextTime >= TOTAL_REEL_DURATION) {
          setCurrentTime(TOTAL_REEL_DURATION);
          audioControllerRef.current?.stop();
          setIsPlaying(false);
          return;
        }
        setCurrentTime(nextTime);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [beats, mix, voiceBuffers]
  );

  const handleTogglePlay = useCallback(() => {
    if (isExporting) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlaybackFrom(currentTime);
    }
  }, [currentTime, isExporting, isPlaying, startPlaybackFrom, stopPlayback]);

  const handleRestart = useCallback(() => {
    if (isExporting) return;
    startPlaybackFrom(0);
  }, [isExporting, startPlaybackFrom]);

  const handleSeek = useCallback(
    (sec: number) => {
      if (isExporting) return;
      const clamped = Math.max(0, Math.min(TOTAL_REEL_DURATION, sec));
      if (isPlaying) {
        startPlaybackFrom(clamped);
      } else {
        setCurrentTime(clamped);
      }
    },
    [isExporting, isPlaying, startPlaybackFrom]
  );

  const handleSelectBeat = useCallback(
    (beat: ReelBeat) => {
      setSelectedBeatId(beat.id);
      handleSeek(beat.startSec + 0.3);
    },
    [handleSeek]
  );

  const handleUpdateBeat = useCallback((beatId: string, patch: Partial<ReelBeat>) => {
    setBeats((prev) => prev.map((b) => (b.id === beatId ? { ...b, ...patch } : b)));
  }, []);

  const handleResetScript = useCallback(() => {
    setBeats(INITIAL_BEATS);
  }, []);

  const requestBeatTts = useCallback(
    async (beat: ReelBeat, voiceName: string): Promise<AudioBuffer> => {
      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: beat.voiceoverText,
          style: beat.voiceDirection,
          voiceName,
        }),
      });
      const data = (await resp.json()) as { audioBase64?: string; error?: string };
      if (!resp.ok || !data.audioBase64) {
        throw new Error(data.error || "Failed to generate voiceover audio.");
      }
      const controller = audioControllerRef.current!;
      return controller.decodeAudioBase64(data.audioBase64);
    },
    []
  );

  const getBeatTtsSignature = useCallback(
    (beat: ReelBeat, voiceName: string) =>
      `${voiceName}::${beat.voiceDirection.trim()}::${beat.voiceoverText.trim()}`,
    []
  );

  const handleGenerateBeatTts = useCallback(
    async (beat: ReelBeat) => {
      if (!beat.voiceoverText.trim()) return;
      setTtsError(null);
      setGeneratingBeatId(beat.id);
      try {
        const buffer = await requestBeatTts(beat, selectedVoice);
        const sig = getBeatTtsSignature(beat, selectedVoice);
        setVoiceBuffers((prev) => ({ ...prev, [beat.id]: buffer }));
        setVoiceSources((prev) => ({ ...prev, [beat.id]: "ai" }));
        setVoiceSignatures((prev) => ({ ...prev, [beat.id]: sig }));
      } catch (err: unknown) {
        setTtsError(err instanceof Error ? err.message : "Voiceover generation failed.");
      } finally {
        setGeneratingBeatId(null);
      }
    },
    [getBeatTtsSignature, requestBeatTts, selectedVoice]
  );

  const handleGenerateAllTts = useCallback(async () => {
    setTtsError(null);
    setIsGeneratingAllTts(true);
    const spoken = beats.filter((b) => b.voiceoverText.trim().length > 0);
    try {
      for (const beat of spoken) {
        const sig = getBeatTtsSignature(beat, selectedVoice);
        if (voiceBuffers[beat.id] && (voiceSources[beat.id] === "mic" || voiceSignatures[beat.id] === sig)) {
          continue;
        }
        setGeneratingBeatId(beat.id);
        const buffer = await requestBeatTts(beat, selectedVoice);
        setVoiceBuffers((prev) => ({ ...prev, [beat.id]: buffer }));
        setVoiceSources((prev) => ({ ...prev, [beat.id]: "ai" }));
        setVoiceSignatures((prev) => ({ ...prev, [beat.id]: sig }));
      }
    } catch (err: unknown) {
      setTtsError(err instanceof Error ? err.message : "Voiceover generation failed.");
    } finally {
      setGeneratingBeatId(null);
      setIsGeneratingAllTts(false);
    }
  }, [beats, getBeatTtsSignature, requestBeatTts, selectedVoice, voiceBuffers, voiceSignatures, voiceSources]);

  const handleToggleRecordBeat = useCallback(
    async (beat: ReelBeat) => {
      if (recordingBeatId === beat.id && micRecorderRef.current) {
        micRecorderRef.current.stop();
        return;
      }

      if (micRecorderRef.current && micRecorderRef.current.state !== "inactive") {
        micRecorderRef.current.stop();
      }

      setTtsError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunks.push(ev.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
          micRecorderRef.current = null;
          setRecordingBeatId(null);
          try {
            const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            const buffer = await audioControllerRef.current!.decodeBlob(blob);
            setVoiceBuffers((prev) => ({ ...prev, [beat.id]: buffer }));
            setVoiceSources((prev) => ({ ...prev, [beat.id]: "mic" }));
          } catch {
            setTtsError("Could not decode microphone recording. Please try again.");
          }
        };

        micRecorderRef.current = recorder;
        setRecordingBeatId(beat.id);
        recorder.start();
      } catch {
        setTtsError(
          "Microphone access was denied or unavailable. Enable microphone permissions to record your own voice."
        );
      }
    },
    [recordingBeatId]
  );

  const handlePlayVoiceClip = useCallback(
    (beatId: string) => {
      const buf = voiceBuffers[beatId];
      if (!buf || !audioControllerRef.current) return;
      try {
        singleClipSourceRef.current?.stop();
      } catch {
        // ignore
      }
      const ctx = audioControllerRef.current.ensureContext();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      singleClipSourceRef.current = src;
    },
    [voiceBuffers]
  );

  const handleClearVoiceClip = useCallback((beatId: string) => {
    setVoiceBuffers((prev) => {
      const next = { ...prev };
      delete next[beatId];
      return next;
    });
    setVoiceSources((prev) => {
      const next = { ...prev };
      delete next[beatId];
      return next;
    });
    setVoiceSignatures((prev) => {
      const next = { ...prev };
      delete next[beatId];
      return next;
    });
  }, []);

  const handleAuditionCue = useCallback(
    (cue: AudioCueType) => {
      audioControllerRef.current?.auditionCue(cue, mix);
    },
    [mix]
  );

  const handlePreviewSilenceGap = useCallback(() => {
    if (isExporting) return;
    startPlaybackFrom(30.8);
  }, [isExporting, startPlaybackFrom]);

  const handleDownloadWav = useCallback(async () => {
    setIsRenderingWav(true);
    try {
      const wavBlob = await renderAudioMasterWav(beats, voiceBuffers, mix);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "why-didnt-anyone-tell-me-audio-master.wav";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setIsRenderingWav(false);
    }
  }, [beats, mix, voiceBuffers]);

  const handleStartExport = useCallback(async () => {
    if (isExporting) return;
    stopPlayback();
    setExportError(null);
    setActiveTab("publish");
    setIsExporting(true);
    setExportProgress({ progress: 0, currentSec: 0, totalSec: TOTAL_REEL_DURATION });

    const abort = new AbortController();
    exportAbortRef.current = abort;

    try {
      const result = await exportReelVideo({
        beats,
        images,
        voiceBuffers,
        mix,
        audioController: audioControllerRef.current!,
        resolution: exportResolution,
        signal: abort.signal,
        onProgress: (p) => {
          setExportProgress(p);
          setCurrentTime(p.currentSec);
        },
      });

      setExportedVideo((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return result;
      });

      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: unknown) {
      if (!abort.signal.aborted) {
        setExportError(err instanceof Error ? err.message : "Failed to export video.");
      }
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      exportAbortRef.current = null;
    }
  }, [beats, exportResolution, images, isExporting, mix, stopPlayback, voiceBuffers]);

  const handleDownloadCover = useCallback(async () => {
    setExportError(null);
    try {
      const pngBlob = await exportCoverThumbnailPng({
        beats,
        images,
        timeSec: 39.5,
      });
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "why-didnt-anyone-tell-me-cover-9x16.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Failed to export cover image.");
    }
  }, [beats, images]);

  const handleShareVideo = useCallback(async () => {
    if (!exportedVideo) return;
    try {
      const file = new File([exportedVideo.blob], exportedVideo.filename, {
        type: exportedVideo.mimeType,
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Why Didn't Anyone Tell Me?",
          text: "Life is a vapor (James 4:14). Today is the day of salvation. Jesus saves (John 3:16).",
          files: [file],
        });
        return;
      }
    } catch {
      // Fall back to direct file download if share sheet is cancelled or unsupported
    }
    const a = document.createElement("a");
    a.href = exportedVideo.url;
    a.download = exportedVideo.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [exportedVideo]);

  const handleCancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
  }, []);

  const navItems: Array<{ id: StudioTabId; label: string }> = [
    { id: "storyboard", label: "Storyboard" },
    { id: "voiceover", label: "Voiceover" },
    { id: "soundscape", label: "Soundscape" },
    { id: "publish", label: "Publish" },
  ];

  return (
    <div className="min-h-screen bg-[#07080A] text-[#F4F2ED] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-white/[0.08] bg-[#07080A]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1260px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-[#F4F2ED] whitespace-nowrap shrink-0"
          >
            Eastern Sky Studio
          </a>

          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 ${
                  activeTab === item.id
                    ? "text-[#F4F2ED] underline decoration-[#E5A93C] decoration-2"
                    : "text-[#A39E93] hover:text-[#F4F2ED]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("publish");
                if (!isExporting) void handleStartExport();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] text-[#07080A] text-xs font-semibold hover:bg-[#f0b94f] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Video</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main id="top" className="flex-1 max-w-[1260px] w-full mx-auto px-5 sm:px-8 py-8 sm:py-10">
        {/* Editorial Title Header */}
        <div className="mb-8 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9B978E]">
            <span>9:16 Vertical Master</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">52 Seconds</span>
            <span aria-hidden="true">·</span>
            <span>James 4:14, 2 Corinthians 6:2 &amp; John 3:16</span>
          </div>
          <h1
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F2ED]"
            style={{ textWrap: "balance" }}
          >
            Why Didn&apos;t Anyone Tell Me?
          </h1>
          <p className="text-sm sm:text-base text-[#A39E93] max-w-2xl leading-relaxed">
            Preview the complete 7-beat message with synthesized heartbeat, dead silence, distant
            bird chirp, and Eastern Sky Shofar horn — add AI narration or your own voice, then
            download the 9:16 video ready for Instagram Reels, TikTok, and YouTube Shorts.
          </p>
        </div>

        {/* Two-Column Studio Grid: Focal 9:16 Stage + Director Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
          <section aria-label="Vertical Reel Preview" className="lg:sticky lg:top-24">
            <ReelStage
              beats={beats}
              images={images}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isExporting={isExporting}
              showSafeZones={showSafeZones}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              onSeek={handleSeek}
              onToggleSafeZones={() => setShowSafeZones((v) => !v)}
            />
          </section>

          <section aria-label="Reel Production Controls" className="min-w-0">
            <StudioTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              beats={beats}
              currentTime={currentTime}
              selectedBeatId={selectedBeatId}
              onSelectBeat={handleSelectBeat}
              onUpdateBeat={handleUpdateBeat}
              onResetScript={handleResetScript}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              voiceBuffers={voiceBuffers}
              voiceSources={voiceSources}
              isGeneratingAllTts={isGeneratingAllTts}
              generatingBeatId={generatingBeatId}
              ttsError={ttsError}
              recordingBeatId={recordingBeatId}
              onGenerateAllTts={handleGenerateAllTts}
              onGenerateBeatTts={handleGenerateBeatTts}
              onToggleRecordBeat={handleToggleRecordBeat}
              onPlayVoiceClip={handlePlayVoiceClip}
              onClearVoiceClip={handleClearVoiceClip}
              mix={mix}
              onChangeMix={setMix}
              onAuditionCue={handleAuditionCue}
              onPreviewSilenceGap={handlePreviewSilenceGap}
              onDownloadWav={handleDownloadWav}
              isRenderingWav={isRenderingWav}
              exportResolution={exportResolution}
              onChangeResolution={setExportResolution}
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportedVideo={exportedVideo}
              exportError={exportError}
              onStartExport={handleStartExport}
              onCancelExport={handleCancelExport}
              onDownloadCover={handleDownloadCover}
              onShareVideo={handleShareVideo}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
