enum Type {
  "code",
  "document"
}

type Options = {
  autoComplete: boolean
  externalCopyPaste: boolean
  internalCopyPaste: boolean
  analytics: boolean
}

export type Assignment = {
  question: string
  type: Type
  startDateTime: string
  endDateTime: string
  options?: Options
}