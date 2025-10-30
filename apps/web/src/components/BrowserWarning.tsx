import React, { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { isChromeOrChromium, getBrowserName } from "../utils/browserDetection";

interface CapabilityStatus {
  speechRecognition: boolean;
  translation: boolean;
  promptAPI: boolean;
  speechSynthesis: boolean;
}

export const BrowserWarning: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [capabilities, setCapabilities] = useState<CapabilityStatus>({
    speechRecognition: false,
    translation: false,
    promptAPI: false,
    speechSynthesis: false,
  });
  const [warningLevel, setWarningLevel] = useState<"error" | "warning">(
    "warning"
  );

  useEffect(() => {
    setIsClient(true);

    // Check all capabilities
    const hasTranslator: boolean =
      typeof self !== "undefined" &&
      (self as unknown as { Translator?: unknown }).Translator != null;
    const caps: CapabilityStatus = {
      speechRecognition:
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
      // New WICG API exposes global Translator
      translation: hasTranslator,
      // Prompt API is no longer used for translation but keep check for diagnostics
      promptAPI: !!(window as Window & { ai?: { languageModel?: unknown } }).ai
        ?.languageModel,
      speechSynthesis: "speechSynthesis" in window,
    };

    setCapabilities(caps);

    // Determine if we should show warning
    const isChrome = isChromeOrChromium();
    const hasChromeAI = caps.translation || caps.promptAPI;
    const hasSpeechRecognition = caps.speechRecognition;

    // Show error if not Chrome/Chromium at all
    if (!isChrome) {
      setWarningLevel("error");
      setIsVisible(true);
    }
    // Show warning if Chrome but missing AI features
    else if (isChrome && !hasChromeAI) {
      setWarningLevel("warning");
      setIsVisible(true);
    }
    // Show warning if missing speech recognition
    else if (isChrome && !hasSpeechRecognition) {
      setWarningLevel("warning");
      setIsVisible(true);
    }
  }, []);

  if (!isClient || !isVisible) return null;

  const browserName = getBrowserName();
  const missingFeatures: string[] = [];

  if (!capabilities.speechRecognition)
    missingFeatures.push("Speech Recognition");
  if (!capabilities.translation && !capabilities.promptAPI)
    missingFeatures.push("Translation API");
  if (!capabilities.speechSynthesis) missingFeatures.push("Text-to-Speech");

  const bgColor =
    warningLevel === "error"
      ? "bg-red-50 border-red-300"
      : "bg-amber-50 border-amber-300";
  const iconColor =
    warningLevel === "error" ? "text-red-600" : "text-amber-600";
  const titleColor =
    warningLevel === "error" ? "text-red-800" : "text-amber-800";
  const textColor =
    warningLevel === "error" ? "text-red-700" : "text-amber-700";
  const buttonColor =
    warningLevel === "error"
      ? "text-red-600 hover:text-red-800"
      : "text-amber-600 hover:text-amber-800";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 ${bgColor} border-b-2 px-4 py-3 md:px-6 md:py-4 shadow-md`}
    >
      <div className="max-w-6xl mx-auto flex items-start md:items-center gap-3 md:gap-4">
        <AlertCircle
          size={20}
          className={`${iconColor} flex-shrink-0 mt-0.5 md:mt-0`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm md:text-base ${titleColor} font-semibold`}>
            {warningLevel === "error"
              ? "Incompatible Browser Detected"
              : "Browser Configuration Needed"}
          </p>
          <p className={`text-xs md:text-sm ${textColor} mt-1`}>
            {warningLevel === "error" ? (
              <>
                BabelGopher requires Chrome Canary or Edge Dev. You&apos;re
                using {browserName}.{" "}
                <a
                  href="https://www.google.com/chrome/canary/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:opacity-80"
                >
                  Download Chrome Canary
                </a>
              </>
            ) : (
              <>
                Missing: {missingFeatures.join(", ")}.{" "}
                <a
                  href="/docs/CHROME_AI_SETUP.md"
                  className="underline font-semibold hover:opacity-80"
                >
                  Enable Chrome AI features
                </a>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className={`flex-shrink-0 ${buttonColor} transition-colors p-1`}
          aria-label="Close browser warning"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};
