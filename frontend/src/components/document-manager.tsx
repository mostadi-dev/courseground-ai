"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

type Document = {
  id: string;
  course_id: string;
  uploaded_by: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  status: string;
  created_at: string;
};

type DocumentManagerProps = {
  courseId: string;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} bytes`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentManager({
  courseId,
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch(
          `/api/courses/${courseId}/documents`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.detail ?? "Unable to load course documents",
          );
          return;
        }

        setDocuments(data);
      } catch {
        setError("Unable to connect to the document service");
      } finally {
        setIsLoading(false);
      }
    }

    loadDocuments();
  }, [courseId]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setError("");
    setSuccess("");

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maximumSize = 10 * 1024 * 1024;

    if (file.size > maximumSize) {
      setSelectedFile(null);
      setError("The selected file must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedFile) {
      setError("Choose a document before uploading.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `/api/courses/${courseId}/documents`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail ?? "Document upload failed");
        return;
      }

      setDocuments((currentDocuments) => [
        data,
        ...currentDocuments,
      ]);

      setSelectedFile(null);
      setSuccess(
        `${data.original_filename} was uploaded successfully.`,
      );

      const fileInput = document.getElementById(
        "course-document",
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch {
      setError("Unable to connect to the upload service");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
                Learning materials
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Course documents
              </h2>
            </div>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              {documents.length}{" "}
              {documents.length === 1
                ? "document"
                : "documents"}
            </span>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <p className="text-sm text-slate-400">
                Loading documents…
              </p>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <p className="font-medium text-slate-300">
                  No documents uploaded
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Use the upload form to add the first learning
                  material.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((courseDocument) => (
                  <article
                    key={courseDocument.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200">
                        {courseDocument.original_filename}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(
                          courseDocument.size_bytes,
                        )}
                        {" • "}
                        {courseDocument.content_type ??
                          "Unknown file type"}
                        {" • "}
                        {new Date(
                          courseDocument.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
                      {courseDocument.status}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Upload
        </p>

        <h2 className="mt-2 text-xl font-bold">
          Add learning material
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Upload course notes for future processing by the
          responsible AI pipeline.
        </p>

        <form
          onSubmit={handleUpload}
          className="mt-6 space-y-4"
        >
          <div>
            <label
              htmlFor="course-document"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Course document
            </label>

            <input
              id="course-document"
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={handleFileChange}
              className="block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-400 file:mr-4 file:border-0 file:bg-cyan-400 file:px-4 file:py-3 file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
            />
          </div>

          {selectedFile && (
            <p className="text-xs text-slate-400">
              Selected: {selectedFile.name} (
              {formatFileSize(selectedFile.size)})
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isUploading
              ? "Uploading…"
              : "Upload document"}
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Maximum file size: 10 MB.
        </p>
      </aside>
    </section>
  );
}