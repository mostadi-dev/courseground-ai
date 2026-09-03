"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AssistantSource = {
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

type AssistantResult = {
  answer: string;
  sources: AssistantSource[];
};

type InstructorAssistantProps = {
  courseId: string;
};

const EXAMPLE_PROMPTS = [
  "Create three formative discussion questions. Do not provide answers.",
  "Summarize the major concepts for an instructor lesson plan.",
  "Suggest a classroom activity based on the course material.",
];

export default function InstructorAssistant({
  courseId,
}: InstructorAssistantProps) {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [result, setResult] =
    useState<AssistantResult | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanedPrompt = prompt.trim();

    if (cleanedPrompt.length < 5) {
      setError(
        "Enter an instructor request containing at least 5 characters.",
      );
      return;
    }

    setError("");
    setResult(null);
    setIsGenerating(true);

    try {
      const response = await fetch(
        `/api/courses/${courseId}/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: cleanedPrompt,
          }),
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail ??
            "The instructor assistant could not complete the request.",
        );
        return;
      }

      setResult(data);
    } catch {
      setError(
        "Unable to connect to the instructor assistant.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function selectExamplePrompt(example: string) {
    setPrompt(example);
    setError("");
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Grounded AI
        </p>

        <h2 className="mt-2 text-2xl font-bold text-white">
          Instructor assistant
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Generate instructor-reviewed learning activities from
          processed course documents. Responses include the source
          passages used by the model.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => selectExamplePrompt(example)}
            disabled={isGenerating}
            className="rounded-full border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <label
          htmlFor="instructor-prompt"
          className="text-sm font-medium text-slate-200"
        >
          Instructor request
        </label>

        <textarea
          id="instructor-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isGenerating}
          maxLength={2000}
          rows={5}
          placeholder="For example: Create three formative discussion questions without providing student answers."
          className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Instructor use only. Review AI-generated content before
            using it.
          </p>

          <p className="text-xs text-slate-500">
            {prompt.length}/2000
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            isGenerating || prompt.trim().length < 5
          }
          className="mt-5 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isGenerating
            ? "Retrieving sources and generating…"
            : "Generate instructor material"}
        </button>
      </form>

      {result ? (
        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-cyan-400/20 bg-slate-950 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h3 className="font-semibold text-white">
                Generated material
              </h3>

              <span className="w-fit rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Instructor review required
              </span>
            </div>

            <div className="mt-5 text-sm leading-7 text-slate-300">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 mt-6 text-2xl font-bold text-white first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-6 text-xl font-bold text-white first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-3 mt-5 text-lg font-semibold text-cyan-300 first:mt-0">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-7 last:mb-0">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 list-disc space-y-2 pl-6">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 list-decimal space-y-2 pl-6">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="pl-1">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 border-l-4 border-cyan-400 pl-4 text-slate-400">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-6 border-slate-800" />
                  ),
                }}
              >
                {result.answer}
              </ReactMarkdown>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold text-white">
                Supporting sources
              </h3>

              <span className="text-xs text-slate-500">
                {result.sources.length} retrieved
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {result.sources.map((source) => (
                <details
                  key={
                    `${source.document_id}-${source.chunk_index}`
                  }
                  className="rounded-xl border border-slate-800 bg-slate-950"
                >
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
                    {source.filename} · similarity{" "}
                    {(source.similarity * 100).toFixed(1)}%
                  </summary>

                  <div className="border-t border-slate-800 px-4 py-4">
                    <p className="text-xs text-slate-500">
                      Chunk {source.chunk_index + 1}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {source.content}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}