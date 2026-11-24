import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Mic,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Volume2,
  Loader2,
  Film,
  FileAudio,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Share2,
  AlertCircle,
} from "lucide-react";
import { AudioCueType, MixSettings } from "../audio/soundEngine";
import { ReelBeat, SOCIAL_EXPORT_COPY, VOICE_PRESETS } from "../data/reelBlueprint";
import { ExportedVideoResult, ExportProgress } from "../lib/videoExporter";
import { IntensityMeter } from "./IntensityMeter";

export type StudioTabId = "storyboard" | "voiceover" | "soundscape" | "publish";

interface StudioTabsProps {
  activeTab: StudioTabId;
  onTabChange: (tab: StudioTabId) => void;
  beats: ReelBeat[];
  currentTime: number;
  selectedBeatId: string;
  onSelectBeat: (beat: ReelBeat) => void;
  onUpdateBeat: (beatId: string, patch: Partial<ReelBeat>) => void;
  onResetScript: () => void;
  // Voiceover
  selectedVoice: string;
  onSelectVoice: (voice: string) => void;
  voiceBuffers: Record<string, AudioBuffer>;
  voiceSources: Record<string, "ai" | "mic">;
  isGeneratingAllTts: boolean;
  generatingBeatId: string | null;
  ttsError: string | null;
  recordingBeatId: string | null;
  onGenerateAllTts: () => void;
  onGenerateBeatTts: (beat: ReelBeat) => void;
  onToggleRecordBeat: (beat: ReelBeat) => void;
  onPlayVoiceClip: (beatId: string) => void;
  onClearVoiceClip: (beatId: string) => void;
  // Soundscape
  mix: MixSettings;
  onChangeMix: (mix: MixSettings) => void;
  onAuditionCue: (cue: AudioCueType) => void;
  onPreviewSilenceGap: () => void;
  onDownloadWav: () => void;
  isRenderingWav: boolean;
  // Export / Publish
  exportResolution: "1080p" | "720p";
  onChangeResolution: (res: "1080p" | "720p") => void;
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportedVideo: ExportedVideoResult | null;
  exportError: string | null;
  onStartExport: () => void;
  onCancelExport: () => void;
  onDownloadCover: () => void;
  onShareVideo: () => void;
}

