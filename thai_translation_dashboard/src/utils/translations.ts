function format(message: string, replace: Record<number, string>) {
  return message.replace(/{(\d+)}/g, function (match, number) {
    return typeof replace[number] !== 'undefined' ? replace[number] : match
  })
}

function translate(
  message: string,
  replace?: Record<number, string>,
  context: string | null = null,
): string {
  // @ts-ignore
  const translatedMessages = window?.frappe?.boot?.__messages || {}

  let translatedMessage = ''

  if (context) {
    const key = `${message}:${context}`
    if (translatedMessages[key]) {
      translatedMessage = translatedMessages[key]
    }
  }

  if (!translatedMessage) {
    translatedMessage = translatedMessages[message] || message
  }

  const hasPlaceholders = /{\d+}/.test(message)
  if (!hasPlaceholders) {
    return translatedMessage
  }

  return format(translatedMessage, replace || {})
}

export const __ = translate
