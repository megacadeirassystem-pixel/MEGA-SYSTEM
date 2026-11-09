/**
 * Regras puras do planejamento CNC.
 *
 * Não acessa banco nem movimenta estoque: o serviço transacional deve aplicar
 * este resultado sob lock/transaction e persistir a chave idempotente.
 */
export type CncPlanInput = {
  orderedQuantity: number;
  piecesPerSheet: number;
  secondsPerSheet: number;
  freeStockQuantity: number;
};

export type CncPlan = {
  orderedQuantity: number;
  piecesPerSheet: number;
  secondsPerSheet: number;
  reservedStockQuantity: number;
  remainingDemand: number;
  scheduledSheets: number;
  plannedProduction: number;
  excessToStock: number;
  estimatedSeconds: number;
};

function assertInteger(name: string, value: number, min = 0): void {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(`${name} deve ser um inteiro seguro maior ou igual a ${min}.`);
  }
}

export function calculateCncPlan(input: CncPlanInput): CncPlan {
  assertInteger("orderedQuantity", input.orderedQuantity, 1);
  assertInteger("piecesPerSheet", input.piecesPerSheet, 1);
  assertInteger("secondsPerSheet", input.secondsPerSheet, 0);
  assertInteger("freeStockQuantity", input.freeStockQuantity, 0);

  // Só reserva unidades em lotes completos de uma chapa. Sobras menores
  // permanecem livres para não desmontar uma chapa virtualmente incompleta.
  const fullSheetStock = Math.floor(input.freeStockQuantity / input.piecesPerSheet) * input.piecesPerSheet;
  const reservedStockQuantity = Math.min(input.orderedQuantity, fullSheetStock);
  const remainingDemand = input.orderedQuantity - reservedStockQuantity;
  const scheduledSheets = Math.ceil(remainingDemand / input.piecesPerSheet);
  const plannedProduction = scheduledSheets * input.piecesPerSheet;
  const excessToStock = plannedProduction - remainingDemand;

  return {
    orderedQuantity: input.orderedQuantity,
    piecesPerSheet: input.piecesPerSheet,
    secondsPerSheet: input.secondsPerSheet,
    reservedStockQuantity,
    remainingDemand,
    scheduledSheets,
    plannedProduction,
    excessToStock,
    estimatedSeconds: scheduledSheets * input.secondsPerSheet,
  };
}

export type ConfirmationDelta = {
  previousConfirmedSheets: number;
  requestedTotalSheets: number;
  newSheetsToConfirm: number;
  isNoop: boolean;
};

export function calculateConfirmationDelta(
  previousConfirmedSheets: number,
  requestedTotalSheets: number,
  scheduledSheets: number,
): ConfirmationDelta {
  assertInteger("previousConfirmedSheets", previousConfirmedSheets, 0);
  assertInteger("requestedTotalSheets", requestedTotalSheets, 0);
  assertInteger("scheduledSheets", scheduledSheets, 0);

  if (previousConfirmedSheets > scheduledSheets || requestedTotalSheets > scheduledSheets) {
    throw new Error("Quantidade confirmada não pode exceder o planejamento.");
  }
  if (requestedTotalSheets < previousConfirmedSheets) {
    throw new Error("Redução exige fluxo de correção auditável; não é permitido pelo OK normal.");
  }

  const newSheetsToConfirm = requestedTotalSheets - previousConfirmedSheets;
  return {
    previousConfirmedSheets,
    requestedTotalSheets,
    newSheetsToConfirm,
    isNoop: newSheetsToConfirm === 0,
  };
}

/**
 * Identificador estável do evento físico. O banco deve impor UNIQUE(cycleId)
 * e executar ledger + estoque + alocação na mesma transação.
 */
export function normalizeCycleId(cycleId: string): string {
  const normalized = cycleId.trim();
  if (!normalized || normalized.length > 128) {
    throw new Error("cycleId inválido.");
  }
  return normalized;
}
