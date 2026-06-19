"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { PremiumButton } from "@/components/premium/premium-button";
import { createMockUploadUrl } from "@/lib/lesson-materials";
import { cn } from "@/lib/utils";

export type MockUploadPayload = {
  id: string;
  file: File;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

type MockUploadDropzoneProps = {
  id: string;
  title: string;
  description: string;
  hint: string;
  accept?: string;
  icon: LucideIcon;
  currentLabel?: string | null;
  onUploaded: (payload: MockUploadPayload) => Promise<void> | void;
};

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `upload-${Date.now()}`;
}

export function MockUploadDropzone({
  id,
  title,
  description,
  hint,
  accept,
  icon: Icon,
  currentLabel,
  onUploaded,
}: MockUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedName, setUploadedName] = useState<string | null>(
    currentLabel ?? null,
  );

  useEffect(() => {
    setUploadedName(currentLabel ?? null);
  }, [currentLabel]);

  const runUpload = async (file: File) => {
    setIsUploading(true);
    setProgress(16);

    const payload: MockUploadPayload = {
      id: createLocalId(),
      file,
      name: file.name,
      url: createMockUploadUrl(file.name),
      mimeType: file.type || undefined,
      size: file.size || undefined,
    };

    await new Promise((resolve) => setTimeout(resolve, 180));
    setProgress(48);
    await new Promise((resolve) => setTimeout(resolve, 220));
    setProgress(76);

    await onUploaded(payload);

    await new Promise((resolve) => setTimeout(resolve, 180));
    setProgress(100);
    setUploadedName(file.name);

    await new Promise((resolve) => setTimeout(resolve, 140));
    setIsUploading(false);
    setProgress(0);
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    await runUpload(file);
  };

  return (
    <div
      className={cn(
        "rounded-[2rem] border border-black/8 bg-white/80 p-5 backdrop-blur-xl transition duration-200",
        isDragging
          ? "border-[#3d3bff]/50 bg-[#f6f6ff] shadow-[0_18px_50px_rgba(61,59,255,0.12)]"
          : "hover:border-black/12",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        await handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (event) => {
          await handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-[#eef0ff] text-[#3d3bff]">
            <Icon className="size-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold tracking-tight text-black">
              {title}
            </p>
            <p className="max-w-xl text-sm leading-7 text-black/56">
              {description}
            </p>
          </div>
        </div>

        <PremiumButton
          type="button"
          tone="secondary"
          className="h-11 px-5"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 size-4" />
              Choose file
            </>
          )}
        </PremiumButton>
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-dashed border-black/8 bg-[#fbfbfd] px-5 py-6">
        <p className="text-sm font-medium text-black/70">
          Drag and drop a file here or choose it manually
        </p>
        <p className="mt-2 text-sm leading-7 text-black/46">{hint}</p>

        {isUploading ? (
          <div className="mt-5">
            <div className="h-2 rounded-full bg-black/6">
              <div
                className="h-2 rounded-full bg-[#3d3bff] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[#3d3bff]">
              Mock upload in progress · {progress}%
            </p>
          </div>
        ) : uploadedName ? (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eef7ee] px-4 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-4" />
            {uploadedName}
          </div>
        ) : null}
      </div>
    </div>
  );
}
