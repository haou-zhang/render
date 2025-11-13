const TEMPLATE_PATTERN = /^[a-z0-9_-]+$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9._-]{8,}$/;

export function assertTemplateName(name: string) {
  if (!TEMPLATE_PATTERN.test(name)) {
    throw new Error('模板名称包含非法字符');
  }
}

export function assertToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Token 格式不正确');
  }
}

export function redactToken(token: string) {
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}
