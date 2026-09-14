// Mirrors the checks in UserServiceImpl#userRegister / #userLogin so the form
// can fail fast before hitting the network.
export function validateAccount(value: string): string | undefined {
  if (!value) return "请输入账号"
  if (value.length < 4) return "账号至少 4 个字符"
  return undefined
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "请输入密码"
  if (value.length < 8) return "密码至少 8 个字符"
  return undefined
}
