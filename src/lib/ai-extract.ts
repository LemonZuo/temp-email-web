/** `metadata.ai_extract` written by the worker's AI extraction feature. */
export type AiExtract = {
  type: 'auth_code' | 'auth_link' | 'service_link' | 'subscription_link' | 'other_link' | string
  result: string
  result_text?: string
}

export const getAiExtract = (metadata: string | null | undefined): AiExtract | null => {
  if (!metadata) return null
  try {
    const data = JSON.parse(metadata)
    return data?.ai_extract?.result ? data.ai_extract : null
  } catch {
    return null
  }
}
