export function podeConfirmarUsinagem(userId: string) {
  return process.env.USINAGEM_OPERADORES?.split(",").some(id => id.trim() === userId) ?? false;
}
