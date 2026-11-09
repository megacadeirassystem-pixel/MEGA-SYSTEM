# Integração da Usinagem

A rota de Produção incorpora a cópia do módulo do Felipe em `public/mega-usinagem`. A versão original continua disponível no computador do operador. As importações ficam no armazenamento do navegador por endereço, então leve os desenhos existentes para o ambiente integrado com **Baixar cópia JSON** e **Abrir cópia JSON** na biblioteca. Ao abrir cada cópia, salve a importação para disponibilizá-la no Nesting.

No Nesting, baixe o TAP da chapa. O nome vem do desenho salvo e o corte usa a profundidade Z salva, em uma passada por trecho. A exportação registra no navegador a quantidade planejada e o tempo estimado, incluindo as passadas. O OK registra esses dados no ciclo central. A confirmação representa uma chapa fisicamente concluída, com todas as peças do plano produzidas. O operador confere o resultado e dá OK. Para refugo, chapa incompleta ou resultado diferente do plano, a equipe precisa reconciliar a produção antes de confirmar. O sistema registra cada confirmação com identificador próprio, usuário, dimensões, revisão das importações e movimentos. A confirmação congela o plano aberto e as outras chapas desse plano ainda podem ser confirmadas. Reabra o módulo para um novo plano. Se o envio falhar, reenvie a confirmação pendente no mesmo navegador para reutilizar seu identificador.

## Configuração do ambiente de validação

- Use um banco e usuários Supabase de teste. Defina as variáveis de conexão existentes para esse ambiente.
- Em `USINAGEM_OPERADORES`, configure os IDs reais autorizados do Supabase Auth separados por vírgula. O operador entra com uma conta existente.
- Em `USINAGEM_MAPEAMENTO`, configure um objeto JSON com `chapaSku`. Para chapas de um único SKU, coloque o SKU no nome do TAP. Para chapas mistas, use um nome de TAP sem SKU e identifique cada desenho pelo próprio SKU, por exemplo `ASSENTO BELÉM (USI-ASS-BEL)`. A quantidade por cópia é o número de contornos externos válidos com operação Macho. O saldo das peças produzidas usa unidade `un`.
- A baixa usa o SKU de matéria-prima configurado. Para unidade `un`, baixa uma chapa. Para `m2` ou `m²`, baixa a área bruta informada no plano, arredondada para três casas decimais. O saldo reservado é preservado. Confira esses critérios com o responsável pelo estoque.

## Revisão para produção

1. Revise os SKUs e rendimentos por desenho com os cadastros existentes e confira o saldo disponível da chapa.
2. Valide a integração em homologação com as importações reais, uma confirmação de ponta a ponta e um reenvio do mesmo ciclo. Confira o operador e os movimentos no banco de homologação.
3. Apresente para aprovação o SQL em `prisma/sql/usinagem-confirmacao.sql` e o plano de publicação. A alteração acrescenta um tipo de movimento, uma tabela de auditoria e um vínculo opcional no livro de estoque. Confira os papéis e a política de acesso do banco de destino antes da execução. A inclusão do valor do enum fica fora da transação das tabelas.
4. Depois da aprovação, faça o backup, aplique a mudança de schema, publique a branch revisada e habilite os operadores e o mapeamento. Se for preciso interromper a integração, retire a autorização dos operadores. Preserve os ciclos e movimentos já gravados para conciliação.