export const StudioTabs: React.FC<StudioTabsProps> = ({
  activeTab,
  onTabChange,
  beats,
  currentTime,
  selectedBeatId,
  onSelectBeat,
  onUpdateBeat,
  onResetScript,
  selectedVoice,
  onSelectVoice,
  voiceBuffers,
  voiceSources,
  isGeneratingAllTts,
  generatingBeatId,
  ttsError,
  recordingBeatId,
  onGenerateAllTts,
  onGenerateBeatTts,
  onToggleRecordBeat,
  onPlayVoiceClip,
  onClearVoiceClip,
  mix,
  onChangeMix,
  onAuditionCue,
  onPreviewSilenceGap,
  onDownloadWav,
  isRenderingWav,
  exportResolution,
  onChangeResolution,
  isExporting,
  exportProgress,
  exportedVideo,
  exportError,
  onStartExport,
  onCancelExport,
  onDownloadCover,
  onShareVideo,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<
    "instagram" | "tiktok" | "youtube" | "facebook"
  >("instagram");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTipTooltip, setShowTipTooltip] = useState<boolean>(false);
  const [showPerformanceTips, setShowPerformanceTips] = useState<boolean>(true);

  const renderHighlightedTip = (text: string, keywords: string[] = []) => {
    if (!keywords.length) return text;
    const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
    const parts = text.split(regex);
    const lowerSet = new Set(keywords.map((k) => k.toLowerCase()));
    return parts.map((part, idx) =>
      lowerSet.has(part.toLowerCase()) ? (
        <span key={idx} className="text-[#E5A93C] font-semibold">
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors in restricted frames
    }
  };

  const tabs: Array<{ id: StudioTabId; label: string }> = [
    { id: "storyboard", label: "Storyboard" },
    { id: "voiceover", label: "Voiceover" },
    { id: "soundscape", label: "Soundscape" },
    { id: "publish", label: "Publish" },
  ];

  const spokenBeats = beats.filter((b) => b.voiceoverText.trim().length > 0);
  const readyVoiceCount = spokenBeats.filter((b) => Boolean(voiceBuffers[b.id])).length;
  const activePlatformCopy =
    SOCIAL_EXPORT_COPY.find((p) => p.id === selectedPlatform) ?? SOCIAL_EXPORT_COPY[0];

  return (
    <div className="flex flex-col w-full bg-[#101217] border border-white/[0.08] rounded-2xl overflow-hidden">
      {/* Segmented Workspace Navigation */}
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/[0.08]">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#07080A] border border-white/[0.06]"
          role="tablist"
          aria-label="Studio workspace sections"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C] ${
                  active
                    ? "bg-[#E5A93C] text-[#07080A] font-semibold"
                    : "text-[#A39E93] hover:text-[#F4F2ED]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline font-mono-tabular text-xs text-[#9B978E] whitespace-nowrap">
          9:16 · 52s Master
        </span>
      </div>

      {/* Tab Content */}
      <div className="p-5 sm:p-6">
        {activeTab === "storyboard" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#F4F2ED] tracking-tight">
                  7-Beat Master Script
                </h2>
                <p className="text-sm text-[#9B978E] mt-0.5">
                  Click any scene to jump the preview or edit its captions and spoken lines.
                </p>
              </div>
              <button
                type="button"
                onClick={onResetScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-[#C8C3B8] hover:text-[#F4F2ED] hover:bg-white/[0.04] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Script</span>
              </button>
            </div>

            <IntensityMeter
              beats={beats}
              currentTime={currentTime}
              selectedBeatId={selectedBeatId}
              onSelectBeat={onSelectBeat}
            />

            <div className="divide-y divide-white/[0.07] border-t border-b border-white/[0.07]">
              {beats.map((beat) => {
                const isSelected = selectedBeatId === beat.id;
                const isPlayingHere =
                  currentTime >= beat.startSec && currentTime < beat.endSec;
                const hasVoice = Boolean(voiceBuffers[beat.id]);

                return (
                  <div
                    key={beat.id}
                    className={`py-4 transition-colors ${
                      isSelected ? "bg-white/[0.025] -mx-3 px-3 rounded-lg" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectBeat(beat)}
                      className="w-full text-left flex items-start justify-between gap-4 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9B978E] font-mono-tabular">
                          <span className={isPlayingHere ? "text-[#E5A93C] font-medium" : ""}>
                            0{beat.index}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            0:{String(beat.startSec).padStart(2, "0")}–0:
                            {String(beat.endSec).padStart(2, "0")}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-sans ${
                              beat.isClimax ? "text-[#E5A93C] font-semibold" : "text-[#A39E93]"
                            }`}
                          >
                            {beat.intensityLabel}
                          </span>
                          {beat.scriptureRef && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans text-[#E5A93C]/90">
                                {beat.scriptureRef}
                              </span>
                            </>
                          )}
                          {beat.voiceoverText && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className={hasVoice ? "text-[#F4F2ED]" : "text-[#7A766E]"}>
                                {hasVoice
                                  ? voiceSources[beat.id] === "mic"
                                    ? "Mic recorded"
                                    : "Voice ready"
                                  : "No audio yet"}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[#F4F2ED] group-hover:text-[#E5A93C] transition-colors">
                          {beat.title}
                        </p>
                        <p className="text-xs text-[#A39E93] line-clamp-2">
                          {beat.voiceoverText ? `"${beat.voiceoverText}"` : beat.sfxLabel}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#9B978E] group-hover:text-[#F4F2ED] whitespace-nowrap shrink-0 pt-1">
                        {isSelected ? "Editing" : "Edit"}
                      </span>
                    </button>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-[#A39E93]">
                              On-Screen Headline (one line per break)
                            </span>
                            <textarea
                              rows={2}
                              value={beat.headlineLines.join("\n")}
                              onChange={(e) =>
                                onUpdateBeat(beat.id, {
                                  headlineLines: e.target.value
                                    .split("\n")
                                    .filter((l) => l.trim().length > 0),
                                })
                              }
                              className="w-full rounded-lg bg-[#07080A] border border-white/10 px-3 py-2 text-xs text-[#F4F2ED] focus:outline-none focus:border-[#E5A93C]"
                            />
                          </label>

                          <div className="space-y-2.5">
                            <label className="block space-y-1">
                              <span className="text-xs font-medium text-[#A39E93]">
                                Subline Caption
                              </span>
                              <input
                                type="text"
                                value={beat.subline ?? ""}
                                onChange={(e) =>
                                  onUpdateBeat(beat.id, { subline: e.target.value })
                                }
                                placeholder="Optional supporting line"
                                className="w-full rounded-lg bg-[#07080A] border border-white/10 px-3 py-2 text-xs text-[#F4F2ED] focus:outline-none focus:border-[#E5A93C]"
                              />
                            </label>

                            <label className="block space-y-1">
                              <span className="text-xs font-medium text-[#A39E93]">
                                Scripture Citation
                              </span>
                              <input
                                type="text"
                                value={beat.scriptureRef ?? ""}
                                onChange={(e) =>
                                  onUpdateBeat(beat.id, { scriptureRef: e.target.value })
                                }
                                placeholder="e.g. James 4:14"
                                className="w-full rounded-lg bg-[#07080A] border border-white/10 px-3 py-2 text-xs text-[#F4F2ED] focus:outline-none focus:border-[#E5A93C]"
                              />
                            </label>
                          </div>
                        </div>

                        {beat.index !== 5 && beat.index !== 6 && (
                          <label className="block space-y-1">
                            <span className="text-xs font-medium text-[#A39E93]">
                              Spoken Voiceover Line
                            </span>
                            <textarea
                              rows={2}
                              value={beat.voiceoverText}
                              onChange={(e) =>
                                onUpdateBeat(beat.id, { voiceoverText: e.target.value })
                              }
                              className="w-full rounded-lg bg-[#07080A] border border-white/10 px-3 py-2 text-xs text-[#F4F2ED] focus:outline-none focus:border-[#E5A93C]"
                            />
                          </label>
                        )}

                        <p className="text-xs text-[#9B978E]">
                          Sound cue: {beat.sfxLabel}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "voiceover" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#F4F2ED] tracking-tight">
                  Narration & Personal Voice
                </h2>
                <p className="text-sm text-[#9B978E] mt-0.5">
                  Generate studio narration or record your own voice directly on any beat (
                  {readyVoiceCount}/{spokenBeats.length} spoken scenes ready).
                </p>
              </div>
              <button
                type="button"
                disabled={isGeneratingAllTts}
                onClick={onGenerateAllTts}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] text-[#07080A] text-xs font-semibold hover:bg-[#f0b94f] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {isGeneratingAllTts ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {isGeneratingAllTts ? "Generating Voiceover..." : "Generate All Voiceovers"}
                </span>
              </button>
            </div>

            {ttsError && (
              <div className="rounded-lg border border-red-400/30 bg-red-950/30 px-4 py-3 text-xs text-red-200">
                {ttsError}
              </div>
            )}

            {/* Narrator Voice Picker */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[#A39E93]">Studio Narrator Voice</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VOICE_PRESETS.map((voice) => {
                  const active = selectedVoice === voice.id;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => onSelectVoice(voice.id)}
                      className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        active
                          ? "bg-[#E5A93C]/12 border-[#E5A93C]/60 text-[#F4F2ED]"
                          : "bg-[#07080A] border-white/[0.08] text-[#A39E93] hover:text-[#F4F2ED]"
                      }`}
                    >
                      <div className="text-xs font-semibold">{voice.label}</div>
                      <div className="text-[11px] text-[#9B978E] mt-0.5 truncate">
                        {voice.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance Tips: Scene-by-Scene Emotional Guide */}
            <section
              aria-label="Performance Tips"
              className="rounded-xl bg-[#07080A] border border-white/[0.08] overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h3 className="text-xs font-semibold text-[#F4F2ED] whitespace-nowrap">
                    Performance Tips
                  </h3>
                  <span aria-hidden="true" className="text-[#9B978E]">
                    ·
                  </span>
                  <span className="text-xs text-[#9B978E]">
                    Key emotional shifts:{" "}
                    <span className="text-[#E5A93C] font-medium">solemn</span>
                    {" → "}
                    <span className="text-[#E5A93C] font-medium">sincere</span>
                    {" → "}
                    <span className="text-[#E5A93C] font-medium">grief</span> &amp;{" "}
                    <span className="text-[#E5A93C] font-medium">urgent</span>
                    {" → "}
                    <span className="text-[#E5A93C] font-medium">resolute</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTipTooltip((v) => !v)}
                      onMouseEnter={() => setShowTipTooltip(true)}
                      onMouseLeave={() => setShowTipTooltip(false)}
                      aria-label="How emotional keywords guide mic recording and AI narration"
                      aria-expanded={showTipTooltip}
                      className="inline-flex items-center gap-1 text-xs text-[#A39E93] hover:text-[#E5A93C] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delivery Guide</span>
                    </button>

                    {showTipTooltip && (
                      <div
                        role="tooltip"
                        className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-20 rounded-xl bg-[#161922] border border-white/15 p-3.5 shadow-2xl text-xs text-[#D5D1C8] leading-relaxed"
                      >
                        Deliver the opening{" "}
                        <span className="text-[#E5A93C] font-medium">solemn</span> and{" "}
                        <span className="text-[#E5A93C] font-medium">unhurried</span>, shift into{" "}
                        <span className="text-[#E5A93C] font-medium">sincere</span> eye-contact
                        before letting <span className="text-[#E5A93C] font-medium">grief</span>{" "}
                        and <span className="text-[#E5A93C] font-medium">urgent</span> pleading
                        break into Scene 04. That raw contrast right before the 0:31 dead silence
                        makes the lone bird chirp and Shofar horn hit with full weight.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPerformanceTips((v) => !v)}
                    aria-expanded={showPerformanceTips}
                    className="inline-flex items-center gap-1 text-xs text-[#A39E93] hover:text-[#F4F2ED] transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
                  >
                    <span>{showPerformanceTips ? "Hide" : "Show"}</span>
                    {showPerformanceTips ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {showPerformanceTips && (
                <div className="divide-y divide-white/[0.06]">
                  {spokenBeats.map((beat) => {
                    const keywords = beat.emotionalKeywords ?? [];
                    const isActiveHere =
                      currentTime >= beat.startSec && currentTime < beat.endSec;

                    return (
                      <React.Fragment key={`tip-${beat.id}`}>
                        <button
                          type="button"
                          onClick={() => onSelectBeat(beat)}
                          className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#E5A93C] ${
                            isActiveHere ? "bg-white/[0.03]" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className={`font-mono-tabular ${
                                  isActiveHere
                                    ? "text-[#E5A93C] font-semibold"
                                    : "text-[#9B978E]"
                                }`}
                              >
                                0{beat.index} · 0:{String(beat.startSec).padStart(2, "0")}–0:
                                {String(beat.endSec).padStart(2, "0")}
                              </span>
                              <span aria-hidden="true" className="text-[#9B978E]">
                                ·
                              </span>
                              <span className="font-medium text-[#F4F2ED]">{beat.title}</span>
                            </div>

                            {keywords.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs">
                                {keywords.map((kw, idx) => (
                                  <React.Fragment key={kw}>
                                    {idx > 0 && (
                                      <span aria-hidden="true" className="text-[#6F6B64]">
                                        ·
                                      </span>
                                    )}
                                    <span className="text-[#E5A93C] font-semibold">{kw}</span>
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>

                          {beat.performanceTip && (
                            <p className="text-xs text-[#A39E93] mt-1 leading-relaxed">
                              {renderHighlightedTip(beat.performanceTip, keywords)}
                            </p>
                          )}
                        </button>

                        {beat.index === 4 && (
                          <div className="px-4 py-2.5 bg-white/[0.015] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9B978E]">
                            <span className="font-mono-tabular">05–06 · 0:31–0:44</span>
                            <span>
                              Hold{" "}
                              <span className="text-[#F4F2ED] font-medium">total silence</span>{" "}
                              for the distant bird chirp (0:32) and Eastern Sky Shofar horn (0:35)
                              before delivering Scene 07.
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Per-Beat Voice Controls */}
            <div className="divide-y divide-white/[0.07] border-t border-b border-white/[0.07]">
              {spokenBeats.map((beat) => {
                const hasAudio = Boolean(voiceBuffers[beat.id]);
                const source = voiceSources[beat.id];
                const isBusy = generatingBeatId === beat.id;
                const isRec = recordingBeatId === beat.id;
                const keywords = beat.emotionalKeywords ?? [];

                return (
                  <div key={beat.id} className="py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-[#9B978E] font-mono-tabular">
                        <span>Scene 0{beat.index}</span>
                        <span aria-hidden="true" className="mx-1.5">
                          ·
                        </span>
                        <span className="font-sans font-medium text-[#F4F2ED]">{beat.title}</span>
                        <span aria-hidden="true" className="mx-1.5">
                          ·
                        </span>
                        <span>
                          0:{String(beat.startSec).padStart(2, "0")}–0:
                          {String(beat.endSec).padStart(2, "0")}
                        </span>
                      </div>

                      <span className="text-xs text-[#A39E93]">
                        {hasAudio
                          ? source === "mic"
                            ? "Recorded with Microphone"
                            : `Generated (${selectedVoice})`
                          : "Ready to record or generate"}
                      </span>
                    </div>

                    <p className="text-xs text-[#D5D1C8] leading-relaxed">
                      &ldquo;{beat.voiceoverText}&rdquo;
                    </p>

                    {beat.performanceTip && (
                      <p className="text-xs text-[#9B978E] leading-relaxed">
                        <span className="font-medium text-[#C8C3B8]">Performance Tip: </span>
                        {renderHighlightedTip(beat.performanceTip, keywords)}
                      </p>
                    )}

                    {/* Editable AI Direction & Quick Keyword Insertion */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={`direction-${beat.id}`}
                          className="text-[11px] font-medium text-[#9B978E]"
                        >
                          AI Narration Direction
                        </label>
                        {keywords.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-[#9B978E]">
                            <span>Tone cues:</span>
                            {keywords.map((kw, idx) => (
                              <React.Fragment key={kw}>
                                {idx > 0 && <span aria-hidden="true">·</span>}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = beat.voiceDirection.trim();
                                    if (current.toLowerCase().includes(kw.toLowerCase())) return;
                                    onUpdateBeat(beat.id, {
                                      voiceDirection: current
                                        ? `${current.replace(/\.$/, "")}, ${kw}.`
                                        : kw,
                                    });
                                  }}
                                  title={`Add '${kw}' to AI narration direction`}
                                  className="text-[#E5A93C] hover:underline font-medium"
                                >
                                  +{kw}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        id={`direction-${beat.id}`}
                        type="text"
                        value={beat.voiceDirection}
                        onChange={(e) =>
                          onUpdateBeat(beat.id, { voiceDirection: e.target.value })
                        }
                        className="w-full rounded-lg bg-[#07080A] border border-white/[0.08] px-3 py-1.5 text-xs text-[#C8C3B8] focus:outline-none focus:border-[#E5A93C]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isBusy || isGeneratingAllTts}
                        onClick={() => onGenerateBeatTts(beat)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.11] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isBusy ? "Generating..." : "Generate AI Voice"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleRecordBeat(beat)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          isRec
                            ? "bg-red-500/20 border-red-400/60 text-red-200"
                            : "bg-white/[0.04] border-white/10 text-[#C8C3B8] hover:text-[#F4F2ED] hover:bg-white/[0.08]"
                        }`}
                      >
                        {isRec ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                        <span>{isRec ? "Stop Recording" : "Record Mic"}</span>
                      </button>

                      {hasAudio && (
                        <>
                          <button
                            type="button"
                            onClick={() => onPlayVoiceClip(beat.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/40 text-xs font-medium text-[#E5A93C] hover:bg-[#E5A93C]/25 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onClearVoiceClip(beat.id)}
                            aria-label={`Clear voice clip for ${beat.title}`}
                            className="p-1.5 rounded-lg text-[#9B978E] hover:text-red-300 hover:bg-white/[0.05] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "soundscape" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[#F4F2ED] tracking-tight">
                Cinematic Audio & Eastern Sky Horn
              </h2>
              <p className="text-sm text-[#9B978E] mt-0.5">
                Synthesized in real time with dead silence at 0:31, one lone distant bird chirp at
                0:32, and the rising Shofar &amp; war horn at 0:35.
              </p>
            </div>

            {/* Cue Audition */}
            <div className="space-y-2.5">
              <span className="text-xs font-medium text-[#A39E93]">Audition Key Sound Cues</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAuditionCue("heartbeat")}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#07080A] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:border-[#E5A93C]/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Heartbeat (0:00–0:15)</span>
                </button>
                <button
                  type="button"
                  disabled={!mix.birdEnabled}
                  onClick={() => onAuditionCue("bird")}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#07080A] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:border-[#E5A93C]/60 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>
                    Lone Bird Chirp (0:32){!mix.birdEnabled ? " · Off" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onAuditionCue("horn")}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#07080A] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:border-[#E5A93C]/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Eastern Sky Shofar Horn (0:35)</span>
                </button>
              </div>
            </div>

            {/* Dedicated Bird Chirp Spotlight Control (0:31-0:35 Silence Gap) */}
            <div className="rounded-xl bg-[#07080A] border border-white/[0.08] p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#F4F2ED]">
                      Bird Chirp Effect
                    </span>
                    <span aria-hidden="true" className="text-[#9B978E]">
                      ·
                    </span>
                    <span className="font-mono-tabular text-xs text-[#9B978E]">
                      0:31–0:35 Silence Gap
                    </span>
                  </div>
                  <p className="text-xs text-[#9B978E] mt-0.5">
                    Isolated channel so the lone distant bird rings clearly in total stillness
                    before the Eastern Sky horn hits.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-[#A39E93]">
                    {mix.birdEnabled ? "Enabled" : "Muted"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mix.birdEnabled}
                    aria-label="Toggle Bird Chirp effect"
                    onClick={() =>
                      onChangeMix({ ...mix, birdEnabled: !mix.birdEnabled })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C] ${
                      mix.birdEnabled ? "bg-[#E5A93C]" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-[#07080A] transition-transform duration-150 ${
                        mix.birdEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div
                className={`space-y-1.5 transition-opacity ${
                  mix.birdEnabled ? "opacity-100" : "opacity-45"
                }`}
              >
                <div className="flex justify-between text-xs">
                  <label htmlFor="bird-chirp-gain" className="text-[#C8C3B8]">
                    Bird Chirp Prominence
                  </label>
                  <span className="font-mono-tabular text-[#E5A93C]">
                    {mix.birdEnabled ? `${Math.round(mix.birdGain * 100)}%` : "Muted"}
                  </span>
                </div>
                <input
                  id="bird-chirp-gain"
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.05}
                  disabled={!mix.birdEnabled}
                  value={mix.birdGain}
                  onChange={(e) =>
                    onChangeMix({ ...mix, birdGain: Number(e.target.value) })
                  }
                  className="w-full studio-range disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={!mix.birdEnabled}
                  onClick={() => onAuditionCue("bird")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.11] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Audition Chirp</span>
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={onPreviewSilenceGap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5A93C]/15 border border-[#E5A93C]/40 text-xs font-medium text-[#E5A93C] hover:bg-[#E5A93C]/25 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Preview 0:31–0:35 Gap</span>
                </button>
              </div>
            </div>

            {/* Mix Sliders */}
            <div className="space-y-4 pt-2 border-t border-white/[0.08]">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#C8C3B8]">Voiceover Level</span>
                  <span className="font-mono-tabular text-[#E5A93C]">
                    {Math.round(mix.voiceGain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={mix.voiceGain}
                  onChange={(e) => onChangeMix({ ...mix, voiceGain: Number(e.target.value) })}
                  className="w-full studio-range"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#C8C3B8]">Heartbeat &amp; Shofar Horn</span>
                  <span className="font-mono-tabular text-[#E5A93C]">
                    {Math.round(mix.sfxGain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={mix.sfxGain}
                  onChange={(e) => onChangeMix({ ...mix, sfxGain: Number(e.target.value) })}
                  className="w-full studio-range"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#C8C3B8]">Cold Wind &amp; Sub-Bass Drone</span>
                  <span className="font-mono-tabular text-[#E5A93C]">
                    {Math.round(mix.droneGain * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={mix.droneGain}
                  onChange={(e) => onChangeMix({ ...mix, droneGain: Number(e.target.value) })}
                  className="w-full studio-range"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#9B978E] max-w-md">
                Need just the mixed audio track (voiceover + silence + bird + horn) for CapCut or
                Premiere? Export a 44.1kHz stereo WAV master.
              </p>
              <button
                type="button"
                disabled={isRenderingWav}
                onClick={onDownloadWav}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.12] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                {isRenderingWav ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileAudio className="w-3.5 h-3.5" />
                )}
                <span>{isRenderingWav ? "Rendering WAV..." : "Download Audio (.wav)"}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "publish" && (
          <div className="space-y-6">
            {/* Pre-Publish Readiness Checklist */}
            <div className="rounded-xl bg-[#07080A] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#F4F2ED]">Pre-Publish Checklist</h3>
                <span className="font-mono-tabular text-xs text-[#9B978E]">
                  {readyVoiceCount === spokenBeats.length
                    ? "All tracks ready"
                    : `${readyVoiceCount}/${spokenBeats.length} voiceovers ready`}
                </span>
              </div>

              <div className="divide-y divide-white/[0.06] text-xs">
                <div className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {readyVoiceCount === spokenBeats.length ? (
                      <Check className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                    )}
                    <span className="text-[#D5D1C8]">
                      Voiceover Narration ({readyVoiceCount}/{spokenBeats.length} spoken scenes)
                    </span>
                  </div>
                  {readyVoiceCount < spokenBeats.length ? (
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={isGeneratingAllTts || isExporting}
                        onClick={onGenerateAllTts}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E5A93C] hover:underline disabled:opacity-50 whitespace-nowrap"
                      >
                        {isGeneratingAllTts && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>
                          {isGeneratingAllTts ? "Generating..." : "Generate Missing Voiceovers"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onTabChange("voiceover")}
                        className="text-xs text-[#A39E93] hover:text-[#F4F2ED] whitespace-nowrap"
                      >
                        Record Mic
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#9B978E] whitespace-nowrap">Included in render</span>
                  )}
                </div>

                <div className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                    <span className="text-[#D5D1C8]">
                      Soundscape · Bird Chirp{" "}
                      {mix.birdEnabled ? `${Math.round(mix.birdGain * 100)}%` : "Muted"} · Horn{" "}
                      {Math.round(mix.sfxGain * 100)}%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTabChange("soundscape")}
                    className="text-xs text-[#A39E93] hover:text-[#F4F2ED] whitespace-nowrap shrink-0"
                  >
                    Adjust Mix
                  </button>
                </div>

                <div className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                    <span className="text-[#D5D1C8]">
                      9:16 Vertical Master ·{" "}
                      {exportResolution === "1080p" ? "1080×1920 HD" : "720×1280 Fast"} · 52s
                    </span>
                  </div>
                  <span className="text-[#9B978E] whitespace-nowrap">
                    Reels · TikTok · Shorts
                  </span>
                </div>
              </div>

              {ttsError && (
                <div className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                  {ttsError}
                </div>
              )}
            </div>

            {/* Video Export Section */}
            <div className="space-y-4 pb-6 border-b border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#F4F2ED] tracking-tight">
                    Render &amp; Download 9:16 Video
                  </h2>
                  <p className="text-sm text-[#9B978E] mt-0.5">
                    Renders the complete 52-second vertical video with your voiceover and soundscape
                    baked in, ready to upload everywhere.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#07080A] border border-white/[0.08] shrink-0">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => onChangeResolution("1080p")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      exportResolution === "1080p"
                        ? "bg-white/15 text-[#F4F2ED]"
                        : "text-[#9B978E] hover:text-[#F4F2ED]"
                    }`}
                  >
                    1080×1920 HD
                  </button>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => onChangeResolution("720p")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      exportResolution === "720p"
                        ? "bg-white/15 text-[#F4F2ED]"
                        : "text-[#9B978E] hover:text-[#F4F2ED]"
                    }`}
                  >
                    720×1280 Fast
                  </button>
                </div>
              </div>

              {exportError && (
                <div className="rounded-lg border border-red-400/30 bg-red-950/30 px-4 py-3 text-xs text-red-200">
                  {exportError}
                </div>
              )}

              {isExporting && exportProgress ? (
                <div className="space-y-2.5 p-4 rounded-xl bg-[#07080A] border border-[#E5A93C]/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F4F2ED] font-medium">
                      Rendering 9:16 video + audio in real time (keep this tab active)...
                    </span>
                    <span className="font-mono-tabular text-[#E5A93C]">
                      {Math.round(exportProgress.progress * 100)}% (
                      {exportProgress.currentSec.toFixed(1)}s / {exportProgress.totalSec}s)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#E5A93C] transition-[width] duration-150"
                      style={{ width: `${Math.round(exportProgress.progress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onCancelExport}
                      className="text-xs text-[#9B978E] hover:text-[#F4F2ED]"
                    >
                      Cancel Render
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onStartExport}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E5A93C] text-[#07080A] text-xs font-semibold hover:bg-[#f0b94f] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Film className="w-4 h-4" />
                      <span>
                        {exportedVideo ? "Re-Render 9:16 Video" : "Render Full Reel Video"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onDownloadCover}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#E5A93C]" />
                      <span>Download Cover (.png)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRenderingWav}
                      onClick={onDownloadWav}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.12] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isRenderingWav ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileAudio className="w-3.5 h-3.5 text-[#E5A93C]" />
                      )}
                      <span>{isRenderingWav ? "Rendering WAV..." : "Download Audio (.wav)"}</span>
                    </button>
                  </div>

                  {exportedVideo && (
                    <div className="rounded-xl bg-[#07080A] border border-[#E5A93C]/35 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#F4F2ED]">
                          Export Ready · {exportedVideo.filename}
                        </span>
                        <span className="font-mono-tabular text-[#E5A93C]">
                          {(exportedVideo.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>

                      <video
                        src={exportedVideo.url}
                        controls
                        playsInline
                        className="w-full max-h-72 rounded-lg bg-black object-contain"
                      />

                      <div className="flex flex-wrap items-center gap-2.5">
                        <a
                          href={exportedVideo.url}
                          download={exportedVideo.filename}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] text-[#07080A] text-xs font-semibold hover:bg-[#f0b94f] transition-colors whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save Video to Device</span>
                        </a>

                        <button
                          type="button"
                          onClick={onShareVideo}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.08] border border-white/15 text-xs font-medium text-[#F4F2ED] hover:bg-white/[0.14] transition-colors whitespace-nowrap shrink-0"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#E5A93C]" />
                          <span>Share Video</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Social Platform Captions & Hashtags */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#F4F2ED]">
                  Platform Captions &amp; Hashtags
                </h3>
                <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#07080A] border border-white/[0.08]">
                  {SOCIAL_EXPORT_COPY.map((platform) => {
                    const active = platform.id === selectedPlatform;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => setSelectedPlatform(platform.id)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? "bg-white/15 text-[#F4F2ED]"
                            : "text-[#9B978E] hover:text-[#F4F2ED]"
                        }`}
                      >
                        {platform.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-[#9B978E]">
                  {activePlatformCopy.recommendedLength}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A39E93]">Cover Title / Hook</span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopy("hook", activePlatformCopy.titleOrHook)
                      }
                      className="inline-flex items-center gap-1 text-xs text-[#E5A93C] hover:underline"
                    >
                      {copiedKey === "hook" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "hook" ? "Copied" : "Copy Hook"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080A] border border-white/[0.08] text-xs text-[#F4F2ED]">
                    {activePlatformCopy.titleOrHook}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A39E93]">Post Caption</span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopy(
                          "caption",
                          `${activePlatformCopy.caption}\n\n${activePlatformCopy.hashtags}`
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-[#E5A93C] hover:underline"
                    >
                      {copiedKey === "caption" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedKey === "caption" ? "Copied" : "Copy Caption + Hashtags"}
                      </span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-[#07080A] border border-white/[0.08] text-xs text-[#D5D1C8] font-sans whitespace-pre-wrap leading-relaxed">
                    {activePlatformCopy.caption}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A39E93]">Hashtags</span>
                    <button
                      type="button"
                      onClick={() => void handleCopy("tags", activePlatformCopy.hashtags)}
                      className="inline-flex items-center gap-1 text-xs text-[#E5A93C] hover:underline"
                    >
                      {copiedKey === "tags" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === "tags" ? "Copied" : "Copy Hashtags"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080A] border border-white/[0.08] text-xs text-[#E5A93C]/90 leading-relaxed">
                    {activePlatformCopy.hashtags}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
