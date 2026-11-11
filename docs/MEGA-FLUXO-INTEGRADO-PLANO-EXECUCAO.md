# MEGA SYSTEM — Fluxo integrado ponta a ponta

## Objetivo operacional

Um pedido confirmado no Comercial deve orquestrar as áreas de Estoque, Produção, CNC, Compras, Financeiro, Fiscal e Expedição. Todos os eventos precisam ser persistidos no PostgreSQL, ligados ao pedido original e auditáveis.

## Regras obrigatórias

1. **Comercial**
   - Capturar cliente, contatos, origem, vendedor, itens do catálogo, quantidades, preço negociado, variações/acabamentos, entrega, pagamento, frete, desconto e observações.
   - Separar orçamento de pedido confirmado. Só a confirmação comercial libera o fluxo operacional.
   - Não permitir SKU inativo, quantidade inválida ou preço/condição sem validação de permissão.

2. **Estoque de produto acabado**
   - Na confirmação, calcular disponibilidade por SKU: saldo físico menos reservas ativas.
   - Reservar atomicamente a quantidade disponível, sem ultrapassar saldo.
   - Dividir atendimento em quantidade atendível agora e saldo pendente.
   - Registrar movimentos imutáveis de reserva, liberação, entrada e saída; nunca editar saldo sem movimento de origem.

3. **Produção**
   - Criar ordem somente para o saldo não atendido pelo produto acabado.
   - Vincular ordem, pedido e itens/SKUs; manter quantidade planejada, liberada, concluída, rejeitada e pendente.
   - Controlar etapas, responsáveis, apontamentos e bloqueios por material.
   - Não gerar ordem duplicada em reenvio de evento.

4. **Compras**
   - Explodir a BOM/roteiro do saldo a fabricar, aplicando unidade de medida e fator de perda.
   - Abater estoque disponível de cada componente/insumo e necessidades já alocadas.
   - Criar requisições de compra apenas para faltas, vinculadas à ordem de produção e ao pedido.
   - Recebimento deve gerar movimento de entrada no estoque e atualizar a disponibilidade para produção.

5. **CNC / Usinagem**
   - Cada apontamento deve identificar ordem de produção, SKU/peça, programa/arquivo, quantidade planejada, quantidade boa, refugo, operador e horário.
   - Confirmar quantidade efetivamente usinada; não usar quantidade planejada como quantidade produzida.
   - Cada confirmação gera evento idempotente de entrada de componente usinado no Estoque, com referência única do apontamento.
   - Reenvio do mesmo apontamento não pode duplicar entrada. Correção deve ser estorno + novo apontamento, preservando auditoria.
   - Validar autenticação/autorização em todas as rotas de gravação, edição e exclusão da biblioteca CNC.

6. **Financeiro**
   - Ao confirmar pedido, criar contas a receber conforme condição/parcelas, com valores e vencimentos conciliados ao total.
   - Incluir frete/desconto conforme política contábil; impedir soma de parcelas divergente.
   - Idempotência por pedido + evento de confirmação; cancelamento deve estornar/baixar títulos conforme status, sem apagar histórico.
   - Alimentar previsão de caixa e alertas de vencimento.

7. **Fiscal**
   - Criar solicitação fiscal/fila de emissão com dados do cliente, itens, CFOP/NCM/tributação e endereço fiscal, conforme cadastro e regras aplicáveis.
   - Distinguir claramente rascunho, pendente, transmitida, autorizada, rejeitada e cancelada.
   - Não simular autorização SEFAZ. Emissão real depende de certificado digital, credenciais, ambiente e provedor/integração fiscal configurados.

8. **Expedição / entrega**
   - Liberar expedição somente após produto acabado disponível, conferência e situação fiscal exigida pela operação.
   - Baixar estoque por movimento de saída ligado ao pedido e à expedição.
   - Registrar transportadora, volumes, rastreio, saída e confirmação de entrega.

## Modelo de eventos e consistência

- Usar transações PostgreSQL para confirmação do pedido, reserva e criação das demandas.
- Usar chave de idempotência única por origem/evento (pedido, ordem, apontamento CNC, recebimento, título).
- Registrar histórico de eventos com ator, data/hora, entidade, ação, quantidade anterior/nova e origem.
- Não depender de estado React/localStorage/mock-data para dados operacionais.
- Aplicar controle de concorrência no saldo (transação/lock ou atualização condicional) para impedir overselling.
- Separar componentes usinados, componentes comprados, matéria-prima e produto acabado como tipos de estoque distintos.

## Auditoria de código já realizada na branch de origem

- `POST /api/pedidos` grava pedido como `ORCAMENTO`; não cria reserva, ordem de produção, compra, contas a receber ou solicitação fiscal.
- A análise atual de necessidades é preliminar e usa BOM; 22 de 24 produtos ativos estavam sem BOM na auditoria anterior. Não é possível calcular compras/produção confiavelmente sem completar e validar essas fichas.
- Tela Comercial mantém pipeline em estado local e usa `mock-data`.
- Tela de Compras mantém lista em estado local e usa `mock-data`; criar compra na tela não persiste no banco.
- Tela de Produção contém ordens de demonstração e controles locais; não foi comprovada integração persistente com pedido real.
- Tela de Estoque consulta itens e saldos, mas não implementa a reserva por pedido descrita acima.
- Biblioteca CNC possui frontend em `public/mega-usinagem`; a integração de apontamentos com estoque precisa ser implementada e protegida por autenticação/autorização.
- Fiscal não deve declarar nota autorizada sem retorno real do provedor/SEFAZ.

## Critérios mínimos de aceite antes de produção

1. Pedido com 20 unidades e estoque acabado de 12: reserva 12 e ordem de produção de 8.
2. BOM da ordem: componente A necessário 16, disponível 10; criar compra de 6, sem comprar novamente em reenvio.
3. Receber 6: entrada de estoque única e liberação da ordem quando todos os insumos estiverem disponíveis.
4. CNC aponta 8 peças boas e 1 refugo: estoque recebe somente 8 peças boas, ligado à ordem e ao apontamento.
5. Montagem conclui 8: entrada de produto acabado; total disponível para o pedido passa a 20.
6. Financeiro gera parcelas cuja soma bate com o total comercial; reenvio não duplica títulos.
7. Fiscal recebe fila pendente; status autorizado somente após retorno verificável do provedor.
8. Expedição baixa exatamente 20 unidades e pedido termina entregue.
9. Testes concorrentes e de idempotência comprovam ausência de reserva/baixa duplicada.
10. RLS/autorização, validação de payload, trilha de auditoria e testes de regressão aprovados.

## Bloqueios para liberar produção

- Completar/validar as BOMs e roteiros dos 24 produtos.
- Definir cadastros fiscais (NCM, CFOP, CST/CSOSN, regime tributário, dados do emitente/destinatário) e configurar provedor/certificado.
- Validar regras de papéis/permissões para Comercial, Estoque, Produção, CNC, Compras, Financeiro e Fiscal.
- Implementar as APIs e interfaces persistentes, migrar o banco de forma compatível e executar testes automatizados e smoke tests em ambiente seguro.
