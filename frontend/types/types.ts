enum Type {
  code,
  document
}

export type Assignment = {
  question: string
  type: Type
  startDateTime: string
  endDateTime: string
  options?: string[]
}