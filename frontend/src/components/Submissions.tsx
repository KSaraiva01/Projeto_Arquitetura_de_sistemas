"use client";

import { CheckCircle2, ExternalLink, FileText, Link2, MessageSquare, RotateCcw } from "lucide-react";
import { api, describeError } from "@/lib/api";
import type { ApiAttachment, ApiSubmission, ApiTaskComment } from "@/lib/api-types";
import { formatDateTime, formatSize } from "@/lib/format";

/**
 * Um anexo da entrega: arquivo (download autenticado — RNF-04) ou link
 * externo, que só vira clicável se for http(s).
 */
export function AttachmentItem({ attachment, onError }: { attachment: ApiAttachment; onError: (message: string) => void }) {
  async function download() {
    try {
      await api.downloadAttachment(attachment.url, attachment.name);
    } catch (err) {
      onError(describeError(err, "Não foi possível baixar o arquivo."));
    }
  }

  if (attachment.type === "FILE") {
    return (
      <button
        type="button"
        onClick={() => void download()}
        className="inline-flex max-w-full items-center gap-2 text-left text-sm text-foreground hover:text-primary"
      >
        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="truncate">{attachment.name}</span>
        <span className="shrink-0 text-xs text-muted-light">{formatSize(attachment.size)}</span>
      </button>
    );
  }

  if (/^https?:\/\//i.test(attachment.url)) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-2 text-sm text-primary hover:underline"
      >
        <Link2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.name}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <Link2 className="h-4 w-4" /> {attachment.name}
    </span>
  );
}

/** RF-16 — versões da entrega, da mais nova para a mais antiga, com os anexos de cada uma. */
export function SubmissionVersions({
  submissions,
  onError,
}: {
  submissions: ApiSubmission[];
  onError: (message: string) => void;
}) {
  const versions = [...submissions].sort((a, b) => b.version - a.version);

  if (versions.length === 0) {
    return <p className="text-xs text-muted-light">Nenhuma entrega enviada ainda.</p>;
  }

  return (
    <div>
      {versions.map((submission, index) => (
        <div key={submission.id} className="border-b border-divider py-3 first:pt-0 last:border-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 font-medium text-foreground">
              Versão {submission.version}
              {index === 0 && versions.length > 1 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">atual</span>
              )}
            </span>
            <span className="text-muted-light">
              {formatDateTime(submission.submittedAt)}
              {submission.submittedBy && ` · ${submission.submittedBy.name}`}
            </span>
          </div>
          {submission.note && <p className="mt-1 text-xs text-muted">“{submission.note}”</p>}
          <ul className="mt-2 space-y-1.5">
            {submission.attachments.map((attachment) => (
              <li key={attachment.id} className="min-w-0">
                <AttachmentItem attachment={attachment} onError={onError} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** RF-15 — o retorno do mentor (aprovação ou ajustes) e os comentários livres, em ordem. */
export function TaskComments({ comments }: { comments: ApiTaskComment[] }) {
  if (comments.length === 0) {
    return <p className="text-xs text-muted-light">Nenhum comentário ainda.</p>;
  }

  return (
    <ol className="space-y-3">
      {comments.map((comment) => {
        const approved = comment.decision === "APPROVED";
        const rejected = comment.decision === "REJECTED";
        return (
          <li
            key={comment.id}
            className={`rounded-lg border px-3 py-2 ${
              approved
                ? "border-green-500/25 bg-green-500/5"
                : rejected
                  ? "border-orange-500/25 bg-orange-500/5"
                  : "border-card-border"
            }`}
          >
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-light">
              {approved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : rejected ? (
                <RotateCcw className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              <span className="font-medium text-foreground">{comment.author?.name ?? "Usuário removido"}</span>
              {approved && <span className="text-success">aprovou</span>}
              {rejected && <span className="text-orange-600 dark:text-orange-400">pediu ajustes</span>}
              {comment.submissionVersion !== null && <span>· versão {comment.submissionVersion}</span>}
              <span>· {formatDateTime(comment.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{comment.content}</p>
          </li>
        );
      })}
    </ol>
  );
}
