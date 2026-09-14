"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { Wrapper } from "@/components";

export interface MediaPermissionPromptProps {
  isBlocked: boolean;
  isRequesting?: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export function MediaPermissionPrompt({
  isBlocked,
  isRequesting = false,
  onRetry,
  onBack,
}: MediaPermissionPromptProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4 sm:p-6 text-center select-none overflow-y-auto">
      <h2 className="text-3xl sm:text-4xl  font-medium text-white mb-4 text-center">
        {isBlocked
          ? "Camera and microphone are blocked"
          : "Allow camera and microphone access"}
      </h2>

      <Wrapper
        variant="glass-dark"
        borderGradient="default"
        className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full  text-sm sm:text-base text-white/90 mb-6 max-w-lg flex-wrap sm:flex-nowrap"
      >
        <span>Click</span>
        <Icon
          icon="teenyicons:adjust-horizontal-alt-outline"
          className="text-xl shrink-0 text-[#00e5cc]"
        />
        <span>
          in your address bar and give permissions for camera and microphone
        </span>
      </Wrapper>

      <p className="text-sm sm:text-base  text-white/70 mb-8 text-center max-w-lg leading-relaxed">
        {isBlocked
          ? "Permissions are currently blocked. Enable camera and microphone access in site settings, then click Try Again."
          : "VirtuJudge needs camera and microphone access to record your presentation. Click Allow when prompted."}
      </p>

      <div className="flex items-center gap-4 flex-wrap justify-center">
        <button
          type="button"
          onClick={onRetry}
          disabled={isRequesting}
          className="h-12 w-60 rounded-full  font-bold text-black bg-[#00e5cc] hover:bg-[#00f5db] active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-center"
        >
          <Icon
            icon={isRequesting ? "tabler:loader-2" : "tabler:refresh"}
            className={`text-xl ${isRequesting ? "animate-spin" : ""}`}
          />
          <span>{isRequesting ? "Checking..." : "Try Again"}</span>
        </button>

        <Wrapper
          as="button"
          variant="glass-dark"
          borderGradient="default"
          onClick={onBack}
          className="h-12 w-60 py-0 rounded-full  font-medium text-white/90 hover:brightness-125 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
        >
          <Icon icon="tabler:arrow-left" className="text-xl" />
          <span>Back to Prepare</span>
        </Wrapper>
      </div>
    </div>
  );
}
