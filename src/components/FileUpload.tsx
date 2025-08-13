"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone, FileRejection } from "react-dropzone";
import { Inbox, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { useCallback } from "react";

export default function FileUpload() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as { path: string; url?: string };
    },
    onSuccess: () => {
      toast.success("File uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        toast.error(rejected[0].errors[0]?.message ?? "File rejected");
        return;
      }
      if (accepted[0]) mutation.mutate(accepted[0]);
    },
    [mutation]
  );

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className="bg-neutral-100 w-full h-full border-dashed border-2 flex flex-col items-center justify-center rounded-xl hover:bg-neutral-100/60 cursor-pointer"
      aria-busy={mutation.isPending}
    >
      <input {...getInputProps()} />
      {mutation.isPending ? (
        <LoaderCircleIcon className="w-10 h-10 animate-spin" />
      ) : (
        <Inbox className="w-10 h-10" />
      )}

      <p className="text-xs text-muted-foreground">
        {mutation.isPending ? "Uploading..." : "Drop a PDF or click to upload"}
      </p>
    </div>
  );
}
