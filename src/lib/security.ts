export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (prompt.length > 500) {
    return { valid: false, error: 'Prompt too long (max 500 characters)' };
  }

  const suspiciousPatterns = [
    /ignore.*previous.*instructions/i,
    /system.*prompt/i,
    /jailbreak/i,
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Invalid prompt content detected' };
    }
  }

  return { valid: true };
}

export function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 500);
}
